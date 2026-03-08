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

function LiveUserTracker({ isNavigating, onLocationUpdate }) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const markerRef = useRef(null);
  const lastPosRef = useRef(USER_LOCATION);
  const onUpdateRef = useRef(onLocationUpdate);

  useEffect(() => {
    onUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    if (!map) return;
    markerRef.current = new window.google.maps.Marker({
      map,
      zIndex: 9999,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#5ee7ff",
        fillOpacity: 0.9,
        strokeColor: "#5ee7ff",
        strokeWeight: 2,
        strokeOpacity: 0.4,
        rotation: 0
      }
    });
    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!markerRef.current) return;
    const icon = markerRef.current.getIcon();
    if (isNavigating) {
      icon.path = window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW;
      icon.scale = 6;
      icon.strokeColor = "#000";
      icon.strokeOpacity = 1;
    } else {
      icon.path = window.google.maps.SymbolPath.CIRCLE;
      icon.scale = 7;
      icon.strokeColor = "#5ee7ff";
      icon.strokeOpacity = 0.4;
      icon.rotation = 0;
    }
    markerRef.current.setIcon(icon);
  }, [isNavigating]);

  useEffect(() => {
    if (!navigator.geolocation || !markerRef.current) return;
    
    // Quick initial ping
    navigator.geolocation.getCurrentPosition((pos) => {
       const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
       lastPosRef.current = newPos;
       if (markerRef.current) markerRef.current.setPosition(newPos);
       onUpdateRef.current(newPos);
    }, () => {}, { enableHighAccuracy: true });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const oldPos = lastPosRef.current;
        if (markerRef.current) {
          markerRef.current.setPosition(newPos);

          let heading = markerRef.current.getIcon()?.rotation || 0;
          if (pos.coords.heading !== null && (!isNaN(pos.coords.heading)) && pos.coords.heading !== 0) {
            heading = pos.coords.heading;
          } else if (geometryLib && oldPos) {
             const calcHead = geometryLib.spherical.computeHeading(oldPos, newPos);
             if (geometryLib.spherical.computeDistanceBetween(oldPos, newPos) > 1) { 
                heading = calcHead;
             }
          }

          if (isNavigating) {
             const icon = markerRef.current.getIcon();
             icon.rotation = heading;
             markerRef.current.setIcon(icon);
             if (map) map.panTo(newPos);
          }
        }

        lastPosRef.current = newPos;
        onUpdateRef.current(newPos);
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, geometryLib, isNavigating]);

  return null;
}

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

      const isVacant = lot.vacant;
      const svgColor = "%2300d0ff";       // All lots get the cyan stroke
      const svgShadow = isVacant ? "%2300d0ff" : "%23005a70"; // Non-vacant get a darker cyan shadow
      const svgFill = "%230d0f1a";        // Base dark map color
      
      const pinSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg width='48' height='64' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 64'%3E%3Cellipse cx='24' cy='60' rx='16' ry='4' fill='${svgShadow}' /%3E%3Cpath d='M24 58 C8 40 4 30 4 22 A20 20 0 1 1 44 22 C44 30 40 40 24 58 Z' fill='${svgFill}' stroke='${svgColor}' stroke-width='3' /%3E%3Ccircle cx='24' cy='22' r='8' fill='none' stroke='${svgColor}' stroke-width='1.5' opacity='0.6' /%3E%3Ccircle cx='24' cy='22' r='13' fill='none' stroke='${svgColor}' stroke-width='0.5' opacity='0.4' /%3E%3C/svg%3E`;

      const scaleW = isVacant ? 36 : 24;
      const scaleH = isVacant ? 48 : 32;

      const marker = new window.google.maps.Marker({
        position: { lat: lot.lat, lng: lot.lng },
        map,
        label: {
          text: lot.name,
          color: isVacant ? "#5ee7ff" : "rgba(94, 231, 255, 0.7)",
          fontSize: "10px",
          fontWeight: "700",
          className: "marker-label", 
        },
        icon: {
          url: pinSvg,
          scaledSize: new window.google.maps.Size(scaleW, scaleH),
          anchor: new window.google.maps.Point(scaleW / 2, scaleH),
          labelOrigin: new window.google.maps.Point(scaleW / 2, -10)
        },
      });

      marker.addListener("click", () => onSelectLot(lot));
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
    };
  }, [map, selectedLotId, isNavigating]);

  return null;
}

function RouteOverlay({ origin, destination, onRouteInfo, isNavigating }) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const geometryLib = useMapsLibrary("geometry");
  const polylinesRef = useRef([]);
  const segmentsRef = useRef([]);
  const entireDistanceRef = useRef(1);
  const baseDurationRef = useRef({ val: 0, text: "" });

  useEffect(() => {
    if (!routesLib || !map || !destination || !geometryLib) {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      segmentsRef.current = [];
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
        origin: origin,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: { departureTime: new Date(), trafficModel: "bestguess" },
      },
      (response, status) => {
        if (status !== "OK" || !response.routes || response.routes.length === 0) return;

        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];
        
        // Find the absolute fastest route among alternatives based on live traffic
        let fastestRoute = response.routes[0];
        let minDuration = Infinity;

        response.routes.forEach((rt) => {
          const l = rt.legs[0];
          const dur = l.duration_in_traffic ? l.duration_in_traffic.value : l.duration.value;
          if (dur < minDuration) {
            minDuration = dur;
            fastestRoute = rt;
          }
        });

        const route = fastestRoute;
        const leg = route.legs[0];
        const newLines = [];
        const segments = [];

        entireDistanceRef.current = leg.distance.value;
        baseDurationRef.current = {
            val: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
            text: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text
        };

        leg.steps.forEach((step) => {
          segments.push({
            path: step.path,
            instruction: step.instructions.replace(/<[^>]*>?/gm, '')
          });

          const speed = step.distance.value / step.duration.value;
          const isTraffic = speed < 5;
          const color = isTraffic ? "#4effa0" : "#5ee7ff"; // Mint green for traffic, Cyan for normal

          newLines.push(
            new window.google.maps.Polyline({
              path: step.path,
              strokeColor: color,
              strokeOpacity: 0.15, 
              strokeWeight: 8,     
              map,
            }),
            new window.google.maps.Polyline({
              path: step.path,
              strokeColor: color,
              strokeOpacity: 0.8,  
              strokeWeight: 4,
              map,
            })
          );
        });
        polylinesRef.current = newLines;
        segmentsRef.current = segments;

        if (!isNavigating) {
           // PREVIEW MODE: Zoom map to show entire route
           map.fitBounds(route.bounds);
           const isMobile = window.innerWidth <= 768;
           map.panBy(0, isMobile ? -120 : 50); 

           if (onRouteInfo) {
             onRouteInfo({
               distanceText: leg.distance.text,
               distanceValue: leg.distance.value,
               durationSeconds: baseDurationRef.current.val,
               durationText: baseDurationRef.current.text,
               instruction: "Calculating...",
               progress: 0
             });
           }
        } else {
           // ACTIVE NAVIGATION MODE
           map.setZoom(19);
        }
      }
    );

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [routesLib, geometryLib, map, destination]); // Excluding "origin" and "isNavigating" explicitly to prevent re-query loop.

  // Realtime tracker for Instruction & Progress Updates against physical geography
  useEffect(() => {
     if (!isNavigating || !geometryLib || segmentsRef.current.length === 0 || !destination) return;

     let closestDist = Infinity;
     let currentInstruction = segmentsRef.current[0].instruction;
     
     segmentsRef.current.forEach(seg => {
        // Sample down polyline points for fast evaluation
        for (let i = 0; i < seg.path.length; i += 3) { 
           const pt = seg.path[i];
           const dist = geometryLib.spherical.computeDistanceBetween(origin, pt);
           if (dist < closestDist) {
               closestDist = dist;
               currentInstruction = seg.instruction;
           }
        }
     });

     const distRemaining = geometryLib.spherical.computeDistanceBetween(origin, { lat: destination.lat, lng: destination.lng });
     let progress = 100 - ((distRemaining / Math.max(1, entireDistanceRef.current)) * 100);
     progress = Math.max(0, Math.min(100, progress));

     if (onRouteInfo) {
        onRouteInfo({
            distanceText: (distRemaining * 0.000621371).toFixed(1) + " mi",
            distanceValue: distRemaining,
            durationSeconds: baseDurationRef.current.val,
            durationText: baseDurationRef.current.text,
            instruction: currentInstruction,
            progress: progress
        });
     }
  }, [origin, isNavigating, geometryLib, destination]);

  return null;
}

export default function MapPane() {
  const [selectedLot, setSelectedLot] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [liveLocation, setLiveLocation] = useState(USER_LOCATION);

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
        style={{ width: "100%", height: "100%" }}
      >
        <LiveUserTracker isNavigating={isNavigating} onLocationUpdate={setLiveLocation} />
        <LotMarkers onSelectLot={handleSelectLot} selectedLotId={selectedLot?.id} isNavigating={isNavigating} />
        <RouteOverlay origin={liveLocation} destination={selectedLot} onRouteInfo={setRouteInfo} isNavigating={isNavigating} />
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
          instruction={routeInfo.instruction}
          progress={routeInfo.progress}
          initialSeconds={routeInfo.durationSeconds}
          distance={parseFloat(routeInfo.distanceText.replace(/[^\d.-]/g, ''))}
          destination={selectedLot.name}
          onStop={handleCancelLine}
        />
      )}
    </div>
  );
}
