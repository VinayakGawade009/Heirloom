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


def is_valid_fact_text(val: str) -> bool:
    """
    Check if a fact's text value passes filtering rules.

    Rules:
    - Drop any value shorter than 2 characters.
    - Drop any value that contains no letters and no digits.
    - Drop any value that is digits only (any script, including Devanagari)
      and shorter than 4 characters.
    """
    v = val.strip()
    if len(v) < 2:
        return False
    if not any(c.isalpha() or c.isdigit() for c in v):
        return False
    no_ws = "".join(v.split())
    if all(c.isdigit() for c in no_ws) and len(no_ws) < 4:
        return False
    return True


def clean_facts(facts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Filter and clean a list of facts:

    1. Drop values that are digits only (< 4 chars) or shorter than 2 chars.
    2. Drop values with no letters and no digits.
    3. Remove overlaps: when two facts overlap or one is inside another,
       keep the longer one and drop the shorter. Ties keep the earlier one.
    4. Cap each distinct value at 5 occurrences (keep the first 5).
    5. Return the final list sorted by start position.
    """
    if not facts:
        return []

    # 1 & 2. Filter out invalid values
    valid: list[dict[str, Any]] = []
    for f in facts:
        text_val = f.get("text", "")
        start = f.get("start", 0)
        end = f.get("end", 0)
        if not isinstance(text_val, str) or start < 0 or end <= start:
            continue
        if is_valid_fact_text(text_val):
            valid.append(dict(f))

    if not valid:
        return []

    # 3. Remove overlaps: keep longer, ties keep earlier
    indexed_candidates = list(enumerate(valid))
    indexed_candidates.sort(
        key=lambda item: (
            -(item[1]["end"] - item[1]["start"]),
            item[1]["start"],
            item[0],
        )
    )

    accepted: list[dict[str, Any]] = []
    for _, candidate in indexed_candidates:
        c_start = candidate["start"]
        c_end = candidate["end"]
        overlaps = False
        for acc in accepted:
            a_start = acc["start"]
            a_end = acc["end"]
            if max(c_start, a_start) < min(c_end, a_end):
                overlaps = True
                break
        if not overlaps:
            accepted.append(candidate)

    # Sort final accepted by start position
    accepted.sort(key=lambda f: (f["start"], f["end"]))

    # 4. Cap each distinct value at 5 occurrences (keep the first 5)
    final_facts: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    for f in accepted:
        key = f["text"].strip().lower()
        cnt = counts.get(key, 0)
        if cnt < 5:
            counts[key] = cnt + 1
            final_facts.append(f)

    return final_facts


def json_to_facts(data: dict[str, Any], text: str) -> list[dict[str, Any]]:
    """
    Convert model extraction JSON to a list of fact dictionaries with character spans.

    Args:
        data: Dict containing keys for entities (e.g. people, places, dates, items).
        text: Original text to locate character spans within.

    Returns:
        Cleaned, non-overlapping list of facts sorted by start position.
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
            if not val or not is_valid_fact_text(val) or val.lower() in seen_vals:
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

    # Apply cleaning (overlap removal, capping at 5 occurrences, sorting)
    return clean_facts(facts)
