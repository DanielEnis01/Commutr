import { useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import MapPane from "./components/Map/MapPane";
import SidePanel from "./components/Panel/SidePanel";
import MobileBottomBar from "./components/Panel/MobileBottomBar";

export default function App() {
  const [navigateToLotId, setNavigateToLotId] = useState(null);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <div className="app-layout">
        <div className="map-container">
          <MapPane navigateToLotId={navigateToLotId} onNavigationStarted={() => setNavigateToLotId(null)} />
        </div>
        <div className="sidebar-container">
          <SidePanel onNavigateToLot={(lotId) => setNavigateToLotId(lotId)} />
        </div>
        <MobileBottomBar />
      </div>
    </APIProvider>
  );
}

