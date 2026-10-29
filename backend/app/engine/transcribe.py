"""Transcription engine module for Heirloom."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .client import chat
from .errors import EngineError, MODEL_FAILED
from .image import prepare_image
from .parsing import parse_uncertain
from .prompts import build_transcribe_prompt


def transcribe(
    image_path: str | Path,
    model: str,
    language_hint: str | None = None,
) -> dict[str, Any]:
    """
    Transcribe a handwritten page image using the specified model.

    Args:
        image_path: Path to the image file.
        model: Ollama model tag (e.g. 'gemma4:e2b').
        language_hint: Optional language name (e.g. 'English', 'French').

    Returns:
        dict with:
            "text": Clean transcription string.
            "uncertain": List of character spans [{"start": int, "end": int}] for uncertain words.

    Raises:
        EngineError: On missing image, server down, uninstalled model, timeout,
                     empty transcription, or model failure.
    """
    image_bytes = prepare_image(image_path)
    prompt = build_transcribe_prompt(language_hint)

    messages = [
        {
            "role": "user",
            "content": prompt,
            "images": [image_bytes],
        }
    ]

    response_text = chat(messages=messages, model=model)
    clean_text, spans = parse_uncertain(response_text)

    if not clean_text or not clean_text.strip():
        raise EngineError(MODEL_FAILED, "The model returned no text for this page")

    return {
        "text": clean_text,
        "uncertain": spans,
    }
