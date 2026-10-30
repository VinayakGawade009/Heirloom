"""Translation engine module for Heirloom."""

from __future__ import annotations

import re

from .client import chat
from .errors import EngineError, MODEL_FAILED
from .parsing import strip_code_fences
from .prompts import build_translate_prompt


def strip_leading_translation_phrase(text: str) -> str:
    """Strip preamble phrases like 'Here is the translation:' or 'Translation:'."""
    s = text.strip()
    pattern = re.compile(
        r"^(?:here(?:'s|\s+is)?\s+(?:the\s+)?(?:translated\s+text|translation)[^:\n]*:?\s*|translation:\s*|below\s+is\s+(?:the\s+)?translation[^:\n]*:?\s*)",
        re.IGNORECASE,
    )
    return pattern.sub("", s).strip()


def translate(text: str, target_language: str, model: str) -> str:
    """
    Translate text into target language using the specified model.

    Args:
        text: Source text to translate.
        target_language: Target language name (e.g. 'English').
        model: Ollama model tag (e.g. 'gemma4:e2b').

    Returns:
        Translated text string.

    Raises:
        EngineError: If translation fails or model returns empty text.
    """
    if not text or not text.strip():
        return ""

    prompt = build_translate_prompt(text=text, target_language=target_language)
    messages = [
        {
            "role": "user",
            "content": prompt,
        }
    ]

    reply = chat(messages=messages, model=model)

    # Clean code fences and conversational preambles
    cleaned = strip_code_fences(reply)
    cleaned = strip_leading_translation_phrase(cleaned)
    cleaned = strip_code_fences(cleaned).strip()

    if not cleaned:
        raise EngineError(MODEL_FAILED, "The model returned an empty translation.")

    return cleaned
