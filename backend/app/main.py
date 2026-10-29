from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from . import engine_stub as engine  # at the merge, switch to Arushi's engine

app = FastAPI(title="Heirloom")


@app.exception_handler(engine.EngineError)
async def engine_error_handler(request: Request, exc: engine.EngineError):
    return JSONResponse(
        status_code=503,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.get("/api/health")
def health():
    try:
        models = engine.list_models()
        return {"ollama_running": True, "installed_models": models}
    except engine.EngineError:
        return {"ollama_running": False, "installed_models": []}
