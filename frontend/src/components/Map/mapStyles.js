const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#0d0f1a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "rgba(255,255,255,0.5)" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0f1a" }, { weight: 3 }] },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#1a1d30" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0d0f1a" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#252945" }, { weight: 2 }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1d30" }, { weight: 0.5 }]
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "rgba(255,255,255,0.75)" }]
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry.fill",
    stylers: [{ color: "#252945" }]
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1d30" }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#1f233a" }, { weight: 1.5 }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0d0f1a" }, { weight: 0.3 }]
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "#1a1d30" }, { weight: 1 }]
  },
  {
    featureType: "road.local",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0d0f1a" }, { weight: 0.2 }]
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "rgba(255,255,255,0.35)" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#07080f" }]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#0d0f1a" }]
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.fill",
    stylers: [{ color: "#10121e" }]
  },
  {
    featureType: "poi.school",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.school",
    elementType: "labels.text.fill",
    stylers: [{ color: "rgba(255, 255, 255, 0.40)" }]
  },
  {
    featureType: "poi.school",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0d0f1a" }, { weight: 4 }]
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "rgba(255, 255, 255, 0.08)" }]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "rgba(255,255,255,0.5)" }]
  }
];

export default mapStyles;
