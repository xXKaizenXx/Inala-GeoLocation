import { useEffect, useMemo, useState } from "react";
import {
  createVenue,
  deleteVenue,
  fetchAdminVenues,
  fetchTodayClockIns,
  updateVenue,
  type AdminVenue,
  type TodayClockInRow,
  type VenueUpsertInput
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errors";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function requestLocation(): Promise<{ lat: number; lon: number; accuracyM: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported by this browser."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracyM: pos.coords.accuracy }),
      (err) => reject(new Error(err.message || "Failed to get location.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

type Tab = "clockins" | "venues";

export function AdminPage() {
  // Facilitator/Admin dashboard includes two main sections:
  // - Today clock-ins (read-only view)
  // - Venues (create/update/activate/deactivate/delete-safe)
  const [tab, setTab] = useState<Tab>("clockins");
  const [rows, setRows] = useState<TodayClockInRow[]>([]);
  const [loadingClockIns, setLoadingClockIns] = useState(true);
  const [clockInError, setClockInError] = useState<string | null>(null);

  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueError, setVenueError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createDraft, setCreateDraft] = useState<VenueUpsertInput>({
    name: "",
    address: "",
    latitude: 0,
    longitude: 0,
    allowedRadiusM: 200,
    isActive: true
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editDraft, setEditDraft] = useState<VenueUpsertInput | null>(null);

  async function loadClockIns() {
    setLoadingClockIns(true);
    setClockInError(null);
    try {
      const r = await fetchTodayClockIns();
      setRows(r);
    } catch (e: unknown) {
      setClockInError(getErrorMessage(e) ?? "Failed to load");
    } finally {
      setLoadingClockIns(false);
    }
  }

  async function loadVenues() {
    setLoadingVenues(true);
    setVenueError(null);
    try {
      const v = await fetchAdminVenues();
      setVenues(v);
    } catch (e: unknown) {
      setVenueError(getErrorMessage(e) ?? "Failed to load venues");
    } finally {
      setLoadingVenues(false);
    }
  }

  useEffect(() => {
    loadClockIns();
    loadVenues();
  }, []);

  const activeCount = useMemo(() => venues.filter((v) => v.is_active).length, [venues]);

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2>Facilitator dashboard</h2>
            <div className="hint">View today’s clock-ins and manage venues.</div>
          </div>
          <div className="row">
            <button className={tab === "clockins" ? "btn primary" : "btn"} onClick={() => setTab("clockins")}>
              Today
            </button>
            <button className={tab === "venues" ? "btn primary" : "btn"} onClick={() => setTab("venues")}>
              Venues <span className="pill" style={{ marginLeft: 8 }}>{activeCount} active</span>
            </button>
          </div>
        </div>
        <div style={{ height: 12 }} />

        {tab === "clockins" ? (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="hint">Learner, time, venue, and distance to venue.</div>
              </div>
              <button className="btn" onClick={loadClockIns} disabled={loadingClockIns}>
                {loadingClockIns ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div style={{ height: 12 }} />

            {clockInError ? <div className="alert bad">{clockInError}</div> : null}

            <table>
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="hint">{loadingClockIns ? "Loading…" : "No clock-ins yet today."}</div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.learner.fullName}</td>
                      <td>{formatTime(r.clockedInAt)}</td>
                      <td>{r.venue.name}</td>
                      <td>{Math.round(r.distanceM)}m</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="hint">Create, edit, and activate/deactivate venues.</div>
              <div className="row">
                <button
                  className="btn primary"
                  onClick={() => {
                    setCreateOpen((v) => !v);
                    setVenueError(null);
                  }}
                >
                  {createOpen ? "Close" : "New venue"}
                </button>
                <button className="btn" onClick={loadVenues} disabled={loadingVenues}>
                  {loadingVenues ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            {createOpen ? (
              <div style={{ marginTop: 12 }} className="card" aria-label="Create venue">
                <h2>Create venue</h2>
                <div className="field">
                  <div className="label">Name</div>
                  <input value={createDraft.name} onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="field">
                  <div className="label">Address (optional)</div>
                  <input
                    value={createDraft.address ?? ""}
                    onChange={(e) => setCreateDraft((d) => ({ ...d, address: e.target.value }))}
                    placeholder="e.g. 123 Main St"
                  />
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="hint">Tip: autofill lat/lon from your browser location.</div>
                  <button
                    className="btn"
                    onClick={async () => {
                      setVenueError(null);
                      try {
                        const loc = await requestLocation();
                        setCreateDraft((d) => ({ ...d, latitude: loc.lat, longitude: loc.lon }));
                      } catch (e: unknown) {
                        setVenueError(getErrorMessage(e));
                      }
                    }}
                  >
                    Use my current location
                  </button>
                </div>
                <div className="row">
                  <div className="field" style={{ flex: 1 }}>
                    <div className="label">Latitude</div>
                    <input
                      value={String(createDraft.latitude)}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, latitude: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <div className="label">Longitude</div>
                    <input
                      value={String(createDraft.longitude)}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, longitude: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <div className="label">Allowed radius (m)</div>
                    <input
                      value={String(createDraft.allowedRadiusM)}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, allowedRadiusM: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <label className="hint">
                    <input
                      type="checkbox"
                      checked={createDraft.isActive ?? true}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, isActive: e.target.checked }))}
                      style={{ marginRight: 8 }}
                    />
                    Active
                  </label>
                  <button
                    className="btn primary"
                    disabled={createBusy}
                    onClick={async () => {
                      setCreateBusy(true);
                      setVenueError(null);
                      try {
                        if (!createDraft.name.trim()) throw new Error("Name is required");
                        await createVenue({
                          ...createDraft,
                          address: createDraft.address?.trim() ? createDraft.address : null
                        });
                        setCreateDraft({ name: "", address: "", latitude: 0, longitude: 0, allowedRadiusM: 200, isActive: true });
                        setCreateOpen(false);
                        await loadVenues();
                      } catch (e: unknown) {
                        setVenueError(getErrorMessage(e));
                      } finally {
                        setCreateBusy(false);
                      }
                    }}
                  >
                    {createBusy ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ height: 12 }} />
            {venueError ? <div className="alert bad">{venueError}</div> : null}

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Coords</th>
                  <th>Radius</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="hint">{loadingVenues ? "Loading…" : "No venues found."}</div>
                    </td>
                  </tr>
                ) : (
                  venues.map((v) => (
                    <>
                      <tr key={v.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{v.name}</div>
                          {v.address ? <div className="hint">{v.address}</div> : null}
                        </td>
                        <td className="hint">
                          {v.latitude.toFixed(6)}, {v.longitude.toFixed(6)}
                        </td>
                        <td>{v.allowed_radius_m}m</td>
                        <td>
                          <span className={v.is_active ? "pill pill--active" : "pill pill--inactive"}>{v.is_active ? "active" : "inactive"}</span>
                        </td>
                        <td className="hint">{formatDateTime(v.updated_at)}</td>
                        <td>
                          <div className="row">
                            <button
                              className={v.is_active ? "btn btn--subtle" : "btn btn--success"}
                              onClick={async () => {
                                const next = !v.is_active;
                                try {
                                  setVenueError(null);
                                  await updateVenue(v.id, { isActive: next });
                                  await loadVenues();
                                } catch (e: unknown) {
                                  setVenueError(getErrorMessage(e));
                                }
                              }}
                            >
                              {v.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="btn btn--subtle"
                              onClick={() => {
                                if (editingId === v.id) {
                                  setEditingId(null);
                                  setEditDraft(null);
                                  return;
                                }
                                setVenueError(null);
                                setEditingId(v.id);
                                setEditDraft({
                                  name: v.name,
                                  address: v.address ?? "",
                                  latitude: v.latitude,
                                  longitude: v.longitude,
                                  allowedRadiusM: v.allowed_radius_m,
                                  isActive: v.is_active
                                });
                              }}
                            >
                              {editingId === v.id ? "Close" : "Edit"}
                            </button>
                            <button
                              className="btn btn--danger"
                              onClick={async () => {
                                const ok = confirm(
                                  "Delete this venue?\n\nThis will only work if the venue has no clock-ins. If it has clock-ins, deactivate it instead."
                                );
                                if (!ok) return;
                                try {
                                  setVenueError(null);
                                  await deleteVenue(v.id);
                                  if (editingId === v.id) {
                                    setEditingId(null);
                                    setEditDraft(null);
                                  }
                                  await loadVenues();
                                } catch (e: unknown) {
                                  setVenueError(getErrorMessage(e));
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {editingId === v.id && editDraft ? (
                        <tr key={`${v.id}-edit`}>
                          <td colSpan={6}>
                            <div className="card" style={{ marginTop: 10 }}>
                              <h2>Edit venue</h2>
                              <div className="row" style={{ alignItems: "flex-end" }}>
                                <div className="field" style={{ flex: 1 }}>
                                  <div className="label">Name</div>
                                  <input value={editDraft.name} onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))} />
                                </div>
                                <div className="field" style={{ flex: 1 }}>
                                  <div className="label">Address</div>
                                  <input
                                    value={editDraft.address ?? ""}
                                    onChange={(e) => setEditDraft((d) => (d ? { ...d, address: e.target.value } : d))}
                                  />
                                </div>
                                <div className="field" style={{ width: 160 }}>
                                  <div className="label">Radius (m)</div>
                                  <input
                                    value={String(editDraft.allowedRadiusM)}
                                    onChange={(e) => setEditDraft((d) => (d ? { ...d, allowedRadiusM: Number(e.target.value) } : d))}
                                  />
                                </div>
                              </div>

                              <div className="row" style={{ alignItems: "flex-end" }}>
                                <div className="field" style={{ width: 240 }}>
                                  <div className="label">Location</div>
                                  <button
                                    className="btn"
                                    onClick={async () => {
                                      setVenueError(null);
                                      try {
                                        const loc = await requestLocation();
                                        setEditDraft((d) => (d ? { ...d, latitude: loc.lat, longitude: loc.lon } : d));
                                      } catch (e: unknown) {
                                        setVenueError(getErrorMessage(e));
                                      }
                                    }}
                                  >
                                    Use my current location
                                  </button>
                                  <div className="hint">Fills lat/lon from browser</div>
                                </div>
                                <div className="field" style={{ flex: 1 }}>
                                  <div className="label">Latitude</div>
                                  <input
                                    value={String(editDraft.latitude)}
                                    onChange={(e) => setEditDraft((d) => (d ? { ...d, latitude: Number(e.target.value) } : d))}
                                  />
                                </div>
                                <div className="field" style={{ flex: 1 }}>
                                  <div className="label">Longitude</div>
                                  <input
                                    value={String(editDraft.longitude)}
                                    onChange={(e) => setEditDraft((d) => (d ? { ...d, longitude: Number(e.target.value) } : d))}
                                  />
                                </div>
                                <div className="field" style={{ width: 160 }}>
                                  <div className="label">Active</div>
                                  <label className="hint" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
                                    <input
                                      type="checkbox"
                                      checked={editDraft.isActive ?? true}
                                      onChange={(e) => setEditDraft((d) => (d ? { ...d, isActive: e.target.checked } : d))}
                                    />
                                    Enabled
                                  </label>
                                </div>
                              </div>

                              <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                                <div className="hint">Updates save to Supabase immediately via the API.</div>
                                <div className="row">
                                  <button
                                    className="btn"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditDraft(null);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="btn primary"
                                    disabled={editBusy}
                                    onClick={async () => {
                                      if (!editDraft) return;
                                      setEditBusy(true);
                                      setVenueError(null);
                                      try {
                                        if (!editDraft.name.trim()) throw new Error("Name is required");
                                        if (!Number.isFinite(editDraft.allowedRadiusM) || editDraft.allowedRadiusM <= 0)
                                          throw new Error("Radius must be a positive number");
                                        if (!Number.isFinite(editDraft.latitude) || editDraft.latitude < -90 || editDraft.latitude > 90)
                                          throw new Error("Latitude must be between -90 and 90");
                                        if (!Number.isFinite(editDraft.longitude) || editDraft.longitude < -180 || editDraft.longitude > 180)
                                          throw new Error("Longitude must be between -180 and 180");

                                        await updateVenue(v.id, {
                                          name: editDraft.name.trim(),
                                          address: editDraft.address?.trim() ? editDraft.address.trim() : null,
                                          latitude: editDraft.latitude,
                                          longitude: editDraft.longitude,
                                          allowedRadiusM: Math.round(editDraft.allowedRadiusM),
                                          isActive: editDraft.isActive ?? true
                                        });
                                        setEditingId(null);
                                        setEditDraft(null);
                                        await loadVenues();
                                      } catch (e: unknown) {
                                        setVenueError(getErrorMessage(e));
                                      } finally {
                                        setEditBusy(false);
                                      }
                                    }}
                                  >
                                    {editBusy ? "Saving…" : "Save changes"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

