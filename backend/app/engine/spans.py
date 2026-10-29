"""Pure Python span finding and JSON-to-facts mapping for Heirloom engine."""

from __future__ import annotations

from typing import Any


class Span(tuple):
    """Character span tuple (start, end) supporting both index and property access."""

    def __new__(cls, start: int, end: int):
        return super().__new__(cls, (start, end))

    @property
    def start(self) -> int:
        return self[0]

    @property
    def end(self) -> int:
        return self[1]

    def __getitem__(self, item: Any) -> Any:
        if item == "start":
            return self[0]
        if item == "end":
            return self[1]
        return super().__getitem__(item)


def find_spans(text: str, value: str) -> list[Span]:
    """
    Find all non-overlapping character positions of `value` in `text`.

    Searches case-sensitively first. If no matches are found, falls back
    to case-insensitive search.

    Args:
        text: Source text to search.
        value: The string to find.

    Returns:
        List of Span tuples (start, end), where start is included and end is excluded.
        Returns empty list if value is not found or empty.
    """
    if not text or not value:
        return []

    val = value.strip()
    if not val:
        return []

    val_len = len(val)
    spans: list[Span] = []

    # 1. Case-sensitive search first
    start = 0
    while True:
        idx = text.find(val, start)
        if idx == -1:
            break
        spans.append(Span(idx, idx + val_len))
        start = idx + val_len

    if spans:
        return spans

    # 2. Case-insensitive search fallback
    lower_text = text.lower()
    lower_val = val.lower()
    start = 0
    while True:
        idx = lower_text.find(lower_val, start)
        if idx == -1:
            break
        spans.append(Span(idx, idx + val_len))
        start = idx + val_len

    return spans


def json_to_facts(data: dict[str, Any], text: str) -> list[dict[str, Any]]:
    """
    Convert model extraction JSON to a list of fact dictionaries with character spans.

    Args:
        data: Dict containing keys for entities (e.g. people, places, dates, items).
        text: Original text to locate character spans within.

    Returns:
        List of facts: [{"kind": str, "text": str, "start": int, "end": int}]
    """
    if not text or not data or not isinstance(data, dict):
        return []

    category_mapping = [
        ("people", "person"),
        ("person", "person"),
        ("places", "place"),
        ("place", "place"),
        ("dates", "date"),
        ("date", "date"),
        ("items", "item"),
        ("item", "item"),
    ]

    facts: list[dict[str, Any]] = []
    seen_facts: set[tuple[str, int, int]] = set()
    processed_kinds: set[str] = set()

    for key, kind in category_mapping:
        if kind in processed_kinds and key != kind:
            continue
        items = data.get(key)
        if not items or not isinstance(items, list):
            continue

        processed_kinds.add(kind)
        seen_vals: set[str] = set()

        for item in items:
            if not isinstance(item, str):
                continue
            val = item.strip()
            if not val or val.lower() in seen_vals:
                continue
            seen_vals.add(val.lower())

            spans = find_spans(text, val)
            for span in spans:
                start = span.start
                end = span.end
                fact_key = (kind, start, end)
                if fact_key not in seen_facts:
                    seen_facts.add(fact_key)
                    matched_text = text[start:end]
                    facts.append({
                        "kind": kind,
                        "text": matched_text,
                        "start": start,
                        "end": end,
                    })

    # Sort facts deterministically by start position, then end position
    facts.sort(key=lambda f: (f["start"], f["end"], f["kind"]))
    return facts
