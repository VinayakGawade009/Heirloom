"""CLI runner for Heirloom engine pipeline (transcribe -> translate -> extract)."""

from __future__ import annotations

import argparse
import sys
import time

try:
    from .errors import EngineError
    from .extract import extract
    from .transcribe import transcribe
    from .translate import translate
except ImportError:
    from app.engine.errors import EngineError
    from app.engine.extract import extract
    from app.engine.transcribe import transcribe
    from app.engine.translate import translate


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Heirloom engine pipeline (transcribe -> translate -> extract) on a page image."
    )
    parser.add_argument("image_path", help="Path to the page image file")
    parser.add_argument(
        "--model",
        default="gemma4:e2b",
        help="Ollama model tag to use (default: gemma4:e2b)",
    )
    parser.add_argument(
        "--language",
        default="English",
        help="Target language for translation (default: English)",
    )
    parser.add_argument(
        "--hint",
        default=None,
        help="Optional language hint for the page",
    )

    args = parser.parse_args()

    try:
        t_start = time.perf_counter()

        # 1. Transcribe
        t0 = time.perf_counter()
        transcribe_res = transcribe(
            image_path=args.image_path,
            model=args.model,
            language_hint=args.hint,
        )
        t_transcribe = time.perf_counter() - t0

        transcript_text = transcribe_res.get("text", "")
        uncertain_spans = transcribe_res.get("uncertain", [])

        # 2. Translate
        t0 = time.perf_counter()
        translation_text = translate(
            text=transcript_text,
            target_language=args.language,
            model=args.model,
        )
        t_translate = time.perf_counter() - t0

        # 3. Extract facts
        t0 = time.perf_counter()
        facts = extract(
            text=transcript_text,
            model=args.model,
        )
        t_extract = time.perf_counter() - t0

        t_total = time.perf_counter() - t_start

        # Print labelled sections
        print("=== TRANSCRIPT ===")
        print(transcript_text)
        print()

        print("=== UNSURE SPANS ===")
        if uncertain_spans:
            for span in uncertain_spans:
                start = span["start"]
                end = span["end"]
                covered = transcript_text[start:end]
                print(f"[{start}:{end}] {covered!r}")
        else:
            print("(None)")
        print()

        print("=== TRANSLATION ===")
        print(translation_text)
        print()

        print("=== FACTS ===")
        if facts:
            for fact in facts:
                kind = fact.get("kind", "")
                text = fact.get("text", "")
                start = fact.get("start", 0)
                end = fact.get("end", 0)
                print(f"- [{kind}] {text!r} (start={start}, end={end})")
        else:
            print("(None)")
        print()

        print("=== TIMINGS ===")
        print(f"Transcribe : {t_transcribe:.2f}s")
        print(f"Translate  : {t_translate:.2f}s")
        print(f"Extract    : {t_extract:.2f}s")
        print(f"Total      : {t_total:.2f}s")

    except EngineError as e:
        print(f"Engine Error ({e.code}): {e.message}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
