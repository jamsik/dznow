import json
import os
import sqlite3
import time
from contextlib import contextmanager

from .config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id       TEXT PRIMARY KEY,
    user_id  INTEGER NOT NULL,
    title    TEXT NOT NULL,
    scenario TEXT NOT NULL,
    layout   TEXT NOT NULL,
    at       INTEGER NOT NULL,
    data     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS projects_user_at ON projects(user_id, at DESC);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '',
    service_access INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS template_access (
    user_id INTEGER NOT NULL,
    template_id TEXT NOT NULL,
    PRIMARY KEY(user_id, template_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""

TEMPLATE_IDS = ("object", "figure", "light", "samolet")


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with conn() as c:
        c.executescript(SCHEMA)
        columns = {row["name"] for row in c.execute("PRAGMA table_info(projects)")}
        if "template_id" not in columns:
            c.execute("ALTER TABLE projects ADD COLUMN template_id TEXT")
        if not c.execute("SELECT 1 FROM settings WHERE key='access_migration_v1'").fetchone():
            now = int(time.time())
            # Existing project owners keep their previous access on first upgrade.
            c.execute("""INSERT OR IGNORE INTO users(id, name, service_access, first_seen, last_seen)
                         SELECT DISTINCT user_id, '', 1, ?, ? FROM projects WHERE user_id > 0""", (now, now))
            c.execute("""INSERT OR IGNORE INTO template_access(user_id, template_id)
                         SELECT id, 'object' FROM users WHERE service_access=1""")
            c.execute("""INSERT OR IGNORE INTO template_access(user_id, template_id)
                         SELECT id, 'figure' FROM users WHERE service_access=1""")
            c.execute("""INSERT OR IGNORE INTO template_access(user_id, template_id)
                         SELECT id, 'light' FROM users WHERE service_access=1""")
            c.execute("INSERT INTO settings(key,value) VALUES('access_migration_v1','1')")
        owner = (os.environ.get("SAMOLET_TEMPLATE_USER_ID") or "").strip()
        if owner.isascii() and owner.isdecimal() and int(owner) > 0 and not c.execute(
            "SELECT 1 FROM settings WHERE key='legacy_samolet_owner_imported'"
        ).fetchone():
            now = int(time.time())
            c.execute("""INSERT INTO users(id,name,service_access,first_seen,last_seen)
                         VALUES(?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET service_access=1""",
                      (int(owner), "", now, now))
            c.execute("INSERT OR IGNORE INTO template_access(user_id,template_id) VALUES(?,?)", (int(owner), "samolet"))
            c.execute("INSERT INTO settings(key,value) VALUES('legacy_samolet_owner_imported','1')")


def touch_user(user: dict) -> bool:
    now = int(time.time())
    with conn() as c:
        c.execute("""INSERT INTO users(id,name,username,first_seen,last_seen)
                     VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
                     name=excluded.name, username=excluded.username, last_seen=excluded.last_seen""",
                  (user["id"], user.get("name", ""), user.get("username", ""), now, now))
        row = c.execute("SELECT service_access FROM users WHERE id=?", (user["id"],)).fetchone()
        return bool(row["service_access"])


def user_templates(user_id: int) -> list[str]:
    with conn() as c:
        return [r["template_id"] for r in c.execute(
            "SELECT template_id FROM template_access WHERE user_id=?", (user_id,)
        ) if r["template_id"] in TEMPLATE_IDS]


def list_users() -> list[dict]:
    with conn() as c:
        users = c.execute("SELECT * FROM users WHERE id>0 ORDER BY last_seen DESC, id DESC").fetchall()
        access = c.execute("SELECT user_id,template_id FROM template_access").fetchall()
    by_user = {}
    for row in access:
        by_user.setdefault(row["user_id"], []).append(row["template_id"])
    return [{"id": r["id"], "name": r["name"], "username": r["username"],
             "service_access": bool(r["service_access"]), "first_seen": r["first_seen"],
             "last_seen": r["last_seen"], "templates": by_user.get(r["id"], [])} for r in users]


def add_user(user_id: int, name: str = "") -> None:
    now = int(time.time())
    with conn() as c:
        c.execute("INSERT OR IGNORE INTO users(id,name,first_seen,last_seen) VALUES(?,?,?,?)",
                  (user_id, name.strip()[:120], now, now))


def set_service_access(user_id: int, enabled: bool) -> bool:
    with conn() as c:
        result = c.execute("UPDATE users SET service_access=? WHERE id=?", (int(enabled), user_id))
        return result.rowcount > 0


def set_template_access(user_id: int, template_id: str, enabled: bool) -> bool:
    with conn() as c:
        if not c.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
            return False
        if enabled:
            c.execute("INSERT OR IGNORE INTO template_access(user_id,template_id) VALUES(?,?)", (user_id, template_id))
        else:
            c.execute("DELETE FROM template_access WHERE user_id=? AND template_id=?", (user_id, template_id))
        return True


def list_projects(user_id: int, limit: int = 24):
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM projects WHERE user_id=? ORDER BY at DESC LIMIT ?", (user_id, limit)
        ).fetchall()
    return [
        {"id": r["id"], "title": r["title"], "scenario": r["scenario"],
         "layout": r["layout"], "template_id": r["template_id"] or infer_template(r["layout"], json.loads(r["data"])),
         "at": r["at"], "data": json.loads(r["data"])}
        for r in rows
    ]


def save_project(user_id: int, p: dict):
    with conn() as c:
        # один и тот же объект в том же макете перезаписывается, а не плодит дубли
        c.execute(
            "DELETE FROM projects WHERE user_id=? AND title=? AND (template_id=? OR (template_id IS NULL AND layout=?))",
            (user_id, p["title"], p["template_id"], p["layout"]),
        )
        c.execute(
            "INSERT INTO projects (id,user_id,title,scenario,layout,template_id,at,data) VALUES (?,?,?,?,?,?,?,?)",
            (p["id"], user_id, p["title"], p["scenario"], p["layout"], p["template_id"], p["at"], json.dumps(p["data"], ensure_ascii=False)),
        )
    return p


def infer_template(layout: str, data: dict) -> str:
    if layout == "samolet":
        return "samolet"
    if layout == "figure":
        return "figure"
    return "light" if data.get("skin") == "light" else "object"
