import { Route, Routes, Navigate, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchMyProfile, type Profile } from "../lib/profile";
import { LoginPage } from "./pages/LoginPage";
import { LearnerPage } from "./pages/LearnerPage";
import { AdminPage } from "./pages/AdminPage";
import inalaLogo from "./Inala-Web-Logo-White.png";

function useSession() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const p = await fetchMyProfile();
        if (mounted) setProfile(p);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    const { data } = supabase.auth.onAuthStateChange(() => {
      fetchMyProfile().then(setProfile).catch(() => setProfile(null));
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { loading, profile };
}

function TopBar({ profile }: { profile: Profile | null }) {
  const location = useLocation();
  const path = location.pathname;
  const role = profile?.role ?? "guest";

  // Header navigation is role-based:
  // - learners can access only /learner
  // - facilitators/admin can access /admin
  // This prevents accidental navigation to forbidden routes.
  const links = useMemo(() => {
    const items: Array<{ to: string; label: string; show: boolean }> = [
      { to: "/learner", label: "Learner", show: role === "learner" },
      { to: "/admin", label: "Dashboard", show: role === "admin" || role === "facilitator" }
    ];
    return items.filter((i) => i.show);
  }, [role]);

  return (
    <div className="topbar">
      <div className="brand">
        <img className="logoImg" src={inalaLogo} alt="Inala" />
        <span className="brandtitle">
          <strong>Inala</strong>
          <span>Geo Location Clock In</span>
        </span>
        <span className="badge">{role}</span>
      </div>
      <div className="nav">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="btn" aria-current={path === l.to ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
        {profile ? (
          <button
            className="btn"
            onClick={() => {
              supabase.auth.signOut();
            }}
          >
            Sign out
          </button>
        ) : (
          <Link to="/login" className="btn primary">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export function App() {
  const { loading, profile } = useSession();

  if (loading) {
    return (
      <div className="container">
        <TopBar profile={profile} />
        <div className="grid">
          <div className="card">
            <h2>Loading</h2>
            <div className="hint">Fetching session…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <TopBar profile={profile} />
      <Routes>
        <Route path="/" element={<Navigate to={profile ? (profile.role === "learner" ? "/learner" : "/admin") : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/learner"
          element={profile?.role === "learner" ? <LearnerPage profile={profile} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={
            profile && (profile.role === "admin" || profile.role === "facilitator") ? (
              <AdminPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

