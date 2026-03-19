import os
import tempfile
import wave
from functools import lru_cache
from io import BytesIO

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

transcribed_text = None

SAMPLE_RATE = 44100
CHANNELS = 1
SILENCE_THRESHOLD = 500
SILENCE_DURATION = 1.5
CHUNK_SIZE = 1024
DEFAULT_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "gScUm0AQVZBQ1uUp8KvE")


def get_client():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured")
    return ElevenLabs(api_key=api_key)


def record_audio():
    import numpy as np
    import sounddevice as sd

    frames = []
    silent_chunks = 0
    has_speech = False
    chunks_for_silence = int(SILENCE_DURATION * SAMPLE_RATE / CHUNK_SIZE)

    stream = sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        blocksize=CHUNK_SIZE,
    )
    stream.start()

    while True:
        data, _ = stream.read(CHUNK_SIZE)
        frames.append(data.copy())
        volume = np.abs(data).mean()

        if volume > SILENCE_THRESHOLD:
            has_speech = True
            silent_chunks = 0
        elif has_speech:
            silent_chunks += 1
            if silent_chunks >= chunks_for_silence:
                break

    stream.stop()
    stream.close()

    audio = np.concatenate(frames)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())

    return tmp.name


def speech_to_text(audio_data):
    global transcribed_text

    if isinstance(audio_data, str):
        with open(audio_data, "rb") as file_handle:
            audio_data = BytesIO(file_handle.read())

    transcription = get_client().speech_to_text.convert(
        file=audio_data,
        model_id="scribe_v1",
        language_code="eng",
    )

    transcribed_text = transcription.text
    return transcribed_text


def record_and_transcribe():
    audio_path = record_audio()
    result = speech_to_text(audio_path)
    os.unlink(audio_path)
    return result


@lru_cache(maxsize=128)
def _cached_tts_bytes(text, voice_id):
    audio = get_client().text_to_speech.convert(
        voice_id=voice_id,
        text=text,
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    return b"".join(audio)


def synthesize_speech_bytes(text, voice_id=DEFAULT_VOICE_ID):
    normalized_text = (text or "").strip()
    if not normalized_text:
        raise RuntimeError("Text-to-speech input is empty")

    return _cached_tts_bytes(normalized_text, voice_id)


def get_transcribed_text():
    return transcribed_text
