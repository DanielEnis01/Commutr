export default function StatsGrid({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat, i) => {
        const colorClass = stat.accent
          ? "accent"
          : stat.green
          ? "green"
          : "muted";

        return (
          <div key={i} className="stat-card">
            <div className={`stat-value ${colorClass}`}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
