import fs from "fs";

const affinityFile = new URL("../../ml-service/data/building_lot_affinity.json", import.meta.url);
const AFFINITY = JSON.parse(fs.readFileSync(affinityFile, "utf8"));

const COMMUTER_RATIO = 0.7;
const ATTENDANCE_FACTOR = 0.8;
const LOT_SPREAD = 0.6;
const DEMAND_SCALE = COMMUTER_RATIO * ATTENDANCE_FACTOR * LOT_SPREAD;

const BUILDING_CODE_MAP = {
  ECSW: "ECSW",
  ECSS: "ECSS",
  ECSN: "ECSN",
  SCI: "Sciences",
  ATC: "Arts_and_Technology",
  HH: "Hoblitzelle",
  SLC: "SLC",
  JSOM: "JSOM",
  GR: "Green_Hall",
  SSB: "SSA",
  FN: "Founders_North",
  FO: "Founders",
  JO: "Johnson",
  SOM: "McDermott",
  MC: "Academic_Center",
  AD: "Administration",
  CB: "Classroom_Building",
  CRA: "Natural_Science_Research",
  CR: "North_Lab",
  ML2: "Lloyd_Berkner",
  PHY: "Sciences",
  ROC: "Sciences",
  BE: "ECSW",
};

const LOT_CAPACITIES = {
  H: 582,
  I: 114,
  J: 532,
  U: 780,
  P: 90,
  M_east: 400,
  D: 185,
  C1: 180,
  C2: 159,
  B1: 130,
  B2: 375,
  A1: 110,
  A2: 885,
  N: 72,
  S: 110,
  T: 388,
};

const LOT_BASELINE_BIAS = {
  I: 4,
  P: 4,
  J: 3,
  H: 3,
  C1: 3,
  C2: 3,
  D: 2,
  M_east: 2,
  T: 1,
  B1: 1,
  N: 1,
  S: 1,
  U: -1,
  A1: -1,
  B2: -1,
  A2: -2,
};

const PERMIT_ALLOWED_LOTS = {
  green: new Set(["U", "A1", "A2", "B1", "B2", "N", "S", "T"]),
  gold: new Set(["U", "A1", "A2", "B1", "B2", "N", "S", "T", "C1", "C2", "D", "H", "M", "P"]),
  orange: new Set(["H", "I", "J", "M", "D", "C1", "C2", "P", "T"]),
};

function normalizeLotName(lot) {
  return lot === "M_east" ? "M" : lot;
}

function normalizePermit(permitId) {
  if (!permitId) {
    return null;
  }

  const normalized = String(permitId).trim().toLowerCase();
  return PERMIT_ALLOWED_LOTS[normalized] ? normalized : null;
}

function filterEvents(events = []) {
  const skipTypes = new Set(["Desk Sharing", "Instructor Use"]);

  return events.filter(
    (event) =>
      Number(event?.capacity) > 0 &&
      !["ONLINE", "", null, undefined].includes(event?.building) &&
      !skipTypes.has(event?.type)
  );
}

function computeLotPressure(startingSoon, currentlyActive, recentlyEnded, weatherMultiplier = 1) {
  const starting = filterEvents(startingSoon);
  const active = filterEvents(currentlyActive);
  const ended = filterEvents(recentlyEnded);

  const lotRawPressure = Object.fromEntries(
    Object.keys(LOT_CAPACITIES).map((lot) => [lot, 0])
  );

  const processBucket = (events, timeMultiplier) => {
    for (const event of events) {
      const affinityKey = BUILDING_CODE_MAP[event.building];
      if (!affinityKey) {
        console.warn(`[Local Predictions] Unmapped building code: ${event.building}`);
        continue;
      }

      const affinityData = AFFINITY[affinityKey];
      if (!affinityData?.weights) {
        continue;
      }

      for (const [rawLot, weight] of Object.entries(affinityData.weights)) {
        let lot = rawLot;
        if (lot === "M_west" || lot === "M_south") {
          lot = "M_east";
        }
        if (lot === "R" || !(lot in lotRawPressure)) {
          continue;
        }

        lotRawPressure[lot] += Number(event.capacity) * DEMAND_SCALE * Number(weight) * timeMultiplier;
      }
    }
  };

  processBucket(active, 1);
  processBucket(starting, 0.8);
  processBucket(ended, -0.4);

  const lotScores = {};
  for (const [lot, rawValue] of Object.entries(lotRawPressure)) {
    const finalRaw = Math.max(0, rawValue * weatherMultiplier);
    const capacity = LOT_CAPACITIES[lot];
    const pressure = Math.min(1, finalRaw / capacity);

    lotScores[lot] = {
      pressure: Number(pressure.toFixed(2)),
      raw_pressure: Number(finalRaw.toFixed(1)),
    };
  }

  return {
    lot_scores: lotScores,
    summary: {
      total_active_capacity: active.reduce((sum, event) => sum + Number(event.capacity || 0), 0),
      total_starting_capacity: starting.reduce((sum, event) => sum + Number(event.capacity || 0), 0),
      total_ending_capacity: ended.reduce((sum, event) => sum + Number(event.capacity || 0), 0),
      weather_multiplier: weatherMultiplier,
      events_active: active.length,
      events_starting: starting.length,
      events_ending: ended.length,
    },
  };
}

function campusFloor(summary = {}) {
  const activeCapacity = summary.total_active_capacity || 0;
  const eventsActive = summary.events_active || 0;

  if (activeCapacity <= 0 && eventsActive <= 0) {
    return 2;
  }

  const baseFloor = 5;
  const capacityLift = Math.min(12, Math.trunc(activeCapacity / 1800));
  const activityLift = Math.min(6, Math.trunc(eventsActive / 40));
  return Math.min(18, baseFloor + capacityLift + activityLift);
}

function lotFloor(lot, summary = {}, campusFloorPct) {
  const bias = LOT_BASELINE_BIAS[lot] || 0;
  const activeCapacity = summary.total_active_capacity || 0;
  const eventsActive = summary.events_active || 0;

  if (activeCapacity <= 0 && eventsActive <= 0) {
    return Math.max(1, Math.min(9, 3 + bias));
  }

  return Math.max(4, Math.min(24, campusFloorPct + bias));
}

function calibratedPct(rawPressure, capacity, floorPct) {
  const utilization = rawPressure / Math.max(capacity, 1);

  if (utilization <= 0) {
    return floorPct;
  }

  if (utilization <= 1) {
    const scaled = floorPct + Math.pow(utilization, 0.78) * (89 - floorPct);
    return Math.max(floorPct, Math.min(96, Math.round(scaled)));
  }

  const overflow = utilization - 1;
  const scaled = 89 + 7 * (1 - Math.exp(-overflow * 1.1));
  return Math.max(floorPct, Math.min(96, Math.round(scaled)));
}

function buildCalibratedRankedLots(formulaOutput) {
  const scores = formulaOutput.lot_scores || {};
  const summary = formulaOutput.summary || {};
  const floorPct = campusFloor(summary);

  const ranked = Object.entries(scores).map(([lot, data]) => {
    const capacity = LOT_CAPACITIES[lot] || 100;
    const pct = calibratedPct(data.raw_pressure || 0, capacity, lotFloor(lot, summary, floorPct));
    let status = "full";

    if (pct < 40) {
      status = "available";
    } else if (pct <= 70) {
      status = "moderate";
    }

    return {
      lot: normalizeLotName(lot),
      predicted_occupancy_pct: pct,
      status,
      recommended: false,
      reason: null,
    };
  });

  ranked.sort((a, b) => a.predicted_occupancy_pct - b.predicted_occupancy_pct || a.lot.localeCompare(b.lot));

  return ranked.map((lot, index) => ({
    ...lot,
    recommended: index === 0,
  }));
}

function filterRankedLotsForPermit(rankedLots, permitId) {
  const normalizedPermit = normalizePermit(permitId);
  if (!normalizedPermit) {
    return rankedLots;
  }

  return rankedLots
    .filter((lot) => PERMIT_ALLOWED_LOTS[normalizedPermit].has(lot.lot))
    .map((lot, index) => ({
      ...lot,
      recommended: index === 0,
    }));
}

function buildLocalTtsSummary(rankedLots) {
  const topLot = rankedLots[0];
  const backup = rankedLots[1];

  if (!topLot) {
    return "Parking predictions are unavailable right now.";
  }

  if (backup) {
    return `Lot ${topLot.lot} is the best option right now at about ${topLot.predicted_occupancy_pct} percent occupied. Lot ${backup.lot} is the next best backup.`;
  }

  return `Lot ${topLot.lot} is the best option right now at about ${topLot.predicted_occupancy_pct} percent occupied.`;
}

export function buildLocalPredictionResponse(payload = {}) {
  const formulaOutput = computeLotPressure(
    payload.classes?.starting_soon || [],
    payload.classes?.currently_active || [],
    payload.classes?.recently_ended || [],
    payload.weather_multiplier || 1
  );

  const rankedLots = filterRankedLotsForPermit(
    buildCalibratedRankedLots(formulaOutput),
    payload.permit_id
  );

  return {
    timestamp: new Date().toISOString(),
    weather_multiplier: payload.weather_multiplier || 1,
    weather: payload.weather || null,
    summary: formulaOutput.summary,
    permit_id: payload.permit_id || null,
    request_meta: {
      ...(payload.meta || {}),
      gemini_cache_hit: false,
      prediction_source: "backend_fallback",
    },
    ranked_lots: rankedLots,
    tts_summary: buildLocalTtsSummary(rankedLots),
  };
}
