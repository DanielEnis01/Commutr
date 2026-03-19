const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#0d0f1a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8d93ad" }] },
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
    stylers: [{ color: "#d7ddf0" }]
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
    stylers: [{ color: "#636a86" }]
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
    stylers: [{ color: "#737a98" }]
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
    stylers: [{ color: "#1c2034" }]
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8d93ad" }]
  }
];

export default mapStyles;
