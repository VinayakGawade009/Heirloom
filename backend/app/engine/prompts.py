# ALL prompts live here.

TRANSCRIBE_PROMPT = (
    "Transcribe the handwriting in this image exactly as written, character for character.\n"
    "- Guessing a word is worse than marking it. Mark any word or phrase you are less than fully sure about, not only words you cannot read at all.\n"
    "- If a word is not a real word in the page's language, mark it.\n"
    "- Do not translate; write each word in the language it is written in on the page.\n"
    "- Do not guess, do not correct spelling or grammar, and do not tidy or modernise the text.\n"
    "- Preserve line breaks exactly as they appear in the original document.\n"
    "- Wrap any uncertain word or phrase in question mark brackets: [?word?] "
    "(put your best guess inside the markers, or use [??] if you have no guess at all).\n"
    "  Format example only, it is not on the page: Dear [?Marta?], the harvest was [?poor?] this year.\n"
    "- Output ONLY the transcribed text. Do not include commentary, explanations, headings, notes, or markdown formatting."
)


def build_transcribe_prompt(language_hint: str | None = None) -> str:
    """
    Build the transcription prompt, optionally including a language hint.

    Args:
        language_hint: Optional language name (e.g. 'English', 'French').

    Returns:
        The formatted prompt string for the model.
    """
    if language_hint and language_hint.strip():
        return f"{TRANSCRIBE_PROMPT}\nNote: The page is written in {language_hint.strip()}."
    return TRANSCRIBE_PROMPT


TRANSLATE_PROMPT = (
    "Translate only the text given into the target language.\n"
    "- Keep names of people and places as written.\n"
    "- Output only the translation with no commentary or notes."
)


def build_translate_prompt(text: str, target_language: str) -> str:
    """
    Build prompt for translation into target language.

    Args:
        text: Source text to translate.
        target_language: Target language name (e.g. 'English').

    Returns:
        The formatted prompt string.
    """
    return (
        f"Translate the following text into {target_language.strip()}.\n"
        "- Translate only the text given into the target language.\n"
        "- Keep names of people and places as written.\n"
        "- Output only the translation with no commentary or notes.\n\n"
        f"{text}"
    )


EXTRACT_PROMPT = (
    "List the people, places, dates and items mentioned in the text.\n"
    'Return JSON only in the form {"people": [...], "places": [...], "dates": [...], "items": [...]}.\n'
    "- Copy each value exactly as it appears in the text.\n"
    "- Do not invent anything.\n"
    "- Do not give character positions."
)


def build_extract_prompt(text: str) -> str:
    """
    Build prompt for entity extraction.

    Args:
        text: Source text to extract entities from.

    Returns:
        The formatted prompt string.
    """
    return f"{EXTRACT_PROMPT}\n\nText:\n{text}"
