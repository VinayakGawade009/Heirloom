"""Image processing utilities for Heirloom engine."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageOps

from .errors import EngineError, MODEL_FAILED


def prepare_image(path: str | Path, max_side: int = 1280) -> bytes:
    """
    Open an image, correct EXIF orientation, convert to RGB, resize if needed,
    and return JPEG bytes (quality 90).

    Args:
        path: Path to the image file.
        max_side: Maximum length of the longest side (never enlarges).

    Returns:
        JPEG image bytes.

    Raises:
        EngineError(model_failed): If the file is missing or not a valid image.
    """
    path_obj = Path(path)
    if not path_obj.is_file():
        raise EngineError(MODEL_FAILED, f"Image file not found: {path}")

    try:
        with Image.open(path_obj) as img:
            # Fix EXIF orientation if present
            img = ImageOps.exif_transpose(img)

            # Convert to RGB (handles RGBA, grayscale, CMYK, etc.)
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Shrink if longest side exceeds max_side (never enlarge)
            width, height = img.size
            longest = max(width, height)
            if longest > max_side:
                scale = max_side / longest
                new_width = max(1, int(round(width * scale)))
                new_height = max(1, int(round(height * scale)))
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # Return JPEG bytes from memory
            out_buffer = io.BytesIO()
            img.save(out_buffer, format="JPEG", quality=90)
            return out_buffer.getvalue()
    except EngineError:
        raise
    except Exception as e:
        raise EngineError(MODEL_FAILED, f"Failed to process image '{path}': {e}") from e
