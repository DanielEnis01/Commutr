import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from routes.predictions import predictions_bp
from routes.voice import voice_bp

load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_blueprint(predictions_bp)
app.register_blueprint(voice_bp)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "ml"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("ML_PORT", 5002)))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=port, debug=debug)
