"""SQLite setup for Heirloom. All data lives in backend/data (git-ignored)."""
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DATA_DIR = Path(os.environ.get("HEIRLOOM_DATA_DIR") or Path(__file__).resolve().parent.parent / "data")
DB_PATH = DATA_DIR / "heirloom.db"
MEDIA_DIR = DATA_DIR / "media"

DEFAULT_SETTINGS = {"model": "gemma4:e2b", "target_language": "English"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL DEFAULT 'queued',
    error_code TEXT,
    error_message TEXT,
    model TEXT,
    language_hint TEXT,
    writer TEXT,
    approx_date TEXT,
    image_file TEXT NOT NULL DEFAULT '',
    thumb_file TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transcripts (
    page_id INTEGER PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    uncertain_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    start INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    old TEXT NOT NULL,
    new TEXT NOT NULL,
    at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translations (
    page_id INTEGER PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    start INTEGER NOT NULL,
    "end" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    page_id UNINDEXED,
    transcript,
    translation,
    facts
);
"""


def ensure_dirs():
    (MEDIA_DIR / "pages").mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / "thumbs").mkdir(parents=True, exist_ok=True)


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    ensure_dirs()
    with connect() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        for key, value in DEFAULT_SETTINGS.items():
            conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))
