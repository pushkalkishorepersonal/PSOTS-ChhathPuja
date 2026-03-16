import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.environ.get("DB_PATH", "warnings.db")
WARNING_EXPIRY_DAYS = 30  # Warnings reset after 30 days of no new violations


class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_warnings (
                    user_id     INTEGER NOT NULL,
                    chat_id     INTEGER NOT NULL,
                    username    TEXT,
                    full_name   TEXT,
                    count       INTEGER DEFAULT 0,
                    last_warned TEXT,
                    PRIMARY KEY (user_id, chat_id)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS whitelisted_users (
                    user_id  INTEGER NOT NULL,
                    chat_id  INTEGER NOT NULL,
                    added_by INTEGER,
                    added_at TEXT,
                    PRIMARY KEY (user_id, chat_id)
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS deleted_messages (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id    INTEGER,
                    user_id    INTEGER,
                    username   TEXT,
                    message    TEXT,
                    reason     TEXT,
                    deleted_at TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS custom_keywords (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword    TEXT NOT NULL,
                    category   TEXT NOT NULL DEFAULT 'custom',
                    added_by   INTEGER,
                    added_at   TEXT,
                    UNIQUE(keyword)
                )
            """)
            conn.commit()

    def add_warning(self, user_id: int, chat_id: int, username: str, full_name: str) -> int:
        """Add a warning for a user. Returns the new warning count."""
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT count, last_warned FROM user_warnings WHERE user_id=? AND chat_id=?",
                (user_id, chat_id)
            ).fetchone()

            if row:
                count, last_warned = row
                # Reset count if last warning was more than WARNING_EXPIRY_DAYS ago
                if last_warned:
                    last_dt = datetime.fromisoformat(last_warned)
                    if datetime.utcnow() - last_dt > timedelta(days=WARNING_EXPIRY_DAYS):
                        count = 0
                new_count = count + 1
                conn.execute(
                    "UPDATE user_warnings SET count=?, last_warned=?, username=?, full_name=? WHERE user_id=? AND chat_id=?",
                    (new_count, now, username, full_name, user_id, chat_id)
                )
            else:
                new_count = 1
                conn.execute(
                    "INSERT INTO user_warnings (user_id, chat_id, username, full_name, count, last_warned) VALUES (?,?,?,?,?,?)",
                    (user_id, chat_id, username, full_name, new_count, now)
                )
            conn.commit()
        return new_count

    def get_warnings(self, user_id: int, chat_id: int) -> int:
        """Get current warning count for a user."""
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT count, last_warned FROM user_warnings WHERE user_id=? AND chat_id=?",
                (user_id, chat_id)
            ).fetchone()
            if not row:
                return 0
            count, last_warned = row
            if last_warned:
                last_dt = datetime.fromisoformat(last_warned)
                if datetime.utcnow() - last_dt > timedelta(days=WARNING_EXPIRY_DAYS):
                    return 0
            return count

    def reset_warnings(self, user_id: int, chat_id: int):
        """Reset warning count for a user (admin action)."""
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE user_warnings SET count=0 WHERE user_id=? AND chat_id=?",
                (user_id, chat_id)
            )
            conn.commit()

    def get_all_warnings(self, chat_id: int) -> list:
        """Get all users with active warnings in a chat."""
        cutoff = (datetime.utcnow() - timedelta(days=WARNING_EXPIRY_DAYS)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """SELECT user_id, username, full_name, count, last_warned
                   FROM user_warnings
                   WHERE chat_id=? AND count>0 AND last_warned>?
                   ORDER BY count DESC""",
                (chat_id, cutoff)
            ).fetchall()
        return [
            {"user_id": r[0], "username": r[1], "full_name": r[2], "count": r[3], "last_warned": r[4]}
            for r in rows
        ]

    def is_whitelisted(self, user_id: int, chat_id: int) -> bool:
        """Check if a user is whitelisted (exempt from moderation)."""
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT 1 FROM whitelisted_users WHERE user_id=? AND chat_id=?",
                (user_id, chat_id)
            ).fetchone()
        return row is not None

    def whitelist_user(self, user_id: int, chat_id: int, added_by: int):
        """Add a user to the whitelist."""
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO whitelisted_users (user_id, chat_id, added_by, added_at) VALUES (?,?,?,?)",
                (user_id, chat_id, added_by, now)
            )
            conn.commit()

    def remove_whitelist(self, user_id: int, chat_id: int):
        """Remove a user from the whitelist."""
        with self._get_conn() as conn:
            conn.execute(
                "DELETE FROM whitelisted_users WHERE user_id=? AND chat_id=?",
                (user_id, chat_id)
            )
            conn.commit()

    def log_deleted_message(self, chat_id: int, user_id: int, username: str, message: str, reason: str):
        """Log a deleted message for admin review."""
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO deleted_messages (chat_id, user_id, username, message, reason, deleted_at) VALUES (?,?,?,?,?,?)",
                (chat_id, user_id, username, message, reason, now)
            )
            conn.commit()

    # ── Custom keyword management ──────────────────────────────────────────────

    def add_custom_keyword(self, keyword: str, category: str, added_by: int) -> bool:
        """Add a custom keyword. Returns False if it already exists."""
        now = datetime.utcnow().isoformat()
        try:
            with self._get_conn() as conn:
                conn.execute(
                    "INSERT INTO custom_keywords (keyword, category, added_by, added_at) VALUES (?,?,?,?)",
                    (keyword.lower().strip(), category, added_by, now)
                )
                conn.commit()
            return True
        except Exception:
            return False  # Already exists (UNIQUE constraint)

    def remove_custom_keyword(self, keyword: str) -> bool:
        """Remove a custom keyword. Returns False if it didn't exist."""
        with self._get_conn() as conn:
            cursor = conn.execute(
                "DELETE FROM custom_keywords WHERE keyword=?",
                (keyword.lower().strip(),)
            )
            conn.commit()
        return cursor.rowcount > 0

    def get_custom_keywords(self) -> list:
        """Return all custom keywords."""
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT keyword, category, added_at FROM custom_keywords ORDER BY category, keyword"
            ).fetchall()
        return [{"keyword": r[0], "category": r[1], "added_at": r[2]} for r in rows]

    def get_custom_keywords_list(self) -> list[str]:
        """Return just the keyword strings for quick checking."""
        with self._get_conn() as conn:
            rows = conn.execute("SELECT keyword FROM custom_keywords").fetchall()
        return [r[0] for r in rows]
