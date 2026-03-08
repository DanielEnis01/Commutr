import os
import wave
import tempfile
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from io import BytesIO
import sounddevice as sd
import numpy as np

load_dotenv()

client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

transcribed_text = None

SAMPLE_RATE = 44100
CHANNELS = 1
SILENCE_THRESHOLD = 500
SILENCE_DURATION = 1.5
CHUNK_SIZE = 1024


def record_audio():
    print("Listening... (speak now, recording stops when you pause)")
    frames = []
    silent_chunks = 0
    has_speech = False
    chunks_for_silence = int(SILENCE_DURATION * SAMPLE_RATE / CHUNK_SIZE)

    stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="int16", blocksize=CHUNK_SIZE)
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
    print("Recording complete.")

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
        with open(audio_data, "rb") as f:
            audio_data = BytesIO(f.read())

    transcription = client.speech_to_text.convert(
        file=audio_data,
        model_id="scribe_v2",
        language_code="eng",
    )

    transcribed_text = transcription.text
    return transcribed_text


def record_and_transcribe():
    audio_path = record_audio()
    result = speech_to_text(audio_path)
    os.unlink(audio_path)
    return result


def text_to_speech(text):
    audio = client.text_to_speech.convert(
        text=text,
        voice_id="gScUm0AQVZBQ1uUp8KvE",
        model_id="eleven_multilingual_v2",
        output_format="mp3_44100_128",
    )
    play(audio)


def get_transcribed_text():
    return transcribed_text


if __name__ == "__main__":
    text_to_speech("Which building would you like to go to?")
    result = record_and_transcribe()
    print(f"You said: {result}")
