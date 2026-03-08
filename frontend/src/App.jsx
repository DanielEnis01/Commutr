import { APIProvider } from "@vis.gl/react-google-maps";
import MapPane from "./components/Map/MapPane";
import SidePanel from "./components/Panel/SidePanel";
import MobileBottomBar from "./components/Panel/MobileBottomBar";

export default function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <div className="app-layout">
        <div className="map-container">
          <MapPane />
        </div>
        <div className="sidebar-container">
          <SidePanel />
        </div>
        <MobileBottomBar />
      </div>
    </APIProvider>
  );
}
