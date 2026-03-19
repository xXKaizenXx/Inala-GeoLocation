import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { getErrorMessage } from "../../lib/errors";

export function LoginPage() {
  // Login page intentionally does not auto-redirect.
  // This makes the demo flow explicit: learners click "Learner",
  // facilitators/admins click "Dashboard" in the header.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="loginExperience">
      <section className="loginHero card">
        <span className="heroKicker">Attendance, reimagined</span>
        <h1>Clock in with confidence and clarity.</h1>
        <p className="heroLead">
          Inala blends location awareness with intuitive workflows so learners, facilitators, and admins can move faster from
          check-in to action.
        </p>
        <div className="heroTags">
          <span className="heroTag">Real-time geolocation</span>
          <span className="heroTag">Role-based access</span>
          <span className="heroTag">Secure sign-in</span>
        </div>
        <div className="heroSteps">
          <div className="heroStep">
            <span>01</span>
            <p>Sign in using your learner or facilitator/admin account.</p>
          </div>
          <div className="heroStep">
            <span>02</span>
            <p>Use the top navigation to enter your role-specific workspace.</p>
          </div>
          <div className="heroStep">
            <span>03</span>
            <p>Start tracking attendance with location context in seconds.</p>
          </div>
        </div>
      </section>

      <section className="card loginPanel">
        <h2>Welcome back</h2>
        <div className="hint">Use your learner or facilitator/admin credentials.</div>
        <div style={{ height: 12 }} />
        <div className="field">
          <div className="label">Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="field">
          <div className="label">Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="current-password"
          />
        </div>
        {error ? <div className="alert bad">{error}</div> : null}
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className="btn primary loginSubmit"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
              } catch (e: unknown) {
                setError(getErrorMessage(e) ?? "Sign-in failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <div className="hint loginHint">
          After login, click <b>Learner</b> in the header for learner view or <b>Dashboard</b> for facilitator/admin view.
        </div>
      </section>
    </div>
  );
}

