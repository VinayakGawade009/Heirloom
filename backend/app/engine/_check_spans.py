"""Plain assert tests for find_spans, json_to_facts, and clean_facts."""

try:
    from .spans import clean_facts, find_spans, json_to_facts
except ImportError:
    from app.engine.spans import clean_facts, find_spans, json_to_facts


def test_find_spans_found_once():
    text = "Doctor Watson visited London on Tuesday."
    value = "London"
    spans = find_spans(text, value)
    assert len(spans) == 1, f"Expected 1 span, got {len(spans)}"
    start, end = spans[0]
    assert (start, end) == (22, 28)
    assert text[start:end] == value


def test_find_spans_found_twice():
    text = "Paris in the spring and Paris in the autumn."
    value = "Paris"
    spans = find_spans(text, value)
    assert len(spans) == 2, f"Expected 2 spans, got {len(spans)}"
    assert spans[0] == (0, 5)
    assert spans[1] == (24, 29)
    for s in spans:
        start, end = s
        assert text[start:end] == value


def test_find_spans_not_found():
    text = "Doctor Watson visited London on Tuesday."
    value = "Berlin"
    spans = find_spans(text, value)
    assert spans == [], f"Expected [], got {spans}"


def test_find_spans_different_case():
    text = "The doctor visited london yesterday."
    value = "London"
    spans = find_spans(text, value)
    assert len(spans) == 1, f"Expected 1 span, got {len(spans)}"
    start, end = spans[0]
    assert (start, end) == (19, 25)
    assert text[start:end] == "london"
    assert text[start:end].lower() == value.lower()


def test_single_digits_dropped():
    # Single digits (ASCII and Devanagari) and short digits-only (< 4 chars) dropped
    text = "Count is 4 items, page ४५ with ५ markers and 123 notes."
    raw_json = {
        "dates": ["4", "५"],           # Single digits: dropped
        "items": ["४५", "123"],        # 2-digit and 3-digit: dropped
        "places": ["--", "..."],       # No letters or digits: dropped
    }
    facts = json_to_facts(raw_json, text)
    assert facts == [], f"Expected empty facts list for short digits/symbols, got: {facts}"

    # Also test clean_facts directly
    dummy_facts = [
        {"kind": "date", "text": "4", "start": 9, "end": 10},
        {"kind": "date", "text": "५", "start": 30, "end": 31},
        {"kind": "item", "text": "४५", "start": 23, "end": 25},
        {"kind": "item", "text": "123", "start": 44, "end": 47},
    ]
    cleaned = clean_facts(dummy_facts)
    assert cleaned == [], f"Expected clean_facts to drop short digits, got {cleaned}"


def test_four_digit_year_kept():
    # 4-digit years in Latin and Devanagari kept
    text = "Published in 1952 and reprinted in २०२६."
    raw_json = {
        "dates": ["1952", "२०२६"],
    }
    facts = json_to_facts(raw_json, text)
    assert len(facts) == 2, f"Expected 2 year facts, got {len(facts)}"
    assert facts[0]["text"] == "1952"
    assert text[facts[0]["start"]:facts[0]["end"]] == "1952"
    assert facts[1]["text"] == "२०२६"
    assert text[facts[1]["start"]:facts[1]["end"]] == "२०२६"


def test_nested_spans_keep_longer():
    # When one span is inside another, keep the longer one and drop the shorter
    text = "Doctor Watson arrived today."
    # "Watson" (start 7, end 13, len 6) is inside "Doctor Watson" (start 0, end 13, len 13)
    candidate_facts = [
        {"kind": "person", "text": "Watson", "start": 7, "end": 13},
        {"kind": "person", "text": "Doctor Watson", "start": 0, "end": 13},
    ]
    cleaned = clean_facts(candidate_facts)
    assert len(cleaned) == 1, f"Expected 1 fact, got {len(cleaned)}"
    assert cleaned[0]["text"] == "Doctor Watson"
    assert cleaned[0]["start"] == 0 and cleaned[0]["end"] == 13
    assert text[cleaned[0]["start"]:cleaned[0]["end"]] == "Doctor Watson"


def test_partly_overlapping_spans_keep_longer():
    # When spans partly overlap, keep the longer one
    text = "Meeting in North London today."
    # "London" (len 6: 17..23) vs "North London" (len 12: 11..23)
    candidate_facts = [
        {"kind": "place", "text": "London", "start": 17, "end": 23},         # length 6
        {"kind": "place", "text": "North London", "start": 11, "end": 23},   # length 12 (longer)
    ]
    cleaned = clean_facts(candidate_facts)
    assert len(cleaned) == 1, f"Expected 1 fact, got {len(cleaned)}"
    assert cleaned[0]["text"] == "North London"
    assert text[cleaned[0]["start"]:cleaned[0]["end"]] == "North London"

    # Partly overlapping spans: "Great Britain" (start 0, end 13, len 13) vs "Britain rule" (start 6, end 18, len 12)
    text_overlap = "Great Britain rule the seas."
    overlapping_facts = [
        {"kind": "place", "text": "Britain rule", "start": 6, "end": 18},    # len 12
        {"kind": "place", "text": "Great Britain", "start": 0, "end": 13},   # len 13 (longer)
    ]
    cleaned_overlap = clean_facts(overlapping_facts)
    assert len(cleaned_overlap) == 1
    assert cleaned_overlap[0]["text"] == "Great Britain"
    assert text_overlap[cleaned_overlap[0]["start"]:cleaned_overlap[0]["end"]] == "Great Britain"


def test_value_repeated_8_times_capped_at_5():
    # Value repeated 8 times in text is capped at exactly 5 occurrences (first 5 kept)
    text = "Paris Paris Paris Paris Paris Paris Paris Paris"
    raw_json = {
        "places": ["Paris"],
    }
    facts = json_to_facts(raw_json, text)
    assert len(facts) == 5, f"Expected exactly 5 facts for 8 repeats, got {len(facts)}"
    for fact in facts:
        assert fact["text"] == "Paris"
        assert text[fact["start"]:fact["end"]] == "Paris"
    # Verify they are the first 5 occurrences
    expected_starts = [0, 6, 12, 18, 24]
    actual_starts = [f["start"] for f in facts]
    assert actual_starts == expected_starts, f"Expected starts {expected_starts}, got {actual_starts}"


def test_json_to_facts_conversion():
    text = (
        "Alice and Bob met in London on 12th May 1920. "
        "Alice carried a golden watch. Later, they returned to London together."
    )
    raw_json = {
        "people": ["Alice", "Bob", "Alice"],       # Found twice ("Alice") and once ("Bob"); duplicate "Alice" in JSON
        "places": ["London"],                      # Found twice in text
        "dates": ["12th May 1920", "1999"],       # Found once ("12th May 1920"); not found ("1999")
        "items": ["GOLDEN WATCH", "telescope"],    # Different case ("GOLDEN WATCH" -> "golden watch"); not found ("telescope")
    }

    facts = json_to_facts(raw_json, text)

    # Check that for every result, text[start:end] equals the fact's text
    for fact in facts:
        start = fact["start"]
        end = fact["end"]
        assert 0 <= start < end <= len(text), f"Invalid bounds: {fact}"
        assert text[start:end] == fact["text"], f"Mismatch: text[{start}:{end}] != {fact['text']}"
        assert fact["kind"] in ("person", "place", "date", "item")

    # 1. Value found once: Bob
    bob_facts = [f for f in facts if f["text"] == "Bob"]
    assert len(bob_facts) == 1, f"Expected 1 Bob fact, got {len(bob_facts)}"
    assert bob_facts[0]["kind"] == "person"
    assert text[bob_facts[0]["start"]:bob_facts[0]["end"]] == "Bob"

    # 2. Value found twice: Alice (2 occurrences in text)
    alice_facts = [f for f in facts if f["text"] == "Alice"]
    assert len(alice_facts) == 2, f"Expected 2 Alice facts, got {len(alice_facts)}"
    for f in alice_facts:
        assert f["kind"] == "person"
        assert text[f["start"]:f["end"]] == "Alice"
    assert alice_facts[0]["start"] != alice_facts[1]["start"]

    # Value found twice: London (2 occurrences in text)
    london_facts = [f for f in facts if f["text"] == "London"]
    assert len(london_facts) == 2, f"Expected 2 London facts, got {len(london_facts)}"
    for f in london_facts:
        assert f["kind"] == "place"
        assert text[f["start"]:f["end"]] == "London"
    assert london_facts[0]["start"] != london_facts[1]["start"]

    # 3. Value in different case: "GOLDEN WATCH" in JSON matches "golden watch" in text
    watch_facts = [f for f in facts if f["text"] == "golden watch"]
    assert len(watch_facts) == 1, f"Expected 1 watch fact, got {len(watch_facts)}"
    assert watch_facts[0]["kind"] == "item"
    assert text[watch_facts[0]["start"]:watch_facts[0]["end"]] == "golden watch"
    assert text[watch_facts[0]["start"]:watch_facts[0]["end"]].lower() == "GOLDEN WATCH".lower()

    # 4. Values not found in text are skipped: 1999 and telescope
    assert not any(f["text"] == "1999" for f in facts)
    assert not any(f["text"] == "telescope" for f in facts)


def run_all_checks():
    test_find_spans_found_once()
    test_find_spans_found_twice()
    test_find_spans_not_found()
    test_find_spans_different_case()
    test_single_digits_dropped()
    test_four_digit_year_kept()
    test_nested_spans_keep_longer()
    test_partly_overlapping_spans_keep_longer()
    test_value_repeated_8_times_capped_at_5()
    test_json_to_facts_conversion()
    print("ALL SPANS AND FACTS CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_all_checks()
