import base64
import datetime
import re

from flask import Blueprint, jsonify, request

from model.formula import AFFINITY, BUILDING_CODE_MAP, compute_lot_pressure
from model.gemini import get_parking_recommendation
from services.permits import filter_ranked_lots_for_permit
from services.predictions import build_calibrated_ranked_lots
from services.voice import speech_to_text, synthesize_speech_bytes

voice_bp = Blueprint("voice", __name__)

DESTINATION_ALIASES = {
    "Academic_Center": ["academic center", "ac"],
    "Administration": ["administration"],
    "Arts_and_Technology": ["arts and technology", "atc"],
    "Classroom_Building": ["classroom building"],
    "ECSN": ["ecs north", "engineering north", "engineering computer science north"],
    "ECSS": ["ecss", "ecs south", "engineering south", "engineering computer science south"],
    "ECSW": ["ecsw", "ecs west", "engineering west", "engineering computer science west"],
    "Founders": ["founders"],
    "Founders_North": ["founders north"],
    "Green_Hall": ["green hall"],
    "Hoblitzelle": ["hoblitzelle"],
    "Johnson": ["johnson"],
    "JSOM": ["jsom", "jindal"],
    "Lloyd_Berkner": ["lloyd berkner", "berkner", "ml2"],
    "McDermott": ["mcdermott", "som"],
    "Natural_Science_Research": ["natural science research", "nsr"],
    "North_Lab": ["north lab"],
    "Sciences": ["science", "sciences", "physics"],
    "Student_Union": ["student union", "su"],
    "SLC": ["slc", "student learning center"],
    "SSA": ["ssa", "social sciences addition"],
}

DESTINATION_DISPLAY = {
    "Academic_Center": "Academic Center",
    "Administration": "Administration",
    "Arts_and_Technology": "Arts and Technology",
    "Classroom_Building": "Classroom Building",
    "ECSN": "Engineering Computer Science North",
    "ECSS": "Engineering Computer Science South",
    "ECSW": "Engineering Computer Science West",
    "Founders": "Founders",
    "Founders_North": "Founders North",
    "Green_Hall": "Green Hall",
    "Hoblitzelle": "Hoblitzelle",
    "Johnson": "Johnson",
    "JSOM": "JSOM",
    "Lloyd_Berkner": "Lloyd Berkner",
    "McDermott": "McDermott",
    "Natural_Science_Research": "Natural Science Research",
    "North_Lab": "North Lab",
    "Sciences": "Sciences",
    "Student_Union": "Student Union",
    "SLC": "Student Learning Center",
    "SSA": "Social Sciences Addition",
}

CLARIFICATION_PHRASES = (
    "wherever",
    "anywhere",
    "closest lot",
    "best lot",
    "most open",
    "open parking",
    "parking spot",
    "find parking",
    "bring me parking",
)

CONFIRM_KEYWORDS = (
    "confirm",
    "confirmed",
    "affirmative",
    "yes",
    "yeah",
    "yep",
    "okay",
    "ok",
    "sounds good",
    "that is good",
    "thats good",
    "that's good",
    "that works",
    "go ahead",
    "start route",
    "begin route",
    "start navigation",
    "begin navigation",
    "lets go",
    "let's go",
    "do it",
)

CANCEL_KEYWORDS = (
    "cancel",
    "never mind",
    "nevermind",
    "stop",
)

MIME_EXTENSION_MAP = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/aac": ".aac",
}


def _detect_destination(transcript):
    lowered = (transcript or "").lower()
    for destination, aliases in DESTINATION_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return destination, DESTINATION_DISPLAY[destination], False
    return None, None, True


def _get_affinity_weights(destination):
    if not destination:
        return {}
    if destination == "Student_Union":
        return AFFINITY.get("Johnson", {}).get("weights", {})
    direct = AFFINITY.get(destination, {}).get("weights", {})
    if direct:
        return direct
    mapped = AFFINITY.get(BUILDING_CODE_MAP.get(destination, ""), {}).get("weights", {})
    return mapped


def _normalize_lot(lot):
    if lot in ("M_west", "M_south"):
        return "M_east"
    return lot


def _occupancy_penalty(occupancy):
    if occupancy >= 95:
        return 45
    if occupancy >= 90:
        return 35
    if occupancy >= 85:
        return 22
    if occupancy >= 75:
        return 10
    return 0


def _rerank_for_destination(ranked_lots, destination):
    weights = _get_affinity_weights(destination)
    updated = []
    for lot_data in ranked_lots:
        normalized_lot = _normalize_lot(lot_data["lot"])
        affinity_weight = weights.get(normalized_lot, 0)
        occupancy = lot_data.get("predicted_occupancy_pct", 0)
        availability_score = 100 - occupancy
        destination_score = (affinity_weight * 55) + (availability_score * 0.45) - _occupancy_penalty(occupancy)
        updated.append({
            **lot_data,
            "lot": "M_east" if normalized_lot == "M_east" else normalized_lot,
            "affinity_weight": affinity_weight,
            "destination_score": destination_score,
        })

    updated.sort(
        key=lambda lot: (
            -int(lot["predicted_occupancy_pct"] < 90 and lot["affinity_weight"] > 0),
            int(lot["predicted_occupancy_pct"] >= 90),
            -lot["destination_score"],
            lot["predicted_occupancy_pct"],
            lot["lot"],
        )
    )

    return [
        {**lot, "recommended": index == 0}
        for index, lot in enumerate(updated)
    ]


def _build_voice_text(destination_label, transcript, ranked_lots, defaulted_destination):
    top_lot = ranked_lots[0] if ranked_lots else None
    alternatives = [lot for lot in ranked_lots[1:] if lot.get("predicted_occupancy_pct", 0) < 90][:2]
    risky_close_lot = next(
        (
            lot for lot in ranked_lots
            if lot.get("affinity_weight", 0) >= 0.6
            and lot.get("predicted_occupancy_pct", 0) >= 90
            and top_lot
            and lot["lot"] != top_lot["lot"]
        ),
        None,
    )

    if not top_lot:
        return "Hey commuter. I could not find a parking recommendation right now."

    parts = ["Hey commuter."]
    if defaulted_destination:
        parts.append(f"I did not recognize the destination, so I am using the {destination_label} area.")
    else:
        parts.append(f"For {destination_label}, head to Lot {top_lot['lot']}.")

    parts.append(
        f"It looks like the best balance of distance and availability at {top_lot['predicted_occupancy_pct']} percent occupancy."
    )

    if alternatives:
        alt_text = ", ".join(
            f"Lot {lot['lot']} at {lot['predicted_occupancy_pct']} percent"
            for lot in alternatives
        )
        parts.append(f"Alternatives are {alt_text}.")

    if risky_close_lot:
        parts.append(
            f"Lot {risky_close_lot['lot']} is closer, but at {risky_close_lot['predicted_occupancy_pct']} percent it may be hard to find a spot."
        )

    parts.append("Starting navigation now.")
    return " ".join(parts)


def _normalize_transcript(text):
    lowered = (text or "").lower().replace("-", " ").replace("_", " ")
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    return " ".join(lowered.split())


def _looks_like_confirmation(transcript):
    lowered = _normalize_transcript(transcript)
    return any(keyword in lowered for keyword in CONFIRM_KEYWORDS)


def _looks_like_cancel(transcript):
    lowered = _normalize_transcript(transcript)
    return any(keyword in lowered for keyword in CANCEL_KEYWORDS)


def _filename_for_mime_type(mime_type):
    normalized = (mime_type or "").split(";")[0].strip().lower()
    extension = MIME_EXTENSION_MAP.get(normalized, ".webm")
    return f"voice_query{extension}"


def _spoken_lot_variants(lot_code):
    normalized = lot_code.lower().replace("_east", "").replace("_west", "").replace("_south", "")
    compact = normalized.replace(" ", "")
    variants = {
        f"lot {normalized}",
        f"lot {compact}",
        normalized,
        compact,
    }

    if normalized.endswith("1") or normalized.endswith("2"):
        spaced = f"{normalized[:-1]} {normalized[-1]}"
        variants.update({spaced, f"lot {spaced}"})

    return {variant.strip() for variant in variants if variant.strip()}


def _contains_phrase(text, phrase):
    return re.search(rf"\b{re.escape(phrase)}\b", text) is not None


def _detect_requested_lot(transcript, ranked_lots):
    lowered = _normalize_transcript(transcript)
    for lot_data in ranked_lots or []:
        lot_code = lot_data.get("lot")
        if not lot_code:
            continue
        if any(_contains_phrase(lowered, variant) for variant in _spoken_lot_variants(lot_code)):
            return lot_data
    return None


def _build_confirmation_prompt(destination_label, ranked_lots, defaulted_destination):
    top_lot = ranked_lots[0] if ranked_lots else None
    alternatives = [lot for lot in ranked_lots[1:] if lot.get("predicted_occupancy_pct", 0) < 90][:1]

    if not top_lot:
        return "I could not find a parking recommendation right now."

    destination_text = (
        f"I did not catch the destination clearly. The best open option right now is Lot {top_lot['lot']}."
        if defaulted_destination
        else f"For {destination_label}, I recommend Lot {top_lot['lot']}."
    )

    parts = [
        destination_text,
        f"It is about {top_lot['predicted_occupancy_pct']} percent occupied, so it should be {_describe_space_availability(top_lot['predicted_occupancy_pct'])}.",
    ]

    if alternatives:
        alt = alternatives[0]
        parts.append(
            f"As a backup, Lot {alt['lot']} is around {alt['predicted_occupancy_pct']} percent occupied."
        )

    parts.append(
        f"Say confirm for Lot {top_lot['lot']}, or say switch to lot and the lot name."
    )
    return " ".join(parts)


def _build_destination_clarification_prompt(ranked_lots):
    top_lot = ranked_lots[0] if ranked_lots else None
    alternative = next((lot for lot in ranked_lots[1:] if lot.get("predicted_occupancy_pct", 0) < 90), None)

    if not top_lot:
        return "I could not catch the destination. Please say the building name again."

    parts = [
        f"I did not catch the destination. The most open lot right now looks like Lot {top_lot['lot']}, and it is about {top_lot['predicted_occupancy_pct']} percent occupied."
    ]

    if alternative:
        parts.append(
            f"Another option is Lot {alternative['lot']} at about {alternative['predicted_occupancy_pct']} percent occupied."
        )

    parts.append(
        f"Say confirm for Lot {top_lot['lot']}, or say the building name again."
    )
    return " ".join(parts)


def _build_begin_route_text(destination_label, lot_code):
    if destination_label:
        return f"Okay. Beginning your route to Lot {lot_code} for {destination_label} now."
    return f"Okay. Beginning your route to Lot {lot_code} now."


def _build_switch_route_text(destination_label, lot_code, occupancy):
    if destination_label:
        return (
            f"Okay. Switching to Lot {lot_code} for {destination_label}. "
            f"It is around {occupancy} percent occupied. Beginning your route now."
        )
    return f"Okay. Switching to Lot {lot_code}. It is around {occupancy} percent occupied. Beginning your route now."


def _build_retry_confirmation_text(destination_label, top_lot):
    if not top_lot:
        return "Please say your destination again."
    destination_fragment = f" for {destination_label}" if destination_label else ""
    return (
        f"I did not catch that. Say confirm to go to Lot {top_lot['lot']}{destination_fragment}, "
        f"or say switch to lot and the lot name."
    )


def _should_ask_for_clarification(transcript):
    lowered = _normalize_transcript(transcript)
    return not any(phrase in lowered for phrase in CLARIFICATION_PHRASES)


def _describe_availability(occupancy):
    if occupancy <= 20:
        return "very open"
    if occupancy <= 45:
        return "fairly open"
    if occupancy <= 70:
        return "moderately busy"
    return "busy"


def _describe_space_availability(occupancy):
    if occupancy <= 20:
        return "easy to find a spot"
    if occupancy <= 45:
        return "fairly easy to park"
    if occupancy <= 70:
        return "a moderate search"
    return "harder to park"


@voice_bp.route("/api/ml/voice/speak", methods=["POST"])
def speak_text():
    payload = request.get_json() or {}
    text = (payload.get("text") or "").strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        audio = synthesize_speech_bytes(text)
    except RuntimeError as exc:
        print(f"[voice.speak] runtime error: {exc}", flush=True)
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        print(f"[voice.speak] synthesis failed: {exc}", flush=True)
        return jsonify({"error": f"Text-to-speech failed: {exc}"}), 502

    return jsonify({
        "text": text,
        "audio_base64": base64.b64encode(audio).decode("utf-8"),
        "mime_type": "audio/mpeg",
    })


@voice_bp.route("/api/ml/voice/chat", methods=["POST"])
def voice_chat():
    payload = request.get_json() or {}
    audio_base64 = payload.get("audio_base64")
    mime_type = payload.get("mime_type", "audio/webm")
    classes = payload.get("classes", {})
    weather_multiplier = payload.get("weather_multiplier", 1.0)
    weather = payload.get("weather")
    permit_id = payload.get("permit_id")
    voice_context = payload.get("voice_context") or {}

    if not audio_base64:
        return jsonify({"error": "audio_base64 is required"}), 400

    try:
        audio_bytes = base64.b64decode(audio_base64, validate=True)
    except Exception:
        return jsonify({"error": "audio_base64 must be valid base64"}), 400

    try:
        transcript = speech_to_text((_filename_for_mime_type(mime_type), audio_bytes, mime_type))
    except RuntimeError as exc:
        print(f"[voice.chat] runtime error for mime_type={mime_type}: {exc}", flush=True)
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        print(f"[voice.chat] speech-to-text failed for mime_type={mime_type}: {exc}", flush=True)
        return jsonify({"error": f"Speech-to-text failed: {exc}"}), 502

    awaiting_confirmation = bool(voice_context.get("awaiting_confirmation"))
    ranked_lots = voice_context.get("ranked_lots") or []
    pending_lot = voice_context.get("pending_lot")
    destination_key = voice_context.get("destination_building")
    destination_label = voice_context.get("destination_label")
    defaulted_destination = bool(voice_context.get("defaulted_destination"))

    action = "awaiting_confirmation"
    selected_lot = None

    if awaiting_confirmation and ranked_lots:
        top_lot = next((lot for lot in ranked_lots if lot.get("lot") == pending_lot), None) or (ranked_lots[0] if ranked_lots else None)
        requested_lot = _detect_requested_lot(transcript, ranked_lots)

        if _looks_like_cancel(transcript):
            voice_text = "Okay. Voice navigation is canceled."
            action = "cancelled"
        elif requested_lot and requested_lot.get("lot") != pending_lot:
            selected_lot = requested_lot.get("lot")
            voice_text = _build_switch_route_text(
                destination_label,
                selected_lot,
                requested_lot.get("predicted_occupancy_pct", 0),
            )
            action = "start_navigation"
        elif _looks_like_confirmation(transcript) or (requested_lot and requested_lot.get("lot") == pending_lot):
            selected_lot = pending_lot or (top_lot or {}).get("lot")
            voice_text = _build_begin_route_text(destination_label, selected_lot)
            action = "start_navigation"
        else:
            voice_text = _build_retry_confirmation_text(destination_label, top_lot)
            action = "awaiting_confirmation"
    else:
        destination_key, destination_label, defaulted_destination = _detect_destination(transcript)

        formula_output = compute_lot_pressure(
            classes.get("starting_soon", []),
            classes.get("currently_active", []),
            classes.get("recently_ended", []),
            weather_multiplier,
        )

        gemini_output = get_parking_recommendation(formula_output)
        ranked_lots = build_calibrated_ranked_lots(formula_output)
        reranked_lots = _rerank_for_destination(ranked_lots, destination_key) if destination_key else ranked_lots
        reranked_lots = filter_ranked_lots_for_permit(reranked_lots, permit_id)
        if destination_key:
            voice_text = _build_confirmation_prompt(destination_label, reranked_lots, defaulted_destination)
        elif _should_ask_for_clarification(transcript):
            voice_text = _build_destination_clarification_prompt(reranked_lots)
        else:
            voice_text = _build_confirmation_prompt(None, reranked_lots, True)
        ranked_lots = reranked_lots
        pending_lot = (reranked_lots[0] if reranked_lots else {}).get("lot")
        formula_summary = formula_output.get("summary", {})

    if awaiting_confirmation and ranked_lots:
        formula_summary = payload.get("summary") or {}

    try:
        audio = synthesize_speech_bytes(voice_text)
    except RuntimeError as exc:
        print(f"[voice.chat] tts runtime error: {exc}", flush=True)
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        print(f"[voice.chat] tts failed: {exc}", flush=True)
        return jsonify({"error": f"Text-to-speech failed: {exc}"}), 502

    response = {
        "timestamp": datetime.datetime.now().isoformat(),
        "transcript": transcript,
        "destination_building": destination_key,
        "destination_label": destination_label,
        "defaulted_destination": defaulted_destination,
        "weather_multiplier": weather_multiplier,
        "weather": weather,
        "permit_id": permit_id,
        "summary": formula_summary,
        "ranked_lots": ranked_lots,
        "tts_summary": voice_text,
        "voice_action": action,
        "pending_lot": pending_lot,
        "selected_lot": selected_lot,
        "awaiting_confirmation": action == "awaiting_confirmation",
        "audio_base64": base64.b64encode(audio).decode("utf-8"),
        "mime_type": "audio/mpeg",
    }

    if not awaiting_confirmation and "error" in gemini_output:
        response["gemini_error"] = gemini_output["error"]

    return jsonify(response)
