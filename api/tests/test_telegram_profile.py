import io
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from app import telegram_profile


class ProfileLookupTests(unittest.TestCase):
    def test_private_chat_profile(self):
        payload = {"ok": True, "result": {"id": 12345, "type": "private", "first_name": "Анна",
                                          "last_name": "Петрова", "username": "anna"}}
        with patch.object(telegram_profile, "BOT_TOKEN", "test-token"), \
                patch.object(telegram_profile, "urlopen", return_value=io.BytesIO(json.dumps(payload).encode())) as request:
            self.assertEqual(telegram_profile.lookup(12345), ("Анна Петрова", "anna"))
        self.assertEqual(json.loads(request.call_args.args[0].data), {"chat_id": 12345})

    def test_unavailable_chat_does_not_return_a_name(self):
        with patch.object(telegram_profile, "BOT_TOKEN", "test-token"), \
                patch.object(telegram_profile, "urlopen", side_effect=HTTPError("url", 400, "Bad Request", {}, None)):
            self.assertIsNone(telegram_profile.lookup(12345))

    def test_other_chat_is_rejected(self):
        payload = {"ok": True, "result": {"id": 999, "type": "private", "first_name": "Other"}}
        with patch.object(telegram_profile, "BOT_TOKEN", "test-token"), \
                patch.object(telegram_profile, "urlopen", return_value=io.BytesIO(json.dumps(payload).encode())):
            self.assertIsNone(telegram_profile.lookup(12345))
