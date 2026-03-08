PERMIT_ALLOWED_LOTS = {
    "green": {"U", "A1", "A2", "B1", "B2", "N", "S", "T"},
    "gold": {"U", "A1", "A2", "B1", "B2", "N", "S", "T", "C1", "C2", "D", "H", "M", "P"},
    "orange": {"H", "I", "J", "M", "D", "C1", "C2", "P", "T"},
}


def normalize_permit(permit_id):
    if not permit_id:
        return None
    normalized = str(permit_id).strip().lower()
    return normalized if normalized in PERMIT_ALLOWED_LOTS else None


def filter_ranked_lots_for_permit(ranked_lots, permit_id):
    normalized = normalize_permit(permit_id)
    if not normalized:
        return ranked_lots

    allowed = PERMIT_ALLOWED_LOTS[normalized]
    filtered = [lot for lot in (ranked_lots or []) if lot.get("lot") in allowed]
    return [
        {**lot, "recommended": index == 0}
        for index, lot in enumerate(filtered)
    ]
