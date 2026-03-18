import { useEffect, useMemo, useState } from "react";
import type { Profile } from "../../lib/profile";
import { clockIn, fetchVenues, type Venue, type ClockInResult } from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";

import { MapPreview } from "../components/MapPreview";

type GeoStatus =
  | { state: "idle" }
  | { state: "requesting" }
  | { state: "ready"; coords: { lat: number; lon: number; accuracyM: number } }
  | { state: "error"; message: string };

function requestLocation(): Promise<{ lat: number; lon: number; accuracyM: number }> {
  // Wrap geolocation API into a Promise so the UI can be handled with async/await.
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported by this browser."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracyM: pos.coords.accuracy }),
      (err) => reject(new Error(err.message || "Failed to get location.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export function LearnerPage({ profile }: { profile: Profile }) {
  // Learner flow state:
  // - select venue
  // - request browser geolocation
  // - submit to backend for server-side radius validation
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<string>("");
  const [geo, setGeo] = useState<GeoStatus>({ state: "idle" });
  const [result, setResult] = useState<ClockInResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues()
      .then((v) => {
        setVenues(v);
        if (v.length && !venueId) setVenueId(v[0]!.id);
      })
      .catch((e: unknown) => setError(getErrorMessage(e) ?? "Failed to load venues"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => venues.find((v) => v.id === venueId) ?? null, [venues, venueId]);

  return (
    <div className="grid">
      <div className="card">
        <h2>Clock in</h2>
        <div className="hint">
          Signed in as <span className="pill">{profile.full_name}</span>. Your browser location must be within the venue radius.
        </div>
        <div style={{ height: 12 }} />
        <div className="field">
          <div className="label">Venue</div>
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.allowed_radius_m}m)
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <div className="hint">
            <div className="row">
              <span className="pill">Allowed radius: {selected.allowed_radius_m}m</span>
              {selected.address ? <span className="pill">{selected.address}</span> : null}
            </div>
          </div>
        ) : null}

        <div style={{ height: 10 }} />

        <div className="row">
          <button
            className="btn"
            disabled={geo.state === "requesting" || busy}
            onClick={async () => {
              setGeo({ state: "requesting" });
              setError(null);
              setResult(null);
              try {
                const coords = await requestLocation();
                setGeo({ state: "ready", coords });
              } catch (e: unknown) {
                setGeo({ state: "error", message: getErrorMessage(e) ?? "Location error" });
              }
            }}
          >
            {geo.state === "requesting" ? "Getting location…" : "Get my location"}
          </button>

          <button
            className="btn primary"
            disabled={busy || geo.state !== "ready" || !venueId}
            onClick={async () => {
              if (geo.state !== "ready") return;
              setBusy(true);
              setError(null);
              setResult(null);
              try {
                const r = await clockIn({
                  venueId,
                  clientLatitude: geo.coords.lat,
                  clientLongitude: geo.coords.lon
                });
                setResult(r);
              } catch (e: unknown) {
                setError(getErrorMessage(e) ?? "Clock-in failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Clocking in…" : "Clock in"}
          </button>
        </div>

        <div style={{ height: 12 }} />
        {geo.state === "ready" ? (
          <div className="alert">
            Location ready. Accuracy ~{Math.round(geo.coords.accuracyM)}m.
          </div>
        ) : geo.state === "error" ? (
          <div className="alert bad">{geo.message}</div>
        ) : null}

        {selected ? (
          <div style={{ marginTop: 12 }}>
            <MapPreview
              venue={{
                lat: selected.latitude,
                lon: selected.longitude,
                radiusM: selected.allowed_radius_m,
                name: selected.name
              }}
              user={geo.state === "ready" ? { lat: geo.coords.lat, lon: geo.coords.lon, accuracyM: geo.coords.accuracyM } : undefined}
            />
          </div>
        ) : null}

        {result ? (
          <div style={{ marginTop: 12 }}>
            {result.ok ? (
              <div className="alert good">
                Clock-in accepted at <b>{result.venueName}</b>. Distance {Math.round(result.distanceM)}m (allowed {result.allowedRadiusM}m).
              </div>
            ) : (
              <div className="alert bad">
                Clock-in rejected for <b>{result.venueName}</b>. You are {Math.round(result.distanceM)}m away (allowed {result.allowedRadiusM}m).
              </div>
            )}
          </div>
        ) : null}

        {error ? (
          <div style={{ marginTop: 12 }}>
            <div className="alert bad">{error}</div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>Tips</h2>
        <div className="hint">
          - Use HTTPS in production (browsers often require it for geolocation).<br />
          - If you’re testing locally, allow location permission and try “high accuracy”.<br />- On laptops/desktops, accuracy can be much worse than on
          a phone.
        </div>
      </div>
    </div>
  );
}

