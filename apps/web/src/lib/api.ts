import { env } from "./env";
import { supabase } from "./supabase";

// Types used by the frontend when calling our backend.
export type Venue = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  allowed_radius_m: number;
  is_active: boolean;
};

async function authHeader() {
  // We rely on the Supabase session managed in the browser.
  // The token is then passed to the backend API as a Bearer header.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export async function fetchVenues(): Promise<Venue[]> {
  // Learner list intentionally returns active venues only (enforced by API).
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/venues`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load venues");
  return json.venues as Venue[];
}

export type ClockInResult =
  | { ok: true; venueName: string; distanceM: number; allowedRadiusM: number; clockedInAt?: string }
  | { ok: false; reason: "OUTSIDE_RADIUS"; venueName: string; distanceM: number; allowedRadiusM: number };

export async function clockIn(input: { venueId: string; clientLatitude: number; clientLongitude: number }) {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${env.API_BASE_URL}/clock-in`, {
    method: "POST",
    headers,
    body: JSON.stringify(input)
  });
  const json = await res.json();
  if (res.ok) return json as ClockInResult;
  // Outside-radius is a handled business outcome (not a technical failure),
  // so we return the payload for user-friendly feedback instead of throwing.
  if (res.status === 403 && json.reason === "OUTSIDE_RADIUS") return json as ClockInResult;
  throw new Error(json.error ?? "Clock-in failed");
}

export type TodayClockInRow = {
  id: string;
  clockedInAt: string;
  distanceM: number;
  venue: { id: string; name: string };
  learner: { id: string; fullName: string };
};

export async function fetchTodayClockIns(): Promise<TodayClockInRow[]> {
  // Admin/facilitator-only endpoint for dashboard "Today" table.
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/admin/clock-ins/today`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load clock-ins");
  return json.clockIns as TodayClockInRow[];
}

export type AdminVenue = Venue & {
  created_at: string;
  updated_at: string;
};

export type VenueUpsertInput = {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  allowedRadiusM: number;
  isActive?: boolean;
};

export async function fetchAdminVenues(): Promise<AdminVenue[]> {
  // Management view includes inactive venues so staff can reactivate when needed.
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/admin/venues`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load venues");
  return json.venues as AdminVenue[];
}

export async function createVenue(input: VenueUpsertInput): Promise<{ id: string }> {
  // Create operation returns the new id so callers can react if needed.
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${env.API_BASE_URL}/admin/venues`, { method: "POST", headers, body: JSON.stringify(input) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create venue");
  return json as { id: string };
}

export async function updateVenue(venueId: string, input: Partial<VenueUpsertInput>): Promise<void> {
  // Partial updates keep payloads small and map directly to PATCH semantics.
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${env.API_BASE_URL}/admin/venues/${venueId}`, { method: "PATCH", headers, body: JSON.stringify(input) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update venue");
}

export async function deleteVenue(venueId: string): Promise<void> {
  // API enforces "no delete if clock-ins exist" to preserve attendance history.
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/admin/venues/${venueId}`, { method: "DELETE", headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete venue");
}

