# ALL prompts live here.

TRANSCRIBE_PROMPT = (
    "Transcribe the handwriting in this image exactly as written, character for character.\n"
    "- Do not guess words you cannot read.\n"
    "- Do not correct spelling or grammar, and do not tidy or modernise the text.\n"
    "- Preserve line breaks exactly as they appear in the original document.\n"
    "- Wrap any word or phrase you cannot read confidently in question mark brackets: [?word?] "
    "(put your best guess inside the markers, or use [??] if you have no guess at all).\n"
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
