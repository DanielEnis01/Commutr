import datetime
from flask import Blueprint, jsonify, request
from model.formula import compute_lot_pressure
from services.permits import filter_ranked_lots_for_permit
from services.predictions import build_calibrated_ranked_lots, build_local_tts_summary

predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.route("/api/ml/predict/all", methods=["POST"])
def predict_all():
    payload = request.get_json() or {}
    classes = payload.get("classes", {})
    weather_multiplier = payload.get("weather_multiplier", 1.0)
    permit_id = payload.get("permit_id")
    meta = payload.get("meta", {})
    request_id = meta.get("request_id", "unknown")
    request_source = meta.get("request_source", "unknown")
    requested_timestamp = meta.get("requested_timestamp")
    campus_query_time = meta.get("campus_query_time")

    print(
        f"[ML Service][{request_id}] source={request_source} "
        f"requested_timestamp={requested_timestamp or 'now'} "
        f"campus_time={campus_query_time or 'unknown'} "
        f"active={len(classes.get('currently_active', []))} "
        f"starting={len(classes.get('starting_soon', []))} "
        f"ended={len(classes.get('recently_ended', []))}"
    )
    
    formula_output = compute_lot_pressure(
        classes.get("starting_soon", []), 
        classes.get("currently_active", []), 
        classes.get("recently_ended", []), 
        weather_multiplier
    )
    
    ranked = build_calibrated_ranked_lots(formula_output)
    ranked = filter_ranked_lots_for_permit(ranked, permit_id)

    response = {
        "timestamp": datetime.datetime.now().isoformat(),
        "weather_multiplier": weather_multiplier,
        "weather": payload.get("weather"),
        "summary": formula_output.get("summary", {}),
        "permit_id": permit_id,
        "request_meta": {
            "request_id": request_id,
            "request_source": request_source,
            "requested_timestamp": requested_timestamp,
            "campus_query_time": campus_query_time,
            "gemini_cache_hit": False,
        },
    }

    response["ranked_lots"] = ranked
    response["tts_summary"] = build_local_tts_summary(ranked)
    
    return jsonify(response)
