import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Admin client uses the service role key. This bypasses RLS and is intended
// for server-side reads/writes after we do our own authorization checks.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export type AuthedUser = {
  id: string;
  email: string | null;
};

export async function requireUser(accessToken: string | undefined): Promise<AuthedUser> {
  // The frontend passes the Supabase access token as a Bearer auth header.
  // We verify it by calling `auth.getUser(token)` using the admin client.
  if (!accessToken) {
    throw Object.assign(new Error("Missing Authorization header"), { status: 401 });
  }

  const token = accessToken.replace(/^Bearer\s+/i, "").trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  return { id: data.user.id, email: data.user.email ?? null };
}

