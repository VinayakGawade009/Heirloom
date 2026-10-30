"""Load 3 sample pages with canned results, so the frontend can be tested
against the real server before the model is merged.

    cd backend
    python -m app.seed            (adds the samples if the archive is empty)
    python -m app.seed --reset    (wipes the archive first)
"""
import sys
import textwrap
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

from . import service
from .db import init_db

# (writer, date, language hint, original text, words the "model" was unsure about,
#  translation, facts as (kind, text))
SAMPLES = [
    (
        "Rosa", "1952", "Spanish",
        "Querida Anita, la cosecha en la finca fue muy buena este a\u00f1o. "
        "Tu t\u00edo Miguel lleg\u00f3 el 12 de marzo de 1952 desde Guadalajara. Te mando un abrazo, Rosa.",
        ["Miguel"],
        "Dear Anita, the harvest on the farm was very good this year. "
        "Your uncle Miguel arrived on March 12, 1952 from Guadalajara. I send you a hug, Rosa.",
        [("person", "Anita"), ("person", "Miguel"), ("person", "Rosa"),
         ("place", "finca"), ("place", "Guadalajara"), ("date", "12 de marzo de 1952")],
    ),
    (
        "Grandmother Lucia", "1960s", "Spanish",
        "Receta de los pepinillos de la abuela: pepinos, sal, vinagre, ajo y eneldo. "
        "Dejar reposar ocho d\u00edas en un frasco de vidrio.",
        ["eneldo"],
        "Grandmother's pickle recipe: cucumbers, salt, vinegar, garlic and dill. "
        "Let it rest for eight days in a glass jar.",
        [("item", "pepinos"), ("item", "sal"), ("item", "vinagre"), ("item", "ajo"), ("item", "eneldo")],
    ),
    (
        "Juan", "3 October 1948", "Spanish",
        "Hoy llovi\u00f3 todo el d\u00eda en Oaxaca. Mi padre Juan repar\u00f3 el techo de la casa. "
        "3 de octubre de 1948.",
        [],
        "Today it rained all day in Oaxaca. My father Juan repaired the roof of the house. "
        "October 3, 1948.",
        [("place", "Oaxaca"), ("person", "Juan"), ("date", "3 de octubre de 1948")],
    ),
]


def _sample_image(text: str) -> bytes:
    """A plain paper-coloured page with the text on it, clearly marked as a sample."""
    img = Image.new("RGB", (900, 1100), (245, 238, 222))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=30)
        small = ImageFont.load_default(size=20)
    except TypeError:  # very old Pillow
        font = small = ImageFont.load_default()
    y = 80
    for line in textwrap.wrap(text, width=42):
        draw.text((60, y), line, fill=(60, 40, 25), font=font)
        y += 48
    draw.text((60, 1040), "SAMPLE PAGE (generated, not a real scan)", fill=(150, 120, 90), font=small)
    out = BytesIO()
    img.save(out, "PNG")
    return out.getvalue()


def _span(text: str, word: str) -> dict:
    start = text.find(word)
    if start < 0:
        raise ValueError("%r not found in sample text" % word)
    return {"start": start, "end": start + len(word)}


def run() -> None:
    for writer, date, hint, text, unsure, translation, facts in SAMPLES:
        service.add_finished_page(
            data=_sample_image(text),
            writer=writer,
            approx_date=date,
            language_hint=hint,
            text=text,
            uncertain=[_span(text, w) for w in unsure],
            language="English",
            translation=translation,
            facts=[dict(kind=k, text=w, **_span(text, w)) for k, w in facts],
        )


def main() -> None:
    init_db()
    if "--reset" in sys.argv:
        service.reset_all()
    elif service.list_pages(""):
        print("The archive already has pages. Run with --reset to wipe it and load the samples again.")
        return
    run()
    print("Loaded %d sample pages." % len(SAMPLES))


if __name__ == "__main__":
    main()
