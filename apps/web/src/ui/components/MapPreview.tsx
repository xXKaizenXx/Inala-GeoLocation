import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const venueIcon = L.divIcon({
  className: "emojiMarker",
  html: `<div class="emojiMarkerInner" title="Venue">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26]
});

const userIcon = L.divIcon({
  className: "emojiMarker",
  html: `<div class="emojiMarkerInner" title="You">🧍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26]
});

type Props = {
  // `venue` is always required: we draw the venue marker and the allowed-radius circle.
  // `user` is optional: when provided we draw a user marker + accuracy radius ring.
  venue: { lat: number; lon: number; radiusM: number; name: string };
  user?: { lat: number; lon: number; accuracyM?: number };
};

function MapAutoFocus({ venue, user }: { venue: Props["venue"]; user?: Props["user"] }) {
  const map = useMap();

  // We fit bounds to keep the newly selected venue (and optionally the user)
  // visible without requiring manual panning/zooming.
  const venueLatLng = L.latLng(venue.lat, venue.lon);
  const userLatLng = user ? L.latLng(user.lat, user.lon) : null;

  // Approximate venue "radius" bounds. Leaflet uses meters, so this is accurate enough.
  const venueBounds = venueLatLng.toBounds(venue.radiusM * 2);

  const bounds = userLatLng ? venueBounds.extend(userLatLng) : venueBounds;

  // Avoid aggressive zoom-in on tiny radii; let fitBounds choose, but cap max zoom.
  map.fitBounds(bounds, {
    padding: [22, 22],
    maxZoom: 17,
    animate: true
  });

  return null;
}

export function MapPreview({ venue, user }: Props) {
  // Center the map on the user if we have a position; otherwise center on the venue.
  const center: [number, number] = user ? [user.lat, user.lon] : [venue.lat, venue.lon];

  return (
    <div className="mapWrap" aria-label="Map preview">
      <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="map">
        <MapAutoFocus venue={venue} user={user} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[venue.lat, venue.lon]} icon={venueIcon} />
        <Circle
          center={[venue.lat, venue.lon]}
          radius={venue.radiusM}
          pathOptions={{ color: "#2b8a6e", fillColor: "#2b8a6e", fillOpacity: 0.12, weight: 2 }}
        />

        {user ? (
          <>
            <Marker position={[user.lat, user.lon]} icon={userIcon} />
            {typeof user.accuracyM === "number" ? (
              <Circle
                center={[user.lat, user.lon]}
                radius={user.accuracyM}
                pathOptions={{ color: "#6d5bd0", fillColor: "#6d5bd0", fillOpacity: 0.08, weight: 1 }}
              />
            ) : null}
          </>
        ) : null}
      </MapContainer>
      <div className="mapLegend">
        <span className="legendDot legendDot--venue" /> {venue.name}
        <span style={{ width: 10, display: "inline-block" }} />
        <span className="legendDot legendDot--user" /> You
      </div>
    </div>
  );
}

export default MapPreview;

