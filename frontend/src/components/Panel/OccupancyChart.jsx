const chartData = [
  { label: "8a", height: 30, color: "rgba(78,255,160,0.4)" },
  { label: "9a", height: 45, color: "rgba(78,255,160,0.4)" },
  { label: "10a", height: 60, color: "rgba(94,231,255,0.45)" },
  { label: "Now", height: 21, color: "rgba(78,255,160,0.6)", isCurrent: true },
  { label: "12p", height: 72, color: "rgba(94,231,255,0.45)" },
  { label: "2p", height: 85, color: "rgba(255,255,255,0.3)" },
  { label: "4p", height: 55, color: "rgba(94,231,255,0.45)" },
  { label: "6p", height: 35, color: "rgba(78,255,160,0.4)" },
];

export default function OccupancyChart() {
  return (
    <div className="occupancy-chart">
      <div className="occupancy-chart-title">
        Lot H — Predicted Occupancy Today
      </div>

      <div className="chart-bars">
        {chartData.map((bar, i) => (
          <div
            key={i}
            className={`chart-bar ${bar.isCurrent ? "current" : ""}`}
            style={{
              height: `${bar.height}%`,
              backgroundColor: bar.color,
            }}
          />
        ))}
      </div>

      <div className="chart-labels">
        {chartData.map((bar, i) => (
          <div
            key={i}
            className={`chart-label ${bar.isCurrent ? "current" : ""}`}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  );
}
