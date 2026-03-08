import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from routes.predictions import predictions_bp

load_dotenv()

app = Flask(__name__)
CORS(app)
app.register_blueprint(predictions_bp)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "ml"})


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 5002))
    app.run(debug=True, port=port)
