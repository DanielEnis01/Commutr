import datetime
import hashlib
import json
import time
from flask import Blueprint, jsonify, request
from model.formula import compute_lot_pressure
from model.gemini import get_parking_recommendation

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


def _fallback_ranked_lots(formula_output):
    """Build ranked_lots directly from the formula scores when Gemini is unavailable."""
    scores = formula_output.get("lot_scores", {})
    ranked = sorted(scores.items(), key=lambda x: x[1]["pressure"])
    lots = []
    for i, (lot, data) in enumerate(ranked):
        pct = int(data["pressure"] * 100)
        status = "available" if pct < 40 else ("moderate" if pct <= 70 else "full")
        lots.append({
            "lot": lot,
            "predicted_occupancy_pct": pct,
            "status": status,
            "recommended": i == 0,
            "reason": f"Lowest pressure score ({pct}% predicted occupancy)" if i == 0 else None
        })
    return lots

@predictions_bp.route("/api/ml/predict/all", methods=["POST"])
def predict_all():
    payload = request.get_json() or {}
    classes = payload.get("classes", {})
    weather_multiplier = payload.get("weather_multiplier", 1.0)
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
    
    response = {
        "timestamp": datetime.datetime.now().isoformat(),
        "weather_multiplier": weather_multiplier,
        "weather": payload.get("weather"),
        "summary": formula_output.get("summary", {}),
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
    
    ranked = gemini_output.get("ranked_lots", [])
    if not ranked:
        ranked = _fallback_ranked_lots(formula_output)
        
    response["ranked_lots"] = ranked
    response["tts_summary"] = gemini_output.get("tts_summary", "Predictions are based on campus activity data. Gemini AI is currently unavailable.")
    
    return jsonify(response)
