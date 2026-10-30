"""All archive logic: pages, background worker, corrections, refresh, search.

The routes in main.py are thin wrappers around the functions here.
"""
import json
import queue
import threading
from datetime import datetime
from io import BytesIO

from PIL import Image, ImageOps

from . import db
from . import engine_loader as engine
from .db import connect

PROCESSING = ("queued", "transcribing", "translating", "extracting")
FACT_KINDS = ("person", "place", "date", "item")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def now() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


# ---------------------------------------------------------------- settings

def get_settings() -> dict:
    with connect() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    values = {r["key"]: r["value"] for r in rows}
    return {
        "model": values.get("model", db.DEFAULT_SETTINGS["model"]),
        "target_language": values.get("target_language", db.DEFAULT_SETTINGS["target_language"]),
    }


def put_settings(model: str, target_language: str) -> dict:
    model, target_language = (model or "").strip(), (target_language or "").strip()
    if not model or not target_language:
        raise ApiError(400, "bad_request", "model and target_language must not be empty.")
    with connect() as conn:
        for key, value in (("model", model), ("target_language", target_language)):
            conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )
    return {"model": model, "target_language": target_language}


# ---------------------------------------------------------------- helpers

def _title(row) -> str:
    writer, date = row["writer"], row["approx_date"]
    if writer and date:
        return "%s, %s" % (writer, date)
    if writer or date:
        return writer or date
    return "Page %d" % row["id"]


def _clean_text(value):
    value = (value or "").strip()
    return value or None


def _valid_span(s, e, length) -> bool:
    return isinstance(s, int) and isinstance(e, int) and 0 <= s < e <= length


def _clean_spans(spans, length) -> list:
    out = []
    for sp in spans or []:
        try:
            s, e = int(sp["start"]), int(sp["end"])
        except (KeyError, TypeError, ValueError):
            continue
        if _valid_span(s, e, length):
            out.append({"start": s, "end": e})
    return sorted(out, key=lambda x: x["start"])


def _reindex(conn, page_id: int):
    """Rebuild this page's row in the full-text table from the current data."""
    conn.execute("DELETE FROM pages_fts WHERE page_id = ?", (page_id,))
    t = conn.execute("SELECT text FROM transcripts WHERE page_id = ?", (page_id,)).fetchone()
    if t is None:
        return
    tr = conn.execute("SELECT text FROM translations WHERE page_id = ?", (page_id,)).fetchone()
    facts = conn.execute("SELECT text FROM facts WHERE page_id = ? ORDER BY id", (page_id,)).fetchall()
    conn.execute(
        "INSERT INTO pages_fts (page_id, transcript, translation, facts) VALUES (?, ?, ?, ?)",
        (page_id, t["text"], tr["text"] if tr else "", "\n".join(f["text"] for f in facts)),
    )


# ---------------------------------------------------------------- creating pages

def create_page(data: bytes, language_hint=None, writer=None, approx_date=None, model=None) -> int:
    """Validate and save the image (never modified), make a thumbnail, add a queued row."""
    try:
        img = Image.open(BytesIO(data))
        img.load()
    except Exception:
        raise ApiError(400, "invalid_image", "That file is not a readable JPG or PNG image.")
    fmt = (img.format or "").upper()
    if fmt not in ("JPEG", "PNG"):
        raise ApiError(400, "invalid_image", "Only JPG or PNG images can be added.")
    ext = ".png" if fmt == "PNG" else ".jpg"
    model = model or get_settings()["model"]

    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO pages (status, model, language_hint, writer, approx_date, added_at) "
            "VALUES ('queued', ?, ?, ?, ?, ?)",
            (model, _clean_text(language_hint), _clean_text(writer), _clean_text(approx_date), now()),
        )
        page_id = cur.lastrowid
        image_file, thumb_file = "%d%s" % (page_id, ext), "%d.jpg" % page_id
        (db.MEDIA_DIR / "pages" / image_file).write_bytes(data)
        thumb = ImageOps.exif_transpose(img).convert("RGB")
        thumb.thumbnail((400, 400))
        thumb.save(db.MEDIA_DIR / "thumbs" / thumb_file, "JPEG", quality=85)
        conn.execute(
            "UPDATE pages SET image_file = ?, thumb_file = ? WHERE id = ?",
            (image_file, thumb_file, page_id),
        )
    return page_id


# ---------------------------------------------------------------- saving results

def save_transcript(page_id: int, text: str, uncertain) -> None:
    spans = _clean_spans(uncertain, len(text))
    with connect() as conn:
        conn.execute(
            "INSERT INTO transcripts (page_id, text, uncertain_json) VALUES (?, ?, ?) "
            "ON CONFLICT(page_id) DO UPDATE SET text = excluded.text, uncertain_json = excluded.uncertain_json",
            (page_id, text, json.dumps(spans)),
        )
        _reindex(conn, page_id)


def save_translation(page_id: int, language: str, text: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO translations (page_id, language, text) VALUES (?, ?, ?) "
            "ON CONFLICT(page_id) DO UPDATE SET language = excluded.language, text = excluded.text",
            (page_id, language, text or ""),
        )
        _reindex(conn, page_id)


def save_facts(page_id: int, facts, text_length: int) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM facts WHERE page_id = ?", (page_id,))
        for f in facts or []:
            word = str(f.get("text", "")).strip()
            if not word:
                continue
            kind = str(f.get("kind", "item")).lower()
            kind = kind if kind in FACT_KINDS else "item"
            try:
                s, e = int(f.get("start", 0)), int(f.get("end", 0))
            except (TypeError, ValueError):
                s, e = 0, 0
            if not _valid_span(s, e, text_length):
                s, e = 0, 0  # position unknown: keep the fact, nothing to highlight
            conn.execute(
                'INSERT INTO facts (page_id, kind, text, start, "end") VALUES (?, ?, ?, ?, ?)',
                (page_id, kind, word, s, e),
            )
        _reindex(conn, page_id)


def _set_status(page_id: int, status: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE pages SET status = ?, error_code = NULL, error_message = NULL WHERE id = ?",
            (status, page_id),
        )


def _set_error(page_id: int, code: str, message: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE pages SET status = 'error', error_code = ?, error_message = ? WHERE id = ?",
            (code, message, page_id),
        )


# ---------------------------------------------------------------- background worker

_jobs: "queue.Queue[tuple[str, int]]" = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def enqueue(kind: str, page_id: int) -> None:
    _jobs.put((kind, page_id))


def _translate_and_extract(page_id: int, text: str, model: str) -> None:
    target = get_settings()["target_language"]
    _set_status(page_id, "translating")
    save_translation(page_id, target, engine.translate(text, target, model))
    _set_status(page_id, "extracting")
    save_facts(page_id, engine.extract(text, model), len(text))


def _run_guarded(page_id: int, work) -> None:
    try:
        work()
        _set_status(page_id, "done")
    except engine.EngineError as e:
        _set_error(page_id, e.code, e.message)
    except Exception as e:  # never let one bad page kill the worker
        _set_error(page_id, "model_failed", "Unexpected error: %s" % e)


def _process(page_id: int) -> None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM pages WHERE id = ?", (page_id,)).fetchone()
    if row is None:
        return

    def work():
        _set_status(page_id, "transcribing")
        result = engine.transcribe(
            str(db.MEDIA_DIR / "pages" / row["image_file"]), row["model"], row["language_hint"]
        )
        text = result["text"]
        save_transcript(page_id, text, result.get("uncertain") or [])
        _translate_and_extract(page_id, text, row["model"])

    _run_guarded(page_id, work)


def _refresh_job(page_id: int) -> None:
    with connect() as conn:
        row = conn.execute("SELECT model FROM pages WHERE id = ?", (page_id,)).fetchone()
        t = conn.execute("SELECT text FROM transcripts WHERE page_id = ?", (page_id,)).fetchone()
    if row is None or t is None:
        return
    _run_guarded(page_id, lambda: _translate_and_extract(page_id, t["text"], row["model"]))


def _worker_loop() -> None:
    while True:
        kind, page_id = _jobs.get()  # one page at a time: small laptops
        try:
            (_process if kind == "process" else _refresh_job)(page_id)
        finally:
            _jobs.task_done()


def start_worker() -> None:
    """Start the single worker thread and pick up pages left unfinished by a restart."""
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        _worker_started = True
    threading.Thread(target=_worker_loop, daemon=True, name="heirloom-worker").start()
    with connect() as conn:
        rows = conn.execute(
            "SELECT p.id, (t.page_id IS NOT NULL) AS has_text FROM pages p "
            "LEFT JOIN transcripts t ON t.page_id = p.id "
            "WHERE p.status IN ('queued','transcribing','translating','extracting') ORDER BY p.id"
        ).fetchall()
    for r in rows:
        # if a transcript exists it may hold human corrections: only redo translation and facts
        enqueue("refresh" if r["has_text"] else "process", r["id"])


def wait_until_idle() -> None:
    """For tests and seed scripts."""
    _jobs.join()


# ---------------------------------------------------------------- reading pages

def _summary(row) -> dict:
    return {
        "id": row["id"],
        "title": _title(row),
        "thumbnail_url": "/media/thumbs/%s" % row["thumb_file"],
        "added_at": row["added_at"],
        "status": row["status"],
    }


def get_page(page_id: int) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM pages WHERE id = ?", (page_id,)).fetchone()
        if row is None:
            raise ApiError(404, "page_not_found", "There is no page with id %s." % page_id)
        t = conn.execute("SELECT * FROM transcripts WHERE page_id = ?", (page_id,)).fetchone()
        corr = conn.execute(
            'SELECT start, "end", old, new, at FROM corrections WHERE page_id = ? ORDER BY id', (page_id,)
        ).fetchall()
        tr = conn.execute("SELECT * FROM translations WHERE page_id = ?", (page_id,)).fetchone()
        facts = conn.execute(
            'SELECT id, kind, text, start, "end" FROM facts WHERE page_id = ? ORDER BY id', (page_id,)
        ).fetchall()
    return {
        "id": row["id"],
        "title": _title(row),
        "image_url": "/media/pages/%s" % row["image_file"],
        "status": row["status"],
        "error": (
            {"code": row["error_code"], "message": row["error_message"]} if row["status"] == "error" else None
        ),
        "model": row["model"],
        "language_hint": row["language_hint"],
        "writer": row["writer"],
        "approx_date": row["approx_date"],
        "transcript": {
            "text": t["text"] if t else "",
            "uncertain": json.loads(t["uncertain_json"]) if t else [],
            "corrections": [
                {"start": c["start"], "end": c["end"], "old": c["old"], "new": c["new"], "at": c["at"]}
                for c in corr
            ],
        },
        "translation": {
            "language": tr["language"] if tr else get_settings()["target_language"],
            "text": tr["text"] if tr else "",
        },
        "facts": [
            {"id": f["id"], "kind": f["kind"], "text": f["text"], "start": f["start"], "end": f["end"]}
            for f in facts
        ],
    }


def _fts_query(q: str) -> str:
    """Turn what a person typed into a safe FTS5 query: every word must match, as a prefix."""
    return " ".join('"%s"*' % token.replace('"', '""') for token in q.split())


def list_pages(q=None) -> list:
    q = (q or "").strip()
    with connect() as conn:
        if not q:
            rows = conn.execute("SELECT * FROM pages ORDER BY id DESC").fetchall()
            return [_summary(r) for r in rows]
        try:
            rows = conn.execute(
                "SELECT p.*, snippet(pages_fts, -1, '', '', ' ... ', 16) AS snip "
                "FROM pages_fts JOIN pages p ON p.id = CAST(pages_fts.page_id AS INTEGER) "
                "WHERE pages_fts MATCH ? ORDER BY rank",
                (_fts_query(q),),
            ).fetchall()
        except Exception:  # a query FTS cannot parse simply matches nothing
            return []
    out = []
    for r in rows:
        item = _summary(r)
        item["snippet"] = r["snip"]
        out.append(item)
    return out


# ---------------------------------------------------------------- corrections and refresh

def apply_correction(page_id: int, start: int, end: int, new_text: str) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT status FROM pages WHERE id = ?", (page_id,)).fetchone()
        if row is None:
            raise ApiError(404, "page_not_found", "There is no page with id %s." % page_id)
        if row["status"] in PROCESSING:
            raise ApiError(409, "page_busy", "This page is still being processed. Try again when it is done.")
        t = conn.execute("SELECT * FROM transcripts WHERE page_id = ?", (page_id,)).fetchone()
        if t is None:
            raise ApiError(409, "no_transcript", "This page has no transcript to correct.")
        text = t["text"]
        if not (0 <= start <= end <= len(text)):
            raise ApiError(400, "bad_range", "start and end must satisfy 0 <= start <= end <= %d." % len(text))

        old = text[start:end]
        delta = len(new_text) - (end - start)
        new_end = start + len(new_text)

        # unsure spans: drop the ones touched by the fix, shift the later ones
        uncertain = []
        for sp in json.loads(t["uncertain_json"]):
            if sp["end"] <= start:
                uncertain.append(sp)
            elif sp["start"] >= end:
                uncertain.append({"start": sp["start"] + delta, "end": sp["end"] + delta})

        # earlier corrections keep their history; their positions follow the current text
        for c in conn.execute('SELECT id, start, "end" FROM corrections WHERE page_id = ?', (page_id,)).fetchall():
            if c["end"] <= start:
                continue
            if c["start"] >= end:
                new_pos = (c["start"] + delta, c["end"] + delta)
            else:
                new_pos = (start, new_end)  # same word corrected again
            conn.execute('UPDATE corrections SET start = ?, "end" = ? WHERE id = ?', (*new_pos, c["id"]))

        conn.execute(
            'INSERT INTO corrections (page_id, start, "end", old, new, at) VALUES (?, ?, ?, ?, ?, ?)',
            (page_id, start, new_end, old, new_text, now()),
        )
        conn.execute(
            "UPDATE transcripts SET text = ?, uncertain_json = ? WHERE page_id = ?",
            (text[:start] + new_text + text[end:], json.dumps(uncertain), page_id),
        )
        _reindex(conn, page_id)  # search always uses the corrected text
    return get_page(page_id)


def refresh_page(page_id: int) -> dict:
    """Queue translation + extraction from the corrected transcript. Returns at once;
    the frontend polls GET /api/pages/{id} until status is done, like after an upload."""
    with connect() as conn:
        row = conn.execute("SELECT status FROM pages WHERE id = ?", (page_id,)).fetchone()
        if row is None:
            raise ApiError(404, "page_not_found", "There is no page with id %s." % page_id)
        if row["status"] in PROCESSING:
            raise ApiError(409, "page_busy", "This page is already being processed.")
        if conn.execute("SELECT 1 FROM transcripts WHERE page_id = ?", (page_id,)).fetchone() is None:
            raise ApiError(409, "no_transcript", "This page has no transcript to refresh from.")
        conn.execute(
            "UPDATE pages SET status = 'translating', error_code = NULL, error_message = NULL WHERE id = ?",
            (page_id,),
        )
    enqueue("refresh", page_id)
    return get_page(page_id)


# ---------------------------------------------------------------- seeding

def add_finished_page(data, writer, approx_date, language_hint, text, uncertain, language, translation, facts) -> int:
    """Insert a page that is already 'done' with canned results (used by the seed command)."""
    page_id = create_page(data, language_hint, writer, approx_date)
    save_transcript(page_id, text, uncertain)
    save_translation(page_id, language, translation)
    save_facts(page_id, facts, len(text))
    _set_status(page_id, "done")
    return page_id


def reset_all() -> None:
    with connect() as conn:
        conn.execute("DELETE FROM pages_fts")
        conn.execute("DELETE FROM pages")
        conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('pages', 'corrections', 'facts')")
    for folder in ("pages", "thumbs"):
        for f in (db.MEDIA_DIR / folder).glob("*"):
            f.unlink()
