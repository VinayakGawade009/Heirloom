"""Heirloom server. Thin routes over service.py. Run from the backend folder:

    python -m uvicorn app.main:app --port 8000
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import db, service
from . import engine_loader as engine
from .service import ApiError

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    service.start_worker()
    yield


app = FastAPI(title="Heirloom", lifespan=lifespan)


class SettingsBody(BaseModel):
    model: str
    target_language: str


class CorrectionBody(BaseModel):
    start: int
    end: int
    new_text: str


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(engine.EngineError)
async def engine_error_handler(request: Request, exc: engine.EngineError):
    return _error(503, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    detail = "; ".join("%s: %s" % (".".join(str(p) for p in e["loc"]), e["msg"]) for e in exc.errors())
    return _error(422, "bad_request", detail or "Invalid request.")


@app.get("/api/health")
def health():
    try:
        return {"ollama_running": True, "installed_models": engine.list_models()}
    except engine.EngineError:
        return {"ollama_running": False, "installed_models": []}


@app.get("/api/settings")
def get_settings():
    return service.get_settings()


@app.put("/api/settings")
def put_settings(body: SettingsBody):
    return service.put_settings(body.model, body.target_language)


@app.get("/api/pages")
def list_pages(q: str | None = None):
    return {"pages": service.list_pages(q)}


@app.post("/api/pages")
def add_page(
    image: UploadFile = File(...),
    language_hint: str | None = Form(None),
    writer: str | None = Form(None),
    approx_date: str | None = Form(None),
):
    page_id = service.create_page(image.file.read(), language_hint, writer, approx_date)
    service.enqueue("process", page_id)
    return {"id": page_id, "status": "queued"}


@app.get("/api/pages/{page_id}")
def get_page(page_id: int):
    return service.get_page(page_id)


@app.delete("/api/pages/{page_id}")
def delete_page(page_id: int):
    try:
        return service.delete_page(page_id)
    except service.PageNotFoundError:
        raise HTTPException(status_code=404, detail="Page not found")
    except service.PageBusyError:
        raise HTTPException(status_code=409, detail="Page is still being processed")



@app.post("/api/pages/{page_id}/corrections")
def add_correction(page_id: int, body: CorrectionBody):
    return service.apply_correction(page_id, body.start, body.end, body.new_text)


@app.post("/api/pages/{page_id}/refresh")
def refresh(page_id: int):
    return service.refresh_page(page_id)


# ---- page images and thumbnails, then the built frontend (must stay last)
db.ensure_dirs()
app.mount("/media", StaticFiles(directory=db.MEDIA_DIR), name="media")


@app.get("/{full_path:path}", include_in_schema=False)
def frontend(full_path: str):
    if full_path.split("/")[0] in ("api", "media"):
        return _error(404, "not_found", "No such route.")
    index = FRONTEND_DIST / "index.html"
    if not index.is_file():
        return JSONResponse(
            {"message": "Heirloom API is running. The frontend is not built yet (frontend/dist is missing)."}
        )
    candidate = (FRONTEND_DIST / full_path).resolve()
    if full_path and candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
        return FileResponse(candidate)
    return FileResponse(index)  # single-page app: unknown paths open the app
