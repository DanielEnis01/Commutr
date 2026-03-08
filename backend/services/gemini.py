import os
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def ask_gemini(prompt, model="gemini-3-flash-preview"):
    """Send a prompt to Gemini and return the text response."""
    response = client.models.generate_content(model=model, contents=prompt)
    return response.text


if __name__ == "__main__":
    # Quick test — run with: python -m services.gemini
    from dotenv import load_dotenv
    load_dotenv()
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    print(ask_gemini("Explain how AI works in a few words"))
