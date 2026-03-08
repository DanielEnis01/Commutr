import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from io import BytesIO

load_dotenv()

client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY"),
)

transcribed_text = None


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
    text_to_speech("Welcome to Commutr. How can I help you navigate campus today?")
