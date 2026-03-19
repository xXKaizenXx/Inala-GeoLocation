import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { haversineDistanceMeters } from "./lib/geo.js";
import { env } from "./lib/env.js";
import { asyncHandler, errorHandler } from "./lib/http.js";
import { requireUser, supabaseAdmin } from "./lib/supabase.js";

// Express API for the "Geo Location Clock In" application.
// Responsibilities:
// - Validate learner proximity to venue on clock-in
// - Provide admin views for today's clock-ins
// - Manage venues (CRUD) for facilitators/admins
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Learner-facing: returns only active venues for the dropdown.
app.get(
  "/venues",
  asyncHandler(async (req, res) => {
    await requireUser(req.header("authorization"));
    const { data, error } = await supabaseAdmin
      .from("venues")
      .select("id,name,address,latitude,longitude,allowed_radius_m,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw error;
    res.json({ venues: data ?? [] });
  })
);

async function requireAdminOrFacilitatorRole(userId: string) {
  // Role checks are performed from the `profiles` table (not JWT custom claims),
  // so permission changes take effect immediately without token refresh.
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile || (profile.role !== "admin" && profile.role !== "facilitator")) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return profile.role as "admin" | "facilitator";
}

const VenueUpsertSchema = z.object({
  name: z.string().min(2),
  address: z.string().max(250).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  allowedRadiusM: z.number().int().positive().max(2000),
  isActive: z.boolean().optional()
});

// Shape expected by create/update venue endpoints.
// `allowedRadiusM` and `isActive` use frontend-friendly naming and are mapped
// to DB columns (`allowed_radius_m`, `is_active`) when persisted.
// Facilitator/admin: list venues (includes inactive) so staff can manage locations.
app.get(
  "/admin/venues",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    await requireAdminOrFacilitatorRole(user.id);

    const { data, error } = await supabaseAdmin
      .from("venues")
      .select("id,name,address,latitude,longitude,allowed_radius_m,is_active,created_at,updated_at")
      .order("name", { ascending: true });
    if (error) throw error;
    res.json({ venues: data ?? [] });
  })
);

// Facilitator/admin: create venue.
app.post(
  "/admin/venues",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    await requireAdminOrFacilitatorRole(user.id);

    const body = VenueUpsertSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from("venues")
      .insert({
        name: body.name,
        address: body.address ?? null,
        latitude: body.latitude,
        longitude: body.longitude,
        allowed_radius_m: body.allowedRadiusM,
        is_active: body.isActive ?? true
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    res.status(201).json({ id: data?.id });
  })
);

// Facilitator/admin: update venue fields.
app.patch(
  "/admin/venues/:id",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    await requireAdminOrFacilitatorRole(user.id);

    const venueId = z.string().uuid().parse(req.params.id);
    const body = VenueUpsertSchema.partial().parse(req.body);

    // Build a partial update object so omitted fields are left untouched.
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.address !== undefined) update.address = body.address;
    if (body.latitude !== undefined) update.latitude = body.latitude;
    if (body.longitude !== undefined) update.longitude = body.longitude;
    if (body.allowedRadiusM !== undefined) update.allowed_radius_m = body.allowedRadiusM;
    if (body.isActive !== undefined) update.is_active = body.isActive;

    const { error } = await supabaseAdmin.from("venues").update(update).eq("id", venueId);
    if (error) throw error;
    res.json({ ok: true });
  })
);

// Facilitator/admin: delete venue only if it has no clock-ins.
// This avoids FK constraint failures and preserves attendance history.
app.delete(
  "/admin/venues/:id",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    await requireAdminOrFacilitatorRole(user.id);

    const venueId = z.string().uuid().parse(req.params.id);

    const { count, error: countErr } = await supabaseAdmin
      .from("clock_ins")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId);
    if (countErr) throw countErr;

    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error: "This venue has clock-ins and cannot be deleted. Deactivate it instead to preserve attendance history.",
        code: "VENUE_HAS_CLOCK_INS"
      });
    }

    const { error: delErr } = await supabaseAdmin.from("venues").delete().eq("id", venueId);
    if (delErr) throw delErr;

    res.json({ ok: true });
  })
);

const ClockInSchema = z.object({
  venueId: z.string().uuid(),
  clientLatitude: z.number().min(-90).max(90),
  clientLongitude: z.number().min(-180).max(180)
});

// Learner-facing: validates that the client is within the venue's allowed radius,
// then inserts a `clock_ins` row.
app.post(
  "/clock-in",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    const body = ClockInSchema.parse(req.body);

    const { data: venue, error: venueErr } = await supabaseAdmin
      .from("venues")
      .select("id,name,latitude,longitude,allowed_radius_m,is_active")
      .eq("id", body.venueId)
      .maybeSingle();
    if (venueErr) throw venueErr;
    if (!venue || !venue.is_active) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const distanceM = haversineDistanceMeters(
      { lat: body.clientLatitude, lon: body.clientLongitude },
      { lat: venue.latitude, lon: venue.longitude }
    );

    // Geofence rule: outside-radius attempts are rejected but returned with
    // distance metadata so the UI can explain exactly why it failed.
    if (distanceM > venue.allowed_radius_m) {
      return res.status(403).json({
        ok: false,
        reason: "OUTSIDE_RADIUS",
        distanceM,
        allowedRadiusM: venue.allowed_radius_m,
        venueName: venue.name
      });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id,role,full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) return res.status(403).json({ error: "Profile missing. Contact admin." });
    // Only learners can submit attendance entries.
    if (profile.role !== "learner") return res.status(403).json({ error: "Only learners can clock in." });

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("clock_ins")
      .insert({
        learner_id: user.id,
        venue_id: venue.id,
        client_latitude: body.clientLatitude,
        client_longitude: body.clientLongitude,
        distance_m: distanceM
      })
      .select("id,clocked_in_at")
      .maybeSingle();
    if (insertErr) throw insertErr;

    res.json({
      ok: true,
      clockInId: inserted?.id,
      clockedInAt: inserted?.clocked_in_at,
      distanceM,
      allowedRadiusM: venue.allowed_radius_m,
      venueName: venue.name
    });
  })
);

// Facilitator/admin: returns today's clock-ins with venue + learner names.
app.get(
  "/admin/clock-ins/today",
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.header("authorization"));
    await requireAdminOrFacilitatorRole(user.id);

    const start = new Date();
    // "Today" is interpreted in server local time for this assessment app.
    // For production, consider an explicit timezone policy.
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from("clock_ins")
      .select(
        `
        id,
        clocked_in_at,
        distance_m,
        venues:venue_id ( id, name ),
        profiles:learner_id ( id, full_name )
      `
      )
      .gte("clocked_in_at", start.toISOString())
      .order("clocked_in_at", { ascending: false });
    if (error) throw error;

    const rows =
      // Flatten joined Supabase shape into the frontend contract.
      data?.map((r: any) => ({
        id: r.id,
        clockedInAt: r.clocked_in_at,
        distanceM: r.distance_m,
        venue: { id: r.venues?.id, name: r.venues?.name },
        learner: { id: r.profiles?.id, fullName: r.profiles?.full_name }
      })) ?? [];

    res.json({ clockIns: rows });
  })
);

app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.PORT}`);
});

