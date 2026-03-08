export const PERMIT_OPTIONS = [
  {
    id: "green",
    name: "Green",
    color: "#10b981",
    description: "Outer surface lots",
    garageAccess: false,
  },
  {
    id: "gold",
    name: "Gold",
    color: "#f59e0b",
    description: "Central lots and garages",
    garageAccess: true,
  },
  {
    id: "orange",
    name: "Orange",
    color: "#f97316",
    description: "Closest commuter lots",
    garageAccess: true,
  },
];

export const PERMIT_LABELS = Object.fromEntries(
  PERMIT_OPTIONS.map((permit) => [permit.id, permit.name])
);
