"""Plain assert tests for find_spans and json_to_facts."""

try:
    from .spans import find_spans, json_to_facts
except ImportError:
    from app.engine.spans import find_spans, json_to_facts


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
    test_json_to_facts_conversion()
    print("ALL SPANS AND FACTS CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_all_checks()
