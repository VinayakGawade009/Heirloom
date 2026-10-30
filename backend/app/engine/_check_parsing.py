"""Self-check asserts for parse_uncertain and trim_repetition."""

try:
    from .parsing import parse_uncertain, trim_repetition
except ImportError:
    from app.engine.parsing import parse_uncertain, trim_repetition


def check_spans_match(clean_text: str, spans: list[dict[str, int]], expected_words: list[str]) -> None:
    assert len(spans) == len(expected_words), f"Expected {len(expected_words)} spans, got {len(spans)}"
    prev_end = 0
    for span, word in zip(spans, expected_words):
        start = span["start"]
        end = span["end"]
        # Check span bounds: never negative, never exceed len(clean_text)
        assert 0 <= start < end <= len(clean_text), f"Span bounds invalid: {span} for len {len(clean_text)}"
        # Check never overlap
        assert start >= prev_end, f"Overlap detected: start {start} < prev_end {prev_end}"
        # For every span check that clean_text[start:end] equals the marked word
        extracted = clean_text[start:end]
        assert extracted == word, f"Expected clean_text[{start}:{end}] == '{word}', got '{extracted}'"
        prev_end = end


def test_no_markers():
    text = "Transcribed text without any uncertainty markers."
    clean, spans = parse_uncertain(text)
    assert clean == text, f"Expected '{text}', got '{clean}'"
    check_spans_match(clean, spans, [])


def test_one_marker():
    text = "The [?quick?] brown fox jumps."
    clean, spans = parse_uncertain(text)
    assert clean == "The quick brown fox jumps.", f"Got '{clean}'"
    check_spans_match(clean, spans, ["quick"])


def test_two_markers():
    text = "The [?quick?] brown [?fox?] jumps over the lazy dog."
    clean, spans = parse_uncertain(text)
    assert clean == "The quick brown fox jumps over the lazy dog.", f"Got '{clean}'"
    check_spans_match(clean, spans, ["quick", "fox"])


def test_multi_word_marker():
    text = "Meeting set for [?late November afternoon?] at tea time."
    clean, spans = parse_uncertain(text)
    assert clean == "Meeting set for late November afternoon at tea time.", f"Got '{clean}'"
    check_spans_match(clean, spans, ["late November afternoon"])


def test_empty_marker():
    text = "There is an illegible [??] word in this sentence."
    clean, spans = parse_uncertain(text)
    # Empty marker [??] keeps no text and adds no span
    assert clean == "There is an illegible  word in this sentence.", f"Got '{clean}'"
    check_spans_match(clean, spans, [])


def test_stray_markers():
    # Stray opening [?
    text_open = "Here is a stray [? opening bracket without closing."
    clean_open, spans_open = parse_uncertain(text_open)
    assert "[?" not in clean_open
    check_spans_match(clean_open, spans_open, [])

    # Stray closing ?]
    text_close = "Here is a stray ?] closing bracket without opening."
    clean_close, spans_close = parse_uncertain(text_close)
    assert "?]" not in clean_close
    check_spans_match(clean_close, spans_close, [])

    # Stray [? before a valid marker
    text_before = "Stray [? before and [?valid?] word."
    clean_before, spans_before = parse_uncertain(text_before)
    assert "[?" not in clean_before
    check_spans_match(clean_before, spans_before, ["valid"])

    # Stray ?] after a valid marker
    text_after = "Valid [?word?] followed by stray ?] marker."
    clean_after, spans_after = parse_uncertain(text_after)
    assert "?]" not in clean_after
    check_spans_match(clean_after, spans_after, ["word"])


def test_code_fences():
    text = "```markdown\nA page with [?fenced?] text.\n```"
    clean, spans = parse_uncertain(text)
    assert "```" not in clean
    check_spans_match(clean, spans, ["fenced"])


def test_trim_repetition_repeated_line_run():
    # Run of 4 identical lines -> keep first one
    text = "First line\nRepeating line\nRepeating line\nRepeating line\nRepeating line\nLast line"
    expected = "First line\nRepeating line\nLast line"
    assert trim_repetition(text) == expected, f"Got: {trim_repetition(text)!r}"

    # Near-identical ignoring whitespace -> keep first one
    text_ws = "First line\nRepeating line \n  Repeating line\nRepeating line\nLast line"
    expected_ws = "First line\nRepeating line \nLast line"
    assert trim_repetition(text_ws) == expected_ws, f"Got: {trim_repetition(text_ws)!r}"


def test_trim_repetition_two_identical_lines():
    # Normal text with two identical lines must stay
    text = "Intro paragraph\nRepeated line\nRepeated line\nOutro paragraph"
    assert trim_repetition(text) == text, f"Got: {trim_repetition(text)!r}"


def test_trim_repetition_trailing_digit_lines():
    # Trailing lines made only of digits, spaces, and x / multiplication sign after last letter line
    text = (
        "Letter from Mumbai in Marathi\n"
        "1234567890\n"
        "98765 43210\n"
        "100 x 200\n"
        "300 × 400"
    )
    expected = "Letter from Mumbai in Marathi"
    assert trim_repetition(text) == expected, f"Got: {trim_repetition(text)!r}"

    # Trailing looping digits
    text_loop = (
        "Document body\n"
        "99999\n"
        "99999\n"
        "99999\n"
        "99999"
    )
    assert trim_repetition(text_loop) == "Document body", f"Got: {trim_repetition(text_loop)!r}"

    # Digits before the last letter line must stay
    text_mid = "Invoice number 12345\n99999\nThank you for business"
    assert trim_repetition(text_mid) == text_mid, f"Got: {trim_repetition(text_mid)!r}"


def test_trim_repetition_no_problems():
    # Text with no problems remains unchanged
    text = "Paragraph 1 with text.\nParagraph 2 with 123 digits.\nParagraph 3."
    assert trim_repetition(text) == text, f"Got: {trim_repetition(text)!r}"


def run_all_checks():
    test_no_markers()
    test_one_marker()
    test_two_markers()
    test_multi_word_marker()
    test_empty_marker()
    test_stray_markers()
    test_code_fences()
    test_trim_repetition_repeated_line_run()
    test_trim_repetition_two_identical_lines()
    test_trim_repetition_trailing_digit_lines()
    test_trim_repetition_no_problems()
    print("ALL 11 PARSING AND REPETITION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_all_checks()
