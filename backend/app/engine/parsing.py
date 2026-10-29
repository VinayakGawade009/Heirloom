"""Parsing utilities for Heirloom engine output."""

from __future__ import annotations

import re


def strip_code_fences(text: str) -> str:
    """Strip markdown code fence wrapper (```...```) if present."""
    s = text.strip()
    pattern = r"^```(?:[a-zA-Z0-9_-]+)?\r?\n?(.*?)\r?\n?```$"
    match = re.match(pattern, s, flags=re.DOTALL)
    if match:
        return match.group(1)
    return text


def _clean_strays(text: str) -> str:
    """Remove stray '[?' or '?]' from text segment."""
    return text.replace("[?", "").replace("?]", "")


def parse_uncertain(marked: str) -> tuple[str, list[dict[str, int]]]:
    """
    Parse uncertain markers [?word?] from transcription output.

    Removes the [? ?] markers and returns the clean text and a list of
    uncertain spans [{"start": int, "end": int}] pointing into clean text.
    Handles multi-word markers, empty marker [??] (no text and no span),
    and stray '[?' or '?]' markers without crashing.
    Strips any markdown code fences surrounding the response.

    Returns:
        tuple[str, list[dict[str, int]]]: (clean_text, spans)
    """
    if not marked:
        return "", []

    text = strip_code_fences(marked)

    # Match [?content?], where content does not cross another [? or ?]
    marker_pattern = re.compile(r"\[\?((?:(?!\[\?|\?\]).)*?)\?\]", re.DOTALL)

    clean_parts: list[str] = []
    spans: list[dict[str, int]] = []
    last_idx = 0

    for match in marker_pattern.finditer(text):
        start_m, end_m = match.span()
        prefix = _clean_strays(text[last_idx:start_m])
        clean_parts.append(prefix)

        content = match.group(1)
        # Empty marker [??] -> keep no text, add no span
        if content:
            current_len = sum(len(p) for p in clean_parts)
            span_start = current_len
            span_end = current_len + len(content)
            if span_end > span_start and span_start >= 0:
                spans.append({"start": span_start, "end": span_end})
            clean_parts.append(content)

        last_idx = end_m

    tail = _clean_strays(text[last_idx:])
    clean_parts.append(tail)

    clean_text = "".join(clean_parts)

    valid_spans: list[dict[str, int]] = []
    prev_end = 0
    total_len = len(clean_text)

    for s in spans:
        start = s["start"]
        end = s["end"]
        if 0 <= start < end <= total_len and start >= prev_end:
            valid_spans.append({"start": start, "end": end})
            prev_end = end

    return clean_text, valid_spans
