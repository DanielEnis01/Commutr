import { LocationPanel } from "../Panel/LocationPanel";
import { TripInfoCard } from "../Panel/TripInfoCard";
import { Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useReducer, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
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
  { id: "u", name: "Lot U", lat: 32.98116297383819, lng: -96.75088334404406, vacant: true },
  { id: "m", name: "Lot M", lat: 32.983489026369895, lng: -96.74629258064449, vacant: false },
  { id: "d", name: "Lot D", lat: 32.98696517899782, lng: -96.74450785086178, vacant: true },
  { id: "c1", name: "Lot C1", lat: 32.98752504401622, lng: -96.74496631239154, vacant: false },
  { id: "c2", name: "Lot C2", lat: 32.98815276723842, lng: -96.74409658390128, vacant: true },
  { id: "b2", name: "Lot B2", lat: 32.99036618021972, lng: -96.7454325530858, vacant: false },
  { id: "b1", name: "Lot B1", lat: 32.9887820607114, lng: -96.74598340142997, vacant: true },
  { id: "a2", name: "Lot A2", lat: 32.99022867097261, lng: -96.7455112457064, vacant: true },
  { id: "a1", name: "Lot A1", lat: 32.98951911985273, lng: -96.74642932628002, vacant: false },
  { id: "i", name: "Lot I", lat: 32.98659386421271, lng: -96.75312524282663, vacant: true },
  { id: "t", name: "Lot T", lat: 32.99238737492741, lng: -96.7525346316642, vacant: false },
  { id: "p", name: "Lot P", lat: 32.99096841980464, lng: -96.7501821975309, vacant: true },
  { id: "n", name: "Lot N", lat: 32.9926392580778, lng: -96.7483002502807, vacant: false },
  { id: "s", name: "Lot S", lat: 32.99258285446397, lng: -96.74749391907277, vacant: false },
];

const USER_LOCATION = { lat: 32.9805, lng: -96.7505 };
const ARRIVAL_THRESHOLD_METERS = 35;
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 8000,
};
const MIN_LOCATION_DELTA_METERS = 2;
const MAX_ACCEPTABLE_ACCURACY_METERS = 120;
const ROUTE_SNAP_THRESHOLD_METERS = 18;
const ROUTE_PROGRESS_UPDATE_MS = 250;
const SIMULATED_AVAILABLE_SPOTS = {
  h: 41,
  j: 18,
  u: 63,
  m: 27,
  d: 36,
  c1: 24,
  c2: 29,
  b2: 57,
  b1: 21,
  a2: 72,
  a1: 12,
  i: 19,
  t: 45,
  p: 14,
  n: 8,
  s: 16,
};

function toLiteral(point) {
  if (!point) return null;
  return typeof point.lat === "function"
    ? { lat: point.lat(), lng: point.lng() }
    : { lat: point.lat, lng: point.lng };
}

function flattenRoutePath(steps = []) {
  const flattened = [];
  steps.forEach((step) => {
    (step.path || []).forEach((point) => {
      const literal = toLiteral(point);
      if (!literal) return;
      const previous = flattened[flattened.length - 1];
      if (!previous || previous.lat !== literal.lat || previous.lng !== literal.lng) {
        flattened.push(literal);
      }
    });
  });
  return flattened;
}

function projectPointToSegment(point, start, end) {
  const startToEndLat = end.lat - start.lat;
  const startToEndLng = end.lng - start.lng;
  const segmentLengthSquared = (startToEndLat ** 2) + (startToEndLng ** 2);

  if (!segmentLengthSquared) {
    return { point: start, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      (((point.lat - start.lat) * startToEndLat) + ((point.lng - start.lng) * startToEndLng)) / segmentLengthSquared
    )
  );

  return {
    point: {
      lat: start.lat + (startToEndLat * t),
      lng: start.lng + (startToEndLng * t),
    },
    t,
  };
}

function findNearestPointOnPath(geometryLib, point, path = []) {
  if (!geometryLib || !point || path.length < 2) return null;

  let bestMatch = null;
  let traversedDistance = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const segmentDistance = geometryLib.spherical.computeDistanceBetween(start, end);
    const projection = projectPointToSegment(point, start, end);
    const distanceToProjection = geometryLib.spherical.computeDistanceBetween(point, projection.point);

    if (!bestMatch || distanceToProjection < bestMatch.distanceToRoute) {
      bestMatch = {
        point: projection.point,
        index,
        segmentProgress: projection.t,
        distanceToRoute: distanceToProjection,
        distanceAlongRoute: traversedDistance + (segmentDistance * projection.t),
        segmentDistance,
      };
    }

    traversedDistance += segmentDistance;
  }

  return bestMatch;
}

function splitPathAtMatch(path, match) {
  if (!match || path.length < 2) {
    return { traveledPath: [], remainingPath: path };
  }

  const traveledPath = [...path.slice(0, match.index + 1), match.point];
  const remainingPath = [match.point, ...path.slice(match.index + 1)];
  return { traveledPath, remainingPath };
}

function sampleSegmentPath(path = []) {
  if (path.length <= 10) {
    return path;
  }
  return path.filter((_, index) => index === 0 || index === path.length - 1 || index % 4 === 0);
}

function navigationReducer(state, action) {
  switch (action.type) {
    case "select_lot":
      return {
        ...state,
        selectedLotId: action.lotId,
        isNavigating: false,
        routeInfo: null,
      };
    case "start_navigation":
      return {
        ...state,
        isNavigating: true,
      };
    case "set_route_info":
      return {
        ...state,
        routeInfo: action.routeInfo,
      };
    case "clear_navigation":
      return {
        selectedLotId: null,
        routeInfo: null,
        isNavigating: false,
      };
    default:
      return state;
  }
}

function LiveUserTracker({ enabled, isNavigating, trackedLocation, cameraLocked, onLocationUpdate }) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const markerRef = useRef(null);
  const lastPosRef = useRef(USER_LOCATION);
  const lastAccuracyRef = useRef(Infinity);
  const hasCenteredOnUserRef = useRef(false);
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
    if (enabled && trackedLocation) {
      markerRef.current.setPosition(trackedLocation);
      markerRef.current.setVisible(true);
    } else {
      markerRef.current.setVisible(false);
    }
  }, [trackedLocation, enabled]);

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
    if (!enabled || !navigator.geolocation || !markerRef.current) return;

    const applyPosition = (pos) => {
      const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const nextAccuracy = Number(pos.coords.accuracy) || Infinity;
      const oldPos = lastPosRef.current;
      const movedDistance = geometryLib && oldPos
        ? geometryLib.spherical.computeDistanceBetween(oldPos, newPos)
        : Infinity;
      const accuracyWorsened = nextAccuracy > lastAccuracyRef.current + 25;

      if (
        nextAccuracy > MAX_ACCEPTABLE_ACCURACY_METERS &&
        lastAccuracyRef.current < nextAccuracy
      ) {
        return;
      }

      if (
        Number.isFinite(movedDistance) &&
        movedDistance < MIN_LOCATION_DELTA_METERS &&
        accuracyWorsened
      ) {
        return;
      }

      if (map && (!hasCenteredOnUserRef.current || (isNavigating && cameraLocked))) {
        map.panTo(newPos);
        map.setZoom(isNavigating ? 19 : 17);
        hasCenteredOnUserRef.current = true;
      }

      lastPosRef.current = newPos;
      lastAccuracyRef.current = nextAccuracy;
      onUpdateRef.current(newPos);
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => console.log("[Commutr] getCurrentPosition failed", err),
      GEOLOCATION_OPTIONS
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const oldPos = lastPosRef.current;
        const nextAccuracy = Number(pos.coords.accuracy) || Infinity;
        const movedDistance = geometryLib && oldPos
          ? geometryLib.spherical.computeDistanceBetween(oldPos, newPos)
          : Infinity;
        const accuracyWorsened = nextAccuracy > lastAccuracyRef.current + 25;

        if (
          nextAccuracy > MAX_ACCEPTABLE_ACCURACY_METERS &&
          lastAccuracyRef.current < nextAccuracy
        ) {
          return;
        }

        if (
          Number.isFinite(movedDistance) &&
          movedDistance < MIN_LOCATION_DELTA_METERS &&
          accuracyWorsened
        ) {
          return;
        }

        if (markerRef.current) {
          let heading = markerRef.current.getIcon()?.rotation || 0;
          if (pos.coords.heading !== null && (!isNaN(pos.coords.heading)) && pos.coords.heading !== 0) {
            heading = pos.coords.heading;
          } else if (geometryLib && oldPos) {
             const calcHead = geometryLib.spherical.computeHeading(oldPos, newPos);
             if (geometryLib.spherical.computeDistanceBetween(oldPos, newPos) > 1) { 
                heading = calcHead;
             }
          }

          if (isNavigating && cameraLocked) {
             const icon = markerRef.current.getIcon();
             icon.rotation = heading;
             markerRef.current.setIcon(icon);
             if (map) map.panTo(trackedLocation || newPos);
          }
        }

        lastPosRef.current = newPos;
        lastAccuracyRef.current = nextAccuracy;
        onUpdateRef.current(newPos);
      },
      (err) => console.log("[Commutr] watchPosition failed", err),
      GEOLOCATION_OPTIONS
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, geometryLib, isNavigating, trackedLocation, cameraLocked, enabled]);

  return null;
}

function LotMarkers({ onSelectLot, selectedLotId, isNavigating }) {
  const map = useMap();
  const markersRef = useRef([]);
  const onSelectLotRef = useRef(onSelectLot);

  useEffect(() => {
    onSelectLotRef.current = onSelectLot;
  }, [onSelectLot]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    UTD_LOTS.forEach((lot) => {
      if (isNavigating && selectedLotId !== lot.id) return;

      const isVacant = lot.vacant;
      const svgColor = "%2300d0ff";
      const svgShadow = isVacant ? "%2300d0ff" : "%23005a70";
      const svgFill = "%230d0f1a";
      
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

      marker.addListener("click", () => onSelectLotRef.current(lot));
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
  const traveledPolylineRef = useRef(null);
  const remainingPolylineRef = useRef(null);
  const segmentsRef = useRef([]);
  const routePathRef = useRef([]);
  const entireDistanceRef = useRef(1);
  const baseDurationRef = useRef({ val: 0, text: "" });
  const lastProgressUpdateRef = useRef(0);
  const originRef = useRef(origin);
  const navigatingRef = useRef(isNavigating);
  const routeInfoRef = useRef(onRouteInfo);

  useEffect(() => {
    originRef.current = origin;
  }, [origin]);

  useEffect(() => {
    navigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    routeInfoRef.current = onRouteInfo;
  }, [onRouteInfo]);

  useEffect(() => {
    if (!routesLib || !map || !destination || !geometryLib) {
      if (traveledPolylineRef.current) traveledPolylineRef.current.setMap(null);
      if (remainingPolylineRef.current) remainingPolylineRef.current.setMap(null);
      traveledPolylineRef.current = null;
      remainingPolylineRef.current = null;
      segmentsRef.current = [];
      routePathRef.current = [];
      if (!destination && routeInfoRef.current) routeInfoRef.current(null);
      if (!navigatingRef.current && map) {
        map.setZoom(15.5);
        map.panTo({ lat: 32.986, lng: -96.750 });
      }
      return;
    }

    const svc = new routesLib.DirectionsService();
    svc.route(
      {
        origin: originRef.current,
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: { departureTime: new Date(), trafficModel: "bestguess" },
      },
      (response, status) => {
        if (status !== "OK" || !response.routes || response.routes.length === 0) return;

        if (traveledPolylineRef.current) traveledPolylineRef.current.setMap(null);
        if (remainingPolylineRef.current) remainingPolylineRef.current.setMap(null);
        traveledPolylineRef.current = null;
        remainingPolylineRef.current = null;

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
        const segments = [];

        entireDistanceRef.current = leg.distance.value;
        baseDurationRef.current = {
            val: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
            text: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text
        };

        leg.steps.forEach((step) => {
          segments.push({
            path: sampleSegmentPath(step.path),
            instruction: step.instructions.replace(/<[^>]*>?/gm, '')
          });

        });
        segmentsRef.current = segments;
        routePathRef.current = flattenRoutePath(leg.steps);

        traveledPolylineRef.current = new window.google.maps.Polyline({
          path: [],
          strokeColor: "#24404d",
          strokeOpacity: 0.85,
          strokeWeight: 6,
          map,
        });
        remainingPolylineRef.current = new window.google.maps.Polyline({
          path: routePathRef.current,
          strokeColor: "#5ee7ff",
          strokeOpacity: 0.95,
          strokeWeight: 6,
          map,
        });

        if (!navigatingRef.current) {
          map.fitBounds(route.bounds);
          const isMobile = window.innerWidth <= 768;
          map.panBy(0, isMobile ? -120 : 50);
        } else {
          map.setZoom(19);
        }

        if (routeInfoRef.current) {
          const firstInstruction = segments[0]?.instruction || "Head to the route";
          const initialMatch = findNearestPointOnPath(geometryLib, originRef.current, routePathRef.current);
          routeInfoRef.current({
            distanceText: leg.distance.text,
            distanceValue: leg.distance.value,
            durationSeconds: baseDurationRef.current.val,
            durationText: baseDurationRef.current.text,
            instruction: firstInstruction,
            progress: 0,
            snappedLocation: initialMatch?.point || null,
          });
        }
      }
    );

    return () => {
      if (traveledPolylineRef.current) traveledPolylineRef.current.setMap(null);
      if (remainingPolylineRef.current) remainingPolylineRef.current.setMap(null);
    };
  }, [routesLib, geometryLib, map, destination]);

  useEffect(() => {
     if (!isNavigating || !geometryLib || segmentsRef.current.length === 0 || !destination) return;

     const now = Date.now();
     if (now - lastProgressUpdateRef.current < ROUTE_PROGRESS_UPDATE_MS) {
        return;
     }
     lastProgressUpdateRef.current = now;

     let closestDist = Infinity;
     let currentInstruction = segmentsRef.current[0].instruction;
     const nearestMatch = findNearestPointOnPath(geometryLib, origin, routePathRef.current);
     const snapMatch = nearestMatch?.distanceToRoute <= ROUTE_SNAP_THRESHOLD_METERS ? nearestMatch : null;
     
     segmentsRef.current.forEach(seg => {
        for (let i = 0; i < seg.path.length; i += 3) { 
           const pt = seg.path[i];
           const dist = geometryLib.spherical.computeDistanceBetween(origin, pt);
           if (dist < closestDist) {
               closestDist = dist;
               currentInstruction = seg.instruction;
           }
        }
     });

     const referencePoint = snapMatch?.point || origin;
     const distRemaining = geometryLib.spherical.computeDistanceBetween(referencePoint, { lat: destination.lat, lng: destination.lng });
     let progress = snapMatch
       ? (snapMatch.distanceAlongRoute / Math.max(1, entireDistanceRef.current)) * 100
       : 100 - ((distRemaining / Math.max(1, entireDistanceRef.current)) * 100);
     progress = Math.max(0, Math.min(100, progress));

     if (snapMatch && traveledPolylineRef.current && remainingPolylineRef.current) {
        const { traveledPath, remainingPath } = splitPathAtMatch(routePathRef.current, snapMatch);
        traveledPolylineRef.current.setPath(traveledPath);
        remainingPolylineRef.current.setPath(remainingPath);
     } else if (traveledPolylineRef.current && remainingPolylineRef.current) {
        traveledPolylineRef.current.setPath([]);
        remainingPolylineRef.current.setPath(routePathRef.current);
     }

     if (routeInfoRef.current) {
        routeInfoRef.current({
            distanceText: (distRemaining * 0.000621371).toFixed(1) + " mi",
            distanceValue: distRemaining,
            durationSeconds: baseDurationRef.current.val,
            durationText: baseDurationRef.current.text,
            instruction: currentInstruction,
            progress: progress,
            snappedLocation: snapMatch?.point || null,
        });
     }
  }, [origin, isNavigating, geometryLib, destination]);

  return null;
}

function RecenterControl({ liveLocation, isNavigating, cameraLocked, onToggleLock }) {
  const map = useMap();

  const handleClick = () => {
    if (!map || !liveLocation) return;
    if (cameraLocked) {
      onToggleLock?.(false);
      return;
    }
    onToggleLock?.(true);
    map.panTo(liveLocation);
    map.setZoom(isNavigating ? 19 : 17);
  };

  return (
    <button
      className={`map-recenter-btn ${cameraLocked ? "active" : ""}`}
      type="button"
      onClick={handleClick}
      title={cameraLocked ? "Unlock camera follow" : "Lock camera follow"}
    >
      <LocateFixed size={18} />
    </button>
  );
}

export default function MapPane({ locationEnabled, navigationRequest, onNavigationStarted, onNavigationUpdate }) {
  const [navState, dispatch] = useReducer(navigationReducer, {
    selectedLotId: null,
    routeInfo: null,
    isNavigating: false,
  });
  const [liveLocation, setLiveLocation] = useState(USER_LOCATION);
  const [snappedLocation, setSnappedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cameraLocked, setCameraLocked] = useState(true);
  const onNavigationStartedRef = useRef(onNavigationStarted);
  const selectedLot = UTD_LOTS.find((lot) => lot.id === navState.selectedLotId) || null;
  const { routeInfo, isNavigating } = navState;

  useEffect(() => {
    onNavigationStartedRef.current = onNavigationStarted;
  }, [onNavigationStarted]);

  useEffect(() => {
    if (!navigationRequest?.lotId) return;
    const lotIdLower = navigationRequest.lotId.toLowerCase();
    const matchId = lotIdLower === "m_east" ? "m" : lotIdLower;
    const lot = UTD_LOTS.find(l => l.id === matchId);
    if (lot) {
      dispatch({ type: "select_lot", lotId: lot.id });
      if (navigationRequest.autoStart) {
        dispatch({ type: "start_navigation" });
        setCameraLocked(true);
      }
    }
    if (onNavigationStartedRef.current) onNavigationStartedRef.current();
  }, [navigationRequest]);

  useEffect(() => {
    if (!onNavigationUpdate) return;
    onNavigationUpdate({
      isNavigating,
      routeInfo,
      selectedLot,
    });
  }, [isNavigating, routeInfo, selectedLot, onNavigationUpdate]);

  useEffect(() => {
    if (!isNavigating || !selectedLot) return;
    const distanceMeters = window.google?.maps?.geometry?.spherical?.computeDistanceBetween?.(
      snappedLocation || liveLocation,
      { lat: selectedLot.lat, lng: selectedLot.lng }
    );

    if (typeof distanceMeters === "number" && distanceMeters <= ARRIVAL_THRESHOLD_METERS) {
      dispatch({ type: "clear_navigation" });
    }
  }, [isNavigating, liveLocation, snappedLocation, selectedLot]);

  useEffect(() => {
    if (!isNavigating) {
      setSnappedLocation(null);
      setCameraLocked(true);
    }
  }, [isNavigating]);

  const handleSelectLot = (lot) => {
    if (isNavigating) return;
    
    dispatch({ type: "select_lot", lotId: lot.id });
  };

  const handleCancelLine = () => {
    dispatch({ type: "clear_navigation" });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        defaultCenter={{ lat: 32.986, lng: -96.750 }}
        defaultZoom={15.5}
        disableDefaultUI={true}
        styles={mapStyles}
        style={{ width: "100%", height: "100%" }}
        onTilesLoaded={() => setMapLoaded(true)}
        onIdle={() => setMapLoaded(true)}
        onDragstart={() => setCameraLocked(false)}
      >
        <LiveUserTracker
          enabled={locationEnabled}
          isNavigating={isNavigating}
          trackedLocation={isNavigating && snappedLocation ? snappedLocation : liveLocation}
          cameraLocked={cameraLocked}
          onLocationUpdate={setLiveLocation}
        />
        <LotMarkers onSelectLot={handleSelectLot} selectedLotId={selectedLot?.id} isNavigating={isNavigating} />
        {locationEnabled && (
          <>
            <RouteOverlay
              origin={liveLocation}
              destination={selectedLot}
              onRouteInfo={(nextRouteInfo) => {
                if (nextRouteInfo?.snappedLocation) {
                  setSnappedLocation(nextRouteInfo.snappedLocation);
                }
                dispatch({
                  type: "set_route_info",
                  routeInfo: nextRouteInfo
                    ? {
                        ...nextRouteInfo,
                        snappedLocation: undefined,
                      }
                    : nextRouteInfo,
                });
              }}
              isNavigating={isNavigating}
            />
            <RecenterControl
              liveLocation={isNavigating && snappedLocation ? snappedLocation : liveLocation}
              isNavigating={isNavigating}
              cameraLocked={cameraLocked}
              onToggleLock={(nextLocked) => setCameraLocked(nextLocked)}
            />
          </>
        )}
      </Map>

      {!mapLoaded && (
        <div className="map-loading-overlay">
          <div className="map-loading-spinner" />
          <div className="map-loading-label">Loading map</div>
        </div>
      )}

      {locationEnabled && selectedLot && !isNavigating && (
        <LocationPanel 
          locationName={selectedLot.name}
          address="UT-Dallas Campus"
          estimatedTime={routeInfo ? Math.round(routeInfo.durationSeconds / 60) : "--"}
          distance={routeInfo ? parseFloat(routeInfo.distanceText.replace(/[^\d.-]/g, '')) : 0}
          availableSpots={selectedLot.vacant ? (SIMULATED_AVAILABLE_SPOTS[selectedLot.id] || 0) : 0}
          onStartRoute={() => {
            setCameraLocked(true);
            dispatch({ type: "start_navigation" });
          }}
          onCancel={handleCancelLine}
        />
      )}

      {locationEnabled && selectedLot && isNavigating && routeInfo && (
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
