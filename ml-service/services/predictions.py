from model.formula import LOT_CAPACITIES

LOT_BASELINE_BIAS = {
    "I": 4,
    "P": 4,
    "J": 3,
    "H": 3,
    "C1": 3,
    "C2": 3,
    "D": 2,
    "M_east": 2,
    "T": 1,
    "B1": 1,
    "N": 1,
    "S": 1,
    "U": -1,
    "A1": -1,
    "B2": -1,
    "A2": -2,
}


def _campus_floor(summary):
    active_capacity = summary.get("total_active_capacity", 0)
    events_active = summary.get("events_active", 0)
    if active_capacity <= 0 and events_active <= 0:
        return 2
    base_floor = 5
    capacity_lift = min(12, int(active_capacity / 1800))
    activity_lift = min(6, int(events_active / 40))
    return min(18, base_floor + capacity_lift + activity_lift)


def _lot_floor(lot, summary, campus_floor):
    bias = LOT_BASELINE_BIAS.get(lot, 0)
    active_capacity = summary.get("total_active_capacity", 0)
    events_active = summary.get("events_active", 0)

    if active_capacity <= 0 and events_active <= 0:
        return max(1, min(9, 3 + bias))

    return max(4, min(24, campus_floor + bias))


def _calibrated_pct(raw_pressure, capacity, floor_pct):
    utilization = raw_pressure / max(capacity, 1)

    if utilization <= 0:
        return floor_pct

    if utilization <= 1:
        scaled = floor_pct + ((utilization ** 0.78) * (89 - floor_pct))
    else:
        overflow = utilization - 1
        scaled = 89 + (7 * (1 - pow(2.718281828, -overflow * 1.1)))

    return max(floor_pct, min(96, round(scaled)))


def build_calibrated_ranked_lots(formula_output):
    scores = formula_output.get("lot_scores", {})
    summary = formula_output.get("summary", {})
    floor_pct = _campus_floor(summary)

    ranked = []
    for lot, data in scores.items():
        capacity = LOT_CAPACITIES.get(lot, 100)
        pct = _calibrated_pct(data.get("raw_pressure", 0), capacity, _lot_floor(lot, summary, floor_pct))
        if pct < 40:
            status = "available"
        elif pct <= 70:
            status = "moderate"
        else:
            status = "full"

        ranked.append({
            "lot": lot,
            "predicted_occupancy_pct": pct,
            "status": status,
            "recommended": False,
            "reason": None,
        })

    ranked.sort(key=lambda lot: (lot["predicted_occupancy_pct"], lot["lot"]))
    return [
        {**lot, "recommended": index == 0}
        for index, lot in enumerate(ranked)
    ]


def build_local_tts_summary(ranked_lots):
    top_lot = ranked_lots[0] if ranked_lots else None
    backup = ranked_lots[1] if len(ranked_lots) > 1 else None

    if not top_lot:
        return "Parking predictions are unavailable right now."

    if backup:
        return (
            f"Lot {top_lot['lot']} is the best option right now at about {top_lot['predicted_occupancy_pct']} percent occupied. "
            f"Lot {backup['lot']} is the next best backup."
        )

    return f"Lot {top_lot['lot']} is the best option right now at about {top_lot['predicted_occupancy_pct']} percent occupied."
