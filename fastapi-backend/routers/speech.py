"""
Speech router — POST /speech/transcribe
Uses faster-whisper (CTranslate2 backend) for audio → text transcription.
Supports English and Hindi natively.
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from models.whisper_model import get_whisper_model
from utils.audio import convert_to_wav

router = APIRouter()


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration_seconds: float


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, M4A, OGG)"),
    language: str = "en",   # 'en' or 'hi' (Hindi)
):
    """
    Transcribe audio to text using Whisper.

    - Accepts WAV, MP3, M4A, OGG
    - Returns transcribed text + detected language
    - Used by both: buyer voice search & vendor voice product add
    """
    allowed = {".wav", ".mp3", ".m4a", ".ogg", ".webm"}
    ext = os.path.splitext(audio.filename or "audio.wav")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported audio format: {ext}. Use: {allowed}")

    # Save upload to a temp file
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Convert to WAV if needed (Whisper works best with WAV/16kHz)
        wav_path = convert_to_wav(tmp_path) if ext != ".wav" else tmp_path

        # Run faster-whisper inference
        model = get_whisper_model()
        segments, info = model.transcribe(
            wav_path,
            language=language if language in ("en", "hi") else None,
            beam_size=5,
            vad_filter=True,          # Remove silence
            vad_parameters={"min_silence_duration_ms": 500},
        )

        text = " ".join(seg.text.strip() for seg in segments).strip()
        return TranscribeResponse(
            text=text,
            language=info.language,
            duration_seconds=round(info.duration, 2),
        )
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)}")
    finally:
        os.unlink(tmp_path)
        if "wav_path" in locals() and wav_path != tmp_path:
            try:
                os.unlink(wav_path)
            except Exception:
                pass
