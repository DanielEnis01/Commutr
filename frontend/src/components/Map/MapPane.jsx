import { Map } from "@vis.gl/react-google-maps";

export default function MapPane() {
  return (
    <Map
      defaultCenter={{ lat: 32.9886, lng: -96.7479 }}
      defaultZoom={16}
      disableDefaultUI={true}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
