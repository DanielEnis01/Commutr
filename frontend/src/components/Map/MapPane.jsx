import { LocationPanel } from "../Panel/LocationPanel";
import { TripInfoCard } from "../Panel/TripInfoCard";
import { Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useState, useEffect, useRef } from "react";
import mapStyles from "./mapStyles";

const UTD_BOUNDS = {
  north: 32.995,
  south: 32.978,
  west: -96.760,
  east: -96.740,
};

const UTD_LOTS = [
  { id: "h", name: "Lot H", lat: 32.9877704179372, lng: -96.75304011186817, vacant: true },
  { id: "j", name: "Lot J", lat: 32.9844444, lng: -96.7505000, vacant: false },
  { id: "f", name: "Lot F", lat: 32.98427893827442, lng: -96.7492802996869, vacant: true },
  { id: "u", name: "Lot U", lat: 32.98116297383819, lng: -96.75088334404406, vacant: true },
  { id: "m_west", name: "Lot M West", lat: 32.983489026369895, lng: -96.74735246161505, vacant: false },
  { id: "m_east", name: "Lot M East", lat: 32.983489026369895, lng: -96.74629258064449, vacant: false },
  { id: "m_south", name: "Lot M South", lat: 32.98238286682215, lng: -96.74706900507641, vacant: true },
  { id: "d", name: "Lot D", lat: 32.98696517899782, lng: -96.74450785086178, vacant: true },
  { id: "c1", name: "Lot C1", lat: 32.98752504401622, lng: -96.74496631239154, vacant: false },
  { id: "c2", name: "Lot C2", lat: 32.98815276723842, lng: -96.74409658390128, vacant: true },
  { id: "b2", name: "Lot B2", lat: 32.99036618021972, lng: -96.7454325530858, vacant: false },
  { id: "b1", name: "Lot B1", lat: 32.9887820607114, lng: -96.74598340142997, vacant: true },
  { id: "a2", name: "Lot A2", lat: 32.99022867097261, lng: -96.7455112457064, vacant: true },
  { id: "a1", name: "Lot A1", lat: 32.98951911985273, lng: -96.74642932628002, vacant: false },
  { id: "i", name: "Lot I", lat: 32.98659386421271, lng: -96.75312524282663, vacant: true },
  { id: "t", name: "Lot T", lat: 32.99238737492741, lng: -96.7525346316642, vacant: false },
  { id: "t_over", name: "T Overflow", lat: 32.99229501759602, lng: -96.75552772873479, vacant: true },
  { id: "p", name: "Lot P", lat: 32.99096841980464, lng: -96.7501821975309, vacant: true },
  { id: "n", name: "Lot N", lat: 32.9926392580778, lng: -96.7483002502807, vacant: false },
  { id: "r", name: "Lot R", lat: 32.990206992297985, lng: -96.7481333878544, vacant: true },
  { id: "s", name: "Lot S", lat: 32.99258285446397, lng: -96.74749391907277, vacant: false },
];

const USER_LOCATION = { lat: 32.9805, lng: -96.7505 };

function LotMarkers({ onSelectLot, selectedLotId, isNavigating }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    UTD_LOTS.forEach((lot) => {
      // Hide other lots when actively navigating
      if (isNavigating && selectedLotId !== lot.id) return;

      const marker = new window.google.maps.Marker({
        position: { lat: lot.lat, lng: lot.lng },
        map,
        label: {
          text: lot.name,
          color: lot.vacant ? "#5ee7ff" : "#555A66",
          fontSize: "10px",
          fontWeight: "700",
          className: "marker-label", // allow CSS styling if needed
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: lot.vacant ? 6 : 4,
          fillColor: lot.vacant ? "#00d0ff" : "#1A1D24",
          fillOpacity: lot.vacant ? 0.8 : 0.4,
          strokeColor: lot.vacant ? "#5ee7ff" : "#2E3440",
          strokeWeight: lot.vacant ? 2 : 1,
          strokeOpacity: lot.vacant ? 1 : 0.6,
        },
      });

      marker.addListener("click", () => onSelectLot(lot));
      markersRef.current.push(marker);
    });

    // User location marker
    const userMarker = new window.google.maps.Marker({
      position: USER_LOCATION,
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#5ee7ff",
        fillOpacity: 0.9,
        strokeColor: "#5ee7ff",
        strokeWeight: 2,
        strokeOpacity: 0.4,
      },
      zIndex: 999,
    });
    markersRef.current.push(userMarker);

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
    };
  }, [map, selectedLotId, isNavigating]);

  return null;
}

function RouteOverlay({ destination, onRouteInfo, isNavigating }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef([]);

  useEffect(() => {
    if (!routesLib || !map || !destination) {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      if (!destination && onRouteInfo) onRouteInfo(null);
      // Reset map zoom when route clears
      if (!isNavigating && map) {
        map.setZoom(15.5);
        map.panTo({ lat: 32.986, lng: -96.750 });
      }
      return;
    }

    const svc = new routesLib.DirectionsService();
    svc.route(
      {
        origin: USER_LOCATION,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: { departureTime: new Date(), trafficModel: "bestguess" },
      },
      (response, status) => {
        if (status !== "OK" || !response.routes[0]) return;

        polylinesRef.current.forEach((p) => p.setMap(null));
        const newLines = [];
        const route = response.routes[0];
        const leg = route.legs[0];

        // Zoom map to show entire route once navigation starts
        if (isNavigating) {
           map.fitBounds(route.bounds);
           // Slightly offset padding to account for the UI panels
           map.panBy(0, 50); 
        }

        if (onRouteInfo) {
          onRouteInfo({
            distanceText: leg.distance.text, // e.g. "1.2 mi"
            distanceValue: leg.distance.value,
            durationSeconds: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
            durationText: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text
          });
        }

        leg.steps.forEach((step) => {
          const speed = step.distance.value / step.duration.value;
          const isTraffic = speed < 5;
          const color = isTraffic ? "#4effa0" : "#5ee7ff"; // Mint green for traffic, Cyan for normal

          newLines.push(
            new window.google.maps.Polyline({
              path: step.path,
              strokeColor: color,
              strokeOpacity: 0.15, // Reduced from 0.2 to prevent blowing out the map
              strokeWeight: 8,     // Reduced from 12 for a tighter glow
              map,
            }),
            new window.google.maps.Polyline({
              path: step.path,
              strokeColor: color,
              strokeOpacity: 0.8,  // Made core slightly more solid
              strokeWeight: 4,
              map,
            })
          );
        });
        polylinesRef.current = newLines;
      }
    );

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [routesLib, map, destination, isNavigating]);

  return null;
}

export default function MapPane() {
  const [selectedLot, setSelectedLot] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelectLot = (lot) => {
    // Prevent changing destination if currently navigating
    if (isNavigating) return;
    
    setSelectedLot(lot);
    setIsNavigating(false);
    setRouteInfo(null); // Reset while calculating
  };

  const handleCancelLine = () => {
    setSelectedLot(null);
    setIsNavigating(false);
    setRouteInfo(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        defaultCenter={{ lat: 32.986, lng: -96.750 }}
        defaultZoom={15.5}
        disableDefaultUI={true}
        styles={mapStyles}
        restriction={{ latLngBounds: UTD_BOUNDS, strictBounds: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <LotMarkers onSelectLot={handleSelectLot} selectedLotId={selectedLot?.id} isNavigating={isNavigating} />
        <RouteOverlay destination={selectedLot} onRouteInfo={setRouteInfo} isNavigating={isNavigating} />
      </Map>

      {/* Show LocationPanel (Journey Start) when a lot is selected but not yet navigating */}
      {selectedLot && !isNavigating && (
        <LocationPanel 
          locationName={selectedLot.name}
          address="UT-Dallas Campus"
          estimatedTime={routeInfo ? Math.round(routeInfo.durationSeconds / 60) : "--"}
          distance={routeInfo ? parseFloat(routeInfo.distanceText.replace(/[^\d.-]/g, '')) : 0}
          availableSpots={selectedLot.vacant ? Math.floor(Math.random() * 20) + 15 : 0} // simulated live spots
          onStartRoute={() => setIsNavigating(true)}
          onCancel={handleCancelLine}
        />
      )}

      {/* Show TripInfoCard (Navigation Panel) when actively navigating to the selected lot */}
      {selectedLot && isNavigating && routeInfo && (
        <TripInfoCard
          initialSeconds={routeInfo.durationSeconds}
          distance={parseFloat(routeInfo.distanceText.replace(/[^\d.-]/g, ''))}
          destination={selectedLot.name}
          onStop={handleCancelLine}
        />
      )}
    </div>
  );
}
