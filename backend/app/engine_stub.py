"""Stand-in for Arushi's engine. Same four functions, canned data.

Each call sleeps a moment so the frontend can show the progress line.
Set HEIRLOOM_STUB_DELAY=0 to disable.
"""
import os
import time

DELAY = float(os.environ.get("HEIRLOOM_STUB_DELAY", "1"))
TEXT = "Dear Anna, the harvest at the farm was good this year."


class EngineError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _span(word):
    start = TEXT.find(word)
    return {"start": start, "end": start + len(word)}


def list_models() -> list[str]:
    return ["gemma4:e2b"]


def transcribe(image_path, model, language_hint=None):
    time.sleep(DELAY)
    return {"text": TEXT, "uncertain": [_span("harvest")]}


def translate(text, target_language, model) -> str:
    time.sleep(DELAY)
    return "[stub translation to %s] %s" % (target_language, text)


def extract(text, model):
    time.sleep(DELAY)
    facts = []
    for kind, word in (("person", "Anna"), ("place", "farm")):
        start = text.find(word)
        if start >= 0:
            facts.append({"kind": kind, "text": word, "start": start, "end": start + len(word)})
    return facts
