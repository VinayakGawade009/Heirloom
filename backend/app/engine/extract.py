"""Entity extraction engine module for Heirloom."""

from __future__ import annotations

import json
from typing import Any

from .client import chat
from .errors import EngineError, MODEL_FAILED
from .parsing import strip_code_fences
from .prompts import build_extract_prompt
from .spans import json_to_facts


def _parse_json_payload(raw: str) -> dict[str, Any]:
    """Parse raw model output as JSON, stripping code fences if present."""
    s = raw.strip()
    if s.startswith("```"):
        s = strip_code_fences(s)
    parsed = json.loads(s)
    if not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object, got {type(parsed).__name__}")
    return parsed


def extract(text: str, model: str) -> list[dict[str, Any]]:
    """
    Extract entities (people, places, dates, items) from text using Ollama.

    Args:
        text: Source text to extract entities from.
        model: Ollama model tag (e.g. 'gemma4:e2b').

    Returns:
        List of facts: [{"kind": str, "text": str, "start": int, "end": int}]

    Raises:
        EngineError: If entity extraction fails or model returns invalid JSON twice.
    """
    if not text or not text.strip():
        return []

    prompt = build_extract_prompt(text)
    messages = [
        {
            "role": "user",
            "content": prompt,
        }
    ]

    # Attempt 1
    reply = chat(messages=messages, model=model, format="json")
    try:
        data = _parse_json_payload(reply)
    except Exception as first_err:
        # Retry once if the first JSON output was invalid
        try:
            reply_retry = chat(messages=messages, model=model, format="json")
            data = _parse_json_payload(reply_retry)
        except Exception as second_err:
            raise EngineError(
                MODEL_FAILED,
                f"Model returned invalid JSON for entity extraction: {second_err}",
            ) from second_err

    return json_to_facts(data, text)
