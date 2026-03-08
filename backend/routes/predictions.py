from flask import Blueprint, jsonify

predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.route("/predict/all")
def predict_all():
    return jsonify({"lots": []})


@predictions_bp.route("/predict/lot/<lot_name>")
def predict_lot(lot_name):
    return jsonify({"lot": lot_name})


@predictions_bp.route("/predict/timeline/<lot_name>")
def predict_timeline(lot_name):
    return jsonify({"lot": lot_name, "timeline": []})
