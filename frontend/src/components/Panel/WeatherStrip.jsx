import { CloudRain, Sun, Cloud, CloudLightning } from "lucide-react";

export default function WeatherStrip({ weather, multiplier = 1.0 }) {
  if (!weather) {
    return (
        <div className="weather-strip">
          <Sun />
          <div className="weather-info">
            <div className="weather-info-title">Loading Weather...</div>
            <div className="weather-info-sub">Fetching live data</div>
          </div>
        </div>
    );
  }

  const temp = Math.round(weather.temperature);
  const condition = weather.conditions?.[0]?.main || "Clear";
  const desc = weather.conditions?.[0]?.description || "No description";

  const getIcon = () => {
    if (condition.includes("Rain") || condition.includes("Drizzle")) return <CloudRain />;
    if (condition.includes("Thunderstorm")) return <CloudLightning />;
    if (condition.includes("Cloud")) return <Cloud />;
    return <Sun />;
  };

  return (
    <div className="weather-strip">
      {getIcon()}
      <div className="weather-info">
        <div className="weather-info-title">{condition} - {temp} F</div>
        <div className="weather-info-sub">{desc.charAt(0).toUpperCase() + desc.slice(1)}</div>
      </div>
      {multiplier > 1.0 && (
        <div className="weather-badge">x{multiplier} impact</div>
      )}
    </div>
  );
}
