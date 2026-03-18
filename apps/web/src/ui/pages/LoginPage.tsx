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
    <div className="grid">
      <div className="card">
        <h2>Sign in</h2>
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
            className="btn primary"
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
      </div>

      <div className="card">
        <h2>Choose your page</h2>
        <div className="hint">
          We do not auto-redirect after login. Use the header buttons:
          <br />
          <br />
          After logging in, if you are a <b>learner</b>, click <b>Learner</b> (top header).
          <br />
          If you are <b>facilitator/admin</b>, click <b>Dashboard</b> (top header).
          <br />
          <br />
          Tip: if you still see “Sign in”, you may not be fully authenticated yet—try signing in again.
        </div>
      </div>
    </div>
  );
}

