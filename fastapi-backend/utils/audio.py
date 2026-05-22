"""Audio utility functions — format conversion for Whisper."""

import os
import tempfile
import subprocess
import logging

logger = logging.getLogger(__name__)


def convert_to_wav(input_path: str, sample_rate: int = 16000) -> str:
    """
    Convert any audio file to 16kHz mono WAV using ffmpeg.
    Returns path to the converted WAV file.
    Caller is responsible for cleaning up the returned file.
    """
    out_fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(out_fd)

    cmd = [
        "ffmpeg",
        "-y",               # overwrite output
        "-i", input_path,
        "-ar", str(sample_rate),
        "-ac", "1",         # mono
        "-f", "wav",
        out_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"ffmpeg conversion failed:\n{result.stderr.decode()}"
            )
        return out_path
    except FileNotFoundError:
        raise RuntimeError(
            "ffmpeg not found. Install it: "
            "https://ffmpeg.org/download.html  |  "
            "Ubuntu: apt install ffmpeg  |  Mac: brew install ffmpeg"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("ffmpeg timed out during audio conversion.")


def get_audio_duration(path: str) -> float:
    """Return audio duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=10)
        return float(result.stdout.decode().strip())
    except Exception:
        return 0.0
