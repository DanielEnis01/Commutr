import os
import traceback
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


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "service": "ml"})


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    print("[ML Service] Unhandled exception:", flush=True)
    traceback.print_exc()
    return jsonify({
        "error": "Internal ML service error",
        "detail": str(error),
        "error_type": type(error).__name__,
    }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("ML_PORT", 5002)))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    print(f"[ML Service] Starting on 0.0.0.0:{port} debug={debug}", flush=True)
    app.run(host="0.0.0.0", port=port, debug=debug)
