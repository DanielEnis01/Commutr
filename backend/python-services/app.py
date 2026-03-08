import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

from model.predict import predict_occupancy

load_dotenv()

app = Flask(__name__)


@app.route("/predict", methods=["POST"])
def predict():
    """Receive lot data, return occupancy prediction."""
    data = request.get_json() or {}
    result = predict_occupancy(data)
    return jsonify({"prediction": result})


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "ml"})


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", 5002))
    app.run(debug=True, port=port)
