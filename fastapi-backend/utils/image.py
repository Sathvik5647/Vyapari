"""Image utility functions — preprocessing for CLIP."""

import io
from PIL import Image


def preprocess_image(data: bytes, max_size: int = 512) -> Image.Image:
    """
    Load image from bytes and resize to max_size × max_size (keeping aspect ratio).
    CLIP input size is 224×224 — processor handles final resize, but
    we pre-resize large images to save memory.
    """
    img = Image.open(io.BytesIO(data)).convert("RGB")

    # Downscale if larger than max_size
    w, h = img.size
    if max(w, h) > max_size:
        scale = max_size / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    return img


def image_to_bytes(img: Image.Image, fmt: str = "JPEG", quality: int = 85) -> bytes:
    """Serialize a PIL Image to bytes."""
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=quality)
    return buf.getvalue()
