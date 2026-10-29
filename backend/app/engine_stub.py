class EngineError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def list_models() -> list[str]:
    return ["gemma4:e2b"]


def transcribe(image_path, model, language_hint=None):
    return {
        "text": "Dear Anna, the harvest at the farm was good this year.",
        "uncertain": [{"start": 10, "end": 14}],
    }


def translate(text, target_language, model) -> str:
    return "[stub translation] " + text


def extract(text, model):
    return [
        {"kind": "person", "text": "Anna", "start": 5, "end": 9},
        {"kind": "place", "text": "farm", "start": 28, "end": 32},
    ]
