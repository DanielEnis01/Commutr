import Header from "./Header";
import AICard from "./AICard";
import WeatherStrip from "./WeatherStrip";
import LotCard from "./LotCard";
import StatsGrid from "./StatsGrid";
import OccupancyChart from "./OccupancyChart";
import NavigateButton from "./NavigateButton";
import TabBar from "./TabBar";

const lots = [
  {
    id: "h",
    name: "Lot H",
    location: "Near ECSW",
    walkTime: "3 min walk",
    occupancy: 21,
    availableSpots: 947,
    recommended: true,
  },
  {
    id: "w",
    name: "Lot W",
    location: "Near SOM",
    walkTime: "5 min walk",
    occupancy: 67,
    availableSpots: 264,
    recommended: false,
  },
  {
    id: "cb",
    name: "Lot CB3",
    location: "Near JSOM",
    walkTime: "2 min walk",
    occupancy: 89,
    availableSpots: 66,
    recommended: false,
  },
];

const stats = [
  { label: "Students in class (next hr)", value: "847", accent: true },
  { label: "Best lot occupancy", value: "21%", green: true },
  { label: "Sections starting at 10am", value: "34", muted: true },
  { label: "Weather impact", value: "×1.3", muted: true },
];

export default function SidePanel() {
  return (
    <div className="sidebar">
      <Header />

      <div className="sidebar-scroll">
        {/* AI Assistant */}
        <div>
          <div className="section-label">AI Assistant</div>
          <AICard />
        </div>

        {/* Weather */}
        <WeatherStrip />

        {/* Lot Predictions */}
        <div>
          <div className="section-label">Lot Predictions</div>
          {lots.map((lot) => (
            <LotCard key={lot.id} {...lot} />
          ))}
        </div>

        {/* Campus Stats */}
        <div style={{ marginTop: 16 }}>
          <div className="section-label">Campus Right Now</div>
          <StatsGrid stats={stats} />
        </div>

        {/* Occupancy Chart */}
        <OccupancyChart />

        {/* Navigate Button */}
        <NavigateButton lotName="Lot H" />
      </div>

      <TabBar />
    </div>
  );
}
