import datetime
import hashlib
import json
import time
from flask import Blueprint, jsonify, request
from model.formula import compute_lot_pressure
from model.gemini import get_parking_recommendation
from services.permits import filter_ranked_lots_for_permit
from services.predictions import build_calibrated_ranked_lots, build_local_tts_summary

predictions_bp = Blueprint("predictions", __name__)
CACHE_TTL = 300
_gemini_cache = {"hash": None, "result": None, "expires_at": 0}


def _hash_formula(formula_output):
    """Create a stable hash of formula output to use as cache key."""
    raw = json.dumps(formula_output, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


def _get_gemini_cached(formula_output):
    """Return cached Gemini result or call the API if stale/miss."""
    h = _hash_formula(formula_output)
    now = time.time()

    if _gemini_cache["hash"] == h and now < _gemini_cache["expires_at"]:
        print(f"[CACHE HIT] Serving cached Gemini response (expires in {int(_gemini_cache['expires_at'] - now)}s)")
        return _gemini_cache["result"], True

    print("[CACHE MISS] Calling Gemini API...")
    result = get_parking_recommendation(formula_output)

    if "error" not in result or result.get("ranked_lots"):
        _gemini_cache["hash"] = h
        _gemini_cache["result"] = result
        _gemini_cache["expires_at"] = now + CACHE_TTL

    return result, False


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
    
    gemini_output, cache_hit = _get_gemini_cached(formula_output)
    
    ranked = build_calibrated_ranked_lots(formula_output)
    ranked = filter_ranked_lots_for_permit(ranked, permit_id)

    gemini_ranked = gemini_output.get("ranked_lots", [])
    gemini_reasons = {
        lot.get("lot"): lot.get("reason")
        for lot in gemini_ranked
        if lot.get("lot")
    }
    ranked = [
        {
            **lot,
            "reason": gemini_reasons.get(lot["lot"]) or lot.get("reason"),
        }
        for lot in ranked
    ]

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
            "gemini_cache_hit": cache_hit,
        },
    }
    
    if "error" in gemini_output:
        response["error"] = gemini_output["error"]
        response["raw_text"] = gemini_output.get("raw_text", "")
    
    response["ranked_lots"] = ranked
    response["tts_summary"] = gemini_output.get("tts_summary") or build_local_tts_summary(ranked)
    
    return jsonify(response)
