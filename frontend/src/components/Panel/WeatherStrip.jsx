import { CloudRain } from "lucide-react";

export default function WeatherStrip() {
  return (
    <div className="weather-strip">
      <CloudRain />
      <div className="weather-info">
        <div className="weather-info-title">Light Rain · 58°F</div>
        <div className="weather-info-sub">Walk tolerance reduced</div>
      </div>
      <div className="weather-badge">×1.3 impact</div>
    </div>
  );
}
