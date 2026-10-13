import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


class Store:
    def __init__(self, path="data/routesentinel.sqlite3"):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY,payload TEXT);
              CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY,created_at TEXT,payload TEXT);
              CREATE TABLE IF NOT EXISTS routes(id TEXT PRIMARY KEY,created_at TEXT,payload TEXT);
              CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,alert_id TEXT,payload TEXT);
            """)

    def connect(self):
        return sqlite3.connect(self.path)

    def assets(self):
        with self.connect() as db:
            rows = db.execute("SELECT payload FROM assets ORDER BY id").fetchall()
        return [json.loads(row[0]) for row in rows]

    def add_asset(self, payload):
        identifier = str(uuid4())
        with self.connect() as db:
            db.execute("INSERT INTO assets VALUES (?,?)", (identifier, json.dumps(payload)))
        return {"id": identifier, **payload}

    def save_route(self, payload):
        identifier = str(uuid4())
        created = datetime.now(UTC).isoformat()
        with self.connect() as db:
            db.execute(
                "INSERT INTO routes VALUES (?,?,?)", (identifier, created, json.dumps(payload))
            )
        return {"id": identifier, "created_at": created, **payload}

    def save_alert(self, payload):
        identifier = str(uuid4())
        created = datetime.now(UTC).isoformat()
        with self.connect() as db:
            db.execute(
                "INSERT INTO alerts VALUES (?,?,?)", (identifier, created, json.dumps(payload))
            )
        return {"id": identifier, "created_at": created, **payload}

    def list_table(self, table):
        if table not in {"alerts", "routes"}:
            raise ValueError("Unsupported table")
        with self.connect() as db:
            rows = db.execute(
                f"SELECT id,created_at,payload FROM {table} ORDER BY created_at DESC"
            ).fetchall()
        return [{"id": r[0], "created_at": r[1], **json.loads(r[2])} for r in rows]

    def feedback(self, alert_id, payload):
        identifier = str(uuid4())
        with self.connect() as db:
            exists = db.execute("SELECT 1 FROM alerts WHERE id=?", (alert_id,)).fetchone()
            if not exists:
                return None
            db.execute(
                "INSERT INTO feedback VALUES (?,?,?)", (identifier, alert_id, json.dumps(payload))
            )
        return {"id": identifier, "alert_id": alert_id, **payload}
