import json
import sqlite3
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
"""


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


def list_projects(user_id: int, limit: int = 24):
    with conn() as c:
        rows = c.execute(
            "SELECT * FROM projects WHERE user_id=? ORDER BY at DESC LIMIT ?", (user_id, limit)
        ).fetchall()
    return [
        {"id": r["id"], "title": r["title"], "scenario": r["scenario"],
         "layout": r["layout"], "at": r["at"], "data": json.loads(r["data"])}
        for r in rows
    ]


def save_project(user_id: int, p: dict):
    with conn() as c:
        # один и тот же объект в том же макете перезаписывается, а не плодит дубли
        c.execute(
            "DELETE FROM projects WHERE user_id=? AND title=? AND layout=?",
            (user_id, p["title"], p["layout"]),
        )
        c.execute(
            "INSERT INTO projects (id,user_id,title,scenario,layout,at,data) VALUES (?,?,?,?,?,?,?)",
            (p["id"], user_id, p["title"], p["scenario"], p["layout"], p["at"], json.dumps(p["data"], ensure_ascii=False)),
        )
    return p
