import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type Props = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  currentLat?: number;
  currentLng?: number;
};

// Component to recenter map when coordinates change
function ChangeView({ center, bounds }: { center: [number, number], bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
        map.fitBounds(bounds, { padding: [20, 20] });
    } else {
        map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
}

export default function MapComponent({ startLat, startLng, endLat, endLng, currentLat, currentLng }: Props) {
  const center: [number, number] = [
    (startLat + endLat) / 2,
    (startLng + endLng) / 2
  ];

  const bounds: L.LatLngBoundsExpression = [
      [startLat, startLng],
      [endLat, endLng]
  ];

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={center} bounds={bounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[startLat, startLng]}>
          <Popup>Start Location</Popup>
        </Marker>
        <Marker position={[endLat, endLng]}>
          <Popup>End Location</Popup>
        </Marker>

        {currentLat !== undefined && currentLng !== undefined && (
             <Marker position={[currentLat, currentLng]} zIndexOffset={1000}>
                <Popup>Current Location</Popup>
             </Marker>
        )}

        <Polyline positions={[[startLat, startLng], [endLat, endLng]]} color="blue" />
      </MapContainer>
    </div>
  );
}
