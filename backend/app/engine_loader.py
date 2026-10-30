"""The ONE place that decides which engine the server uses.

Default is the stub. Start with HEIRLOOM_ENGINE=real (or `start.bat real`)
to use Arushi's backend/app/engine/ package.
"""
import os

ENGINE = os.environ.get("HEIRLOOM_ENGINE", "stub").lower()

if ENGINE == "real":
    from .engine import EngineError, extract, list_models, transcribe, translate  # noqa: F401
else:
    from .engine_stub import EngineError, extract, list_models, transcribe, translate  # noqa: F401
