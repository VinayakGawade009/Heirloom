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


def is_digit_or_mult_line(line: str) -> bool:
    """Check if a line consists only of digits, whitespace, 'x', 'X', or multiplication signs."""
    allowed_symbols = {"x", "X", "×", "\u00d7", "✕", "✖", "*"}
    return all(c.isdigit() or c.isspace() or c in allowed_symbols for c in line)


def is_letter_line(line: str) -> bool:
    """Check if a line contains real letters (excluding lines made only of digits, spaces, and x/multiplication)."""
    if is_digit_or_mult_line(line):
        return False
    return any(c.isalpha() for c in line)


def collapse_repeated_lines(lines: list[str]) -> list[str]:
    """Remove runs of 3 or more identical (or near-identical, ignoring whitespace) consecutive lines, keeping the first one."""
    if not lines:
        return []

    result: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        curr_norm = "".join(lines[i].split())
        j = i + 1
        while j < n and "".join(lines[j].split()) == curr_norm:
            j += 1

        run_len = j - i
        if run_len >= 3:
            # Keep only the first line of the run
            result.append(lines[i])
        else:
            # Keep all lines if fewer than 3
            result.extend(lines[i:j])

        i = j

    return result


def drop_trailing_digit_lines(lines: list[str]) -> list[str]:
    """Drop trailing lines made only of digits, spaces, and x/multiplication signs when coming after the last line containing letters."""
    last_letter_idx = -1
    for i in range(len(lines) - 1, -1, -1):
        if is_letter_line(lines[i]):
            last_letter_idx = i
            break

    if last_letter_idx == -1:
        return lines

    trimmed = list(lines)
    while len(trimmed) > last_letter_idx + 1:
        if is_digit_or_mult_line(trimmed[-1]):
            trimmed.pop()
        else:
            break

    return trimmed


def trim_repetition(text: str) -> str:
    """
    Remove repetitive looping and trailing garbage from model output.

    - Removes runs of 3 or more identical (or near-identical, ignoring whitespace)
      consecutive lines, keeping the first one.
    - Drops trailing lines made only of digits, spaces, and the symbol 'x' or
      the multiplication sign when they come after the last line containing letters.

    Args:
        text: Raw transcription output from the model.

    Returns:
        Cleaned text string.
    """
    if not text:
        return ""

    lines = text.splitlines()
    if not lines:
        return ""

    lines = collapse_repeated_lines(lines)
    lines = drop_trailing_digit_lines(lines)

    return "\n".join(lines)


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
