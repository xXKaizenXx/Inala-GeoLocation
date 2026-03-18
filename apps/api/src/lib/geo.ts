const EARTH_RADIUS_M = 6371000;

// Haversine distance formula.
// We treat inputs as latitude/longitude in degrees and return distance in meters.
function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

