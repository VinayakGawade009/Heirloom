"""Engine error classes and error code constants."""

OLLAMA_NOT_RUNNING = "ollama_not_running"
MODEL_NOT_INSTALLED = "model_not_installed"
MODEL_FAILED = "model_failed"


class EngineError(Exception):
    """
    Base error raised by engine operations.

    Attributes:
        code: Error code string ('ollama_not_running', 'model_not_installed', 'model_failed').
        message: Human-readable error description.
    """

    def __init__(self, code: str, message: str | None = None) -> None:
        if message is None:
            if code == OLLAMA_NOT_RUNNING:
                message = "Ollama isn't running, start the Ollama app and try again"
            else:
                message = code
        super().__init__(message)
        self.code = code
        self.message = message

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"

    def __repr__(self) -> str:
        return f"EngineError(code={self.code!r}, message={self.message!r})"
