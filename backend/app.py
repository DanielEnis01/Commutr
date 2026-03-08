import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from routes.predictions import predictions_bp

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

app.register_blueprint(predictions_bp, url_prefix="/api")


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app.run(debug=True, port=port)
