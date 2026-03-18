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
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/admin/venues`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load venues");
  return json.venues as AdminVenue[];
}

export async function createVenue(input: VenueUpsertInput): Promise<{ id: string }> {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${env.API_BASE_URL}/admin/venues`, { method: "POST", headers, body: JSON.stringify(input) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to create venue");
  return json as { id: string };
}

export async function updateVenue(venueId: string, input: Partial<VenueUpsertInput>): Promise<void> {
  const headers = { ...(await authHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${env.API_BASE_URL}/admin/venues/${venueId}`, { method: "PATCH", headers, body: JSON.stringify(input) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to update venue");
}

export async function deleteVenue(venueId: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${env.API_BASE_URL}/admin/venues/${venueId}`, { method: "DELETE", headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to delete venue");
}

