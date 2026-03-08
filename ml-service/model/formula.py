import json
import os

_AFFINITY_PATH = os.path.join(os.path.dirname(__file__), "../data/building_lot_affinity.json")

def _load_affinity():
    if not os.path.exists(_AFFINITY_PATH):
        return {}
    with open(_AFFINITY_PATH) as f:
        return json.load(f)

AFFINITY = _load_affinity()

COMMUTER_RATIO = 0.70
ATTENDANCE_FACTOR = 0.80
LOT_SPREAD = 0.60
DEMAND_SCALE = COMMUTER_RATIO * ATTENDANCE_FACTOR * LOT_SPREAD

BUILDING_CODE_MAP = {
    "ECSW": "ECSW",
    "ECSS": "ECSS",
    "ECSN": "ECSN",
    "SCI":  "Sciences",
    "ATC":  "Arts_and_Technology",
    "HH":   "Hoblitzelle",
    "SLC":  "SLC",
    "JSOM": "JSOM",
    "GR":   "Green_Hall",
    "SSB":  "SSA",
    "FN":   "Founders_North",
    "FO":   "Founders",
    "JO":   "Johnson",
    "SOM":  "McDermott",
    "MC":   "Academic_Center",
    "AD":   "Administration",
    "CB":   "Classroom_Building",
    "CRA":  "Natural_Science_Research",
    "CR":   "North_Lab",
    "ML2":  "Lloyd_Berkner",
    "PHY":  "Sciences",
    "ROC":  "Sciences",
    "BE":   "ECSW",
}

LOT_CAPACITIES = {
    "H": 582,
    "I": 114,
    "J": 532,
    "U": 780,
    "P": 90,
    "M_east": 400,
    "D": 185,
    "C1": 180,
    "C2": 159,
    "B1": 130,
    "B2": 375,
    "A1": 110,
    "A2": 885,
    "N": 72,
    "S": 110,
    "T": 388,
}

def filter_events(events):
    skip_types = {"Desk Sharing", "Instructor Use"}
    return [
        e for e in events
        if e.get("capacity") and e["capacity"] > 0
        and e.get("building") not in ("ONLINE", "", None)
        and e.get("type") not in skip_types
    ]

def compute_lot_pressure(starting_soon, currently_active, recently_ended, weather_multiplier=1.0):
    starting = filter_events(starting_soon)
    active = filter_events(currently_active)
    ended = filter_events(recently_ended)

    lot_raw_pressure = {lot: 0.0 for lot in LOT_CAPACITIES}

    def process_bucket(events, time_multiplier):
        for e in events:
            b_code = e.get("building")
            affinity_key = BUILDING_CODE_MAP.get(b_code)
            if not affinity_key:
                print(f"WARNING: unmapped building {b_code}")
                continue
            
            affinity_data = AFFINITY.get(affinity_key)
            if not affinity_data:
                continue
            
            cap = e["capacity"]
            weights = affinity_data.get("weights", {})
            for lot, weight in weights.items():
                if lot in ("M_west", "M_south"):
                    lot = "M_east"
                if lot == "R":
                    continue
                if lot in lot_raw_pressure:
                    lot_raw_pressure[lot] += cap * DEMAND_SCALE * weight * time_multiplier

    process_bucket(active, 1.0)
    process_bucket(starting, 0.8)
    process_bucket(ended, -0.4)

    lot_scores = {}
    for lot, raw_val in lot_raw_pressure.items():
        final_raw = max(0.0, raw_val * weather_multiplier)
        capacity = LOT_CAPACITIES[lot]
        pressure = min(1.0, final_raw / capacity)
        
        if final_raw > 0 or lot in LOT_CAPACITIES:
            lot_scores[lot] = {
                "pressure": round(pressure, 2),
                "raw_pressure": round(final_raw, 1)
            }

    summary = {
        "total_active_capacity": sum(e["capacity"] for e in active),
        "total_starting_capacity": sum(e["capacity"] for e in starting),
        "total_ending_capacity": sum(e["capacity"] for e in ended),
        "weather_multiplier": weather_multiplier,
        "events_active": len(active),
        "events_starting": len(starting),
        "events_ending": len(ended),
    }

    return {
        "lot_scores": lot_scores,
        "summary": summary
    }
