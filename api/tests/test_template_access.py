import hashlib
import hmac
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch
from urllib.parse import quote, urlencode

from fastapi.testclient import TestClient

from app import db
from app.main import app


def signed_headers(user_id, first_name="Тест", username=""):
    pairs = {"auth_date": "1790672400", "user": json.dumps({"id": user_id, "first_name": first_name,
                                                         "username": username}, ensure_ascii=False)}
    check = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret = hmac.new(b"WebAppData", b"test-token", hashlib.sha256).digest()
    pairs["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return {"X-Telegram-Init-Data": urlencode(pairs, quote_via=quote)}


class AccessTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        for setting in (
            patch.object(db, "DB_PATH", Path(self.temp.name) / "test.db"),
            patch.dict("os.environ", {"SAMOLET_TEMPLATE_USER_ID": "", "DZADMIN_PASSWORD": "long-admin-password",
                                    "DZADMIN_SESSION_SECRET": "a-very-long-and-independent-test-secret-123"}),
            patch("app.auth.BOT_TOKEN", "test-token"),
            patch("app.auth.ALLOW_DEV_NO_AUTH", False),
        ):
            setting.start()
            self.addCleanup(setting.stop)
        db.init()
        self.client = TestClient(app)

    def grant(self, user_id, *templates):
        db.add_user(user_id)
        db.set_service_access(user_id, True)
        for template in templates:
            db.set_template_access(user_id, template, True)

    def test_new_user_is_visible_but_denied_until_granted(self):
        response = self.client.get("/api/me", headers=signed_headers(12345))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["service_access"])
        self.assertEqual(db.list_users()[0]["id"], 12345)
        self.assertEqual(self.client.get("/api/catalog", headers=signed_headers(12345)).status_code, 403)
        self.grant(12345, "samolet")
        self.assertEqual(self.client.get("/api/catalog", headers=signed_headers(12345)).json()["templates"], ["samolet"])

    def test_template_grants_check_save_and_render(self):
        self.grant(12345, "object")
        project = {"id": "p-test", "title": "Test", "scenario": "samolet", "layout": "samolet",
                   "template_id": "samolet", "at": 1, "data": {}}
        self.assertEqual(self.client.post("/api/projects", headers=signed_headers(12345), json=project).status_code, 403)
        with patch("app.main.render_png", new_callable=AsyncMock) as render:
            self.assertEqual(self.client.post("/api/render", headers=signed_headers(12345), json={
                "template_id": "samolet", "layout": "samolet", "data": {}}).status_code, 403)
            render.assert_not_awaited()
        self.assertEqual(self.client.post("/api/render", headers=signed_headers(12345), json={
            "template_id": "object", "layout": "samolet", "data": {}}).status_code, 400)
        db.set_template_access(12345, "samolet", True)
        self.assertEqual(self.client.post("/api/projects", headers=signed_headers(12345), json=project).status_code, 200)
        self.assertEqual(len(self.client.get("/api/projects", headers=signed_headers(12345)).json()), 1)
        db.set_template_access(12345, "samolet", False)
        self.assertEqual(self.client.get("/api/projects", headers=signed_headers(12345)).json(), [])

    def test_service_revoke_blocks_every_endpoint(self):
        self.grant(12345, "samolet")
        db.set_service_access(12345, False)
        for path in ("/api/catalog", "/api/projects", "/api/templates/samolet/fonts/400"):
            self.assertEqual(self.client.get(path, headers=signed_headers(12345)).status_code, 403)
        self.assertFalse(self.client.get("/api/me", headers=signed_headers(12345)).json()["service_access"])

    def test_font_and_render_for_granted_owner(self):
        self.grant(12345, "samolet")
        font = Path(self.temp.name) / "font.woff2"
        font.write_bytes(b"font-test")
        with patch("app.main.font_path", return_value=font):
            response = self.client.get("/api/templates/samolet/fonts/400", headers=signed_headers(12345))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, b"font-test")
            with patch("app.main.render_png", new_callable=AsyncMock, return_value="dznow_test.png") as render:
                result = self.client.post("/api/render", headers=signed_headers(12345), json={
                    "template_id": "samolet", "layout": "samolet", "data": {}})
                self.assertEqual(result.status_code, 200)
                self.assertEqual(render.await_args.args[0]["fonts"]["400"], "Zm9udC10ZXN0")

    def test_second_samolet_template_has_independent_grant_and_font_access(self):
        self.grant(12345, "samolet_context")
        headers = signed_headers(12345)
        self.assertEqual(self.client.get("/api/catalog", headers=headers).json()["templates"], ["samolet_context"])
        font = Path(self.temp.name) / "font.woff2"
        font.write_bytes(b"font-test")
        with patch("app.main.font_path", return_value=font):
            self.assertEqual(self.client.get("/api/templates/samolet/fonts/400", headers=headers).status_code, 200)
            with patch("app.main.render_png", new_callable=AsyncMock, return_value="dznow_test.png") as render:
                response = self.client.post("/api/render", headers=headers, json={
                    "template_id": "samolet_context", "layout": "samolet_context", "data": {}})
                self.assertEqual(response.status_code, 200)
                self.assertIn("400", render.await_args.args[0]["fonts"])
        self.assertEqual(self.client.post("/api/render", headers=headers, json={
            "template_id": "samolet", "layout": "samolet", "data": {}}).status_code, 403)

    def test_feature_template_requires_grant_image_and_circe(self):
        self.grant(12345, "object")
        headers = signed_headers(12345)
        self.assertNotIn("feature", self.client.get("/api/catalog", headers=headers).json()["templates"])
        self.assertEqual(self.client.get("/api/templates/feature/fonts/400", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/api/render", headers=headers, json={
            "template_id": "feature", "layout": "feature", "data": {"bgImage": "/files/u_test.webp"}}).status_code, 403)
        db.set_template_access(12345, "feature", True)
        self.assertIn("feature", self.client.get("/api/catalog", headers=headers).json()["templates"])
        self.assertEqual(self.client.post("/api/render", headers=headers, json={
            "template_id": "feature", "layout": "feature", "data": {}}).status_code, 422)
        self.assertEqual(self.client.post("/api/render", headers=headers, json={
            "template_id": "feature", "layout": "feature",
            "data": {"bgImage": "/files/u_test.webp"}}).status_code, 422)
        font = Path(self.temp.name) / "circe.woff2"
        font.write_bytes(b"circe-test")
        with patch("app.main.circe_font_path", return_value=font), patch(
            "app.main.render_png", new_callable=AsyncMock, return_value="dznow_feature.png"
        ) as render:
            response = self.client.post("/api/render", headers=headers, json={
                "template_id": "feature", "layout": "feature",
                "data": {"bgImage": "/files/u_test.webp", "headline": "Потоп", "rubric": "Фича"}})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(render.await_args.args[0]["fontFamily"], "Circe")
            self.assertEqual(render.await_args.args[0]["fonts"], {"400": "Y2lyY2UtdGVzdA==", "700": "Y2lyY2UtdGVzdA=="})
        with patch("app.main.circe_font_path", return_value=font):
            self.assertEqual(self.client.get("/api/templates/feature/fonts/700", headers=headers).content, b"circe-test")

    def test_signed_identity_cannot_be_changed(self):
        self.grant(12345, "samolet")
        headers = signed_headers(54321)
        headers["X-Telegram-Init-Data"] = headers["X-Telegram-Init-Data"].replace("54321", "12345")
        self.assertEqual(self.client.get("/api/catalog", headers=headers).status_code, 401)

    def test_signed_telegram_profile_appears_in_admin_list(self):
        self.client.get("/api/me", headers=signed_headers(12345, "Анна", "anna_test"))
        user = db.list_users()[0]
        self.assertEqual((user["name"], user["username"]), ("Анна", "anna_test"))

    def test_existing_user_records_gain_separate_note_without_losing_access(self):
        self.grant(12345, "samolet")
        with db.conn() as connection:
            connection.execute("ALTER TABLE users DROP COLUMN note")
        db.init()
        user = db.list_users()[0]
        self.assertEqual(user["note"], "")
        self.assertTrue(user["service_access"])
        self.assertEqual(user["templates"], ["samolet"])

    def test_admin_login_add_and_toggle(self):
        self.assertEqual(self.client.get("/dzadmin/api/users").status_code, 401)
        self.assertEqual(self.client.post("/dzadmin/api/login", json={"password": "wrong"}).status_code, 401)
        self.assertEqual(self.client.post("/dzadmin/api/login", json={"password": "long-admin-password"}).status_code, 200)
        csrf = self.client.get("/dzadmin/api/session").json()["csrf"]
        self.assertIn("feature", [item["id"] for item in self.client.get("/dzadmin/api/users").json()["templates"]])
        self.assertEqual(self.client.post("/dzadmin/api/users", json={"id": 12345}).status_code, 403)
        headers = {"X-Admin-CSRF": csrf, "Origin": "http://testserver"}
        with patch("app.admin.lookup", return_value=("Анна", "anna_test")):
            added = self.client.post("/dzadmin/api/users", json={"id": 12345, "name": "Мой клиент"}, headers=headers)
        self.assertEqual(added.status_code, 200)
        self.assertTrue(added.json()["profile_found"])
        self.assertEqual(self.client.put("/dzadmin/api/users/12345/service", json={"enabled": True}, headers=headers).status_code, 200)
        self.assertEqual(self.client.put("/dzadmin/api/users/12345/templates/samolet", json={"enabled": True}, headers=headers).status_code, 200)
        users = self.client.get("/dzadmin/api/users").json()["users"]
        self.assertEqual(users[0]["templates"], ["samolet"])
        self.assertTrue(users[0]["service_access"])
        self.assertEqual((users[0]["note"], users[0]["name"], users[0]["username"]),
                         ("Мой клиент", "Анна", "anna_test"))
        with patch("app.admin.lookup", return_value=("Анна Новая", "anna_new")):
            self.assertEqual(self.client.post("/dzadmin/api/users/12345/lookup", headers=headers).status_code, 200)
        refreshed = self.client.get("/dzadmin/api/users").json()["users"][0]
        self.assertEqual((refreshed["name"], refreshed["username"], refreshed["note"]),
                         ("Анна Новая", "anna_new", "Мой клиент"))
        with patch("app.admin.lookup", return_value=None):
            self.assertEqual(self.client.post("/dzadmin/api/users/12345/lookup", headers=headers).status_code, 404)
        self.assertEqual(self.client.put("/dzadmin/api/users/12345/service", json={"enabled": False},
                                         headers={**headers, "Origin": "https://evil.example"}).status_code, 403)
        self.assertEqual(self.client.post("/dzadmin/api/logout", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/dzadmin/api/users").status_code, 401)

    def test_admin_page_is_served(self):
        result = self.client.get("/dzadmin")
        self.assertEqual(result.status_code, 200)
        self.assertIn("Админка", result.text)
        self.assertIn("frame-ancestors 'none'", result.headers["content-security-policy"])

    def test_admin_layout_applies_to_catalog_and_render(self):
        self.grant(12345, "samolet_context")
        self.assertEqual(self.client.get("/dzadmin/api/template-layout").status_code, 401)
        self.assertEqual(self.client.get("/dzadmin/api/fonts/400").status_code, 401)
        self.assertEqual(self.client.put("/dzadmin/api/template-layout", json={"offsets": {}}).status_code, 401)
        self.client.post("/dzadmin/api/login", json={"password": "long-admin-password"})
        csrf = self.client.get("/dzadmin/api/session").json()["csrf"]
        font = Path(self.temp.name) / "font.woff2"
        font.write_bytes(b"font-test")
        with patch("app.admin.font_path", return_value=font):
            self.assertEqual(self.client.get("/dzadmin/api/fonts/400").content, b"font-test")
        headers = {"X-Admin-CSRF": csrf, "Origin": "http://testserver"}
        # A request outside the safe area is clamped before persistence.
        result = self.client.put("/dzadmin/api/template-layout", headers=headers,
                                 json={"offsets": {"plan": {"x": 9999, "y": -9999}}})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["offsets"]["plan"], {"x": 385, "y": -555})
        self.assertEqual(self.client.put("/dzadmin/api/template-layout", headers=headers,
                                         json={"offsets": {"unknown": {"x": 1, "y": 1}}}).status_code, 422)
        self.assertEqual(self.client.get("/dzadmin/api/template-layout").json(), result.json())
        catalog = self.client.get("/api/catalog", headers=signed_headers(12345)).json()
        self.assertEqual(catalog["layout_settings"]["samolet_context"], result.json()["offsets"])
        with patch("app.main.font_path", return_value=font), patch(
            "app.main.render_png", new_callable=AsyncMock, return_value="dznow_test.png"
        ) as render:
            response = self.client.post("/api/render", headers=signed_headers(12345), json={
                "template_id": "samolet_context", "layout": "samolet_context",
                "data": {"layoutOffsets": {"plan": {"x": 5, "y": 5}}}})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(render.await_args.args[0]["data"]["layoutOffsets"], result.json()["offsets"])


if __name__ == "__main__":
    unittest.main()
