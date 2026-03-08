import { APIProvider } from "@vis.gl/react-google-maps";
import MapPane from "./components/Map/MapPane";
import SidePanel from "./components/Panel/SidePanel";

export default function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_KEY}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
        }}
      >
        <div style={{ flex: 1 }}>
          <MapPane />
        </div>
        <div style={{ width: 360, flexShrink: 0 }}>
          <SidePanel />
        </div>
      </div>
    </APIProvider>
  );
}
