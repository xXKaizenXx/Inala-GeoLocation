import { supabase } from "./supabase";

export type Profile = {
  id: string;
  full_name: string;
  role: "learner" | "facilitator" | "admin";
};

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return null;

  const { data, error } = await supabase.from("profiles").select("id,full_name,role").eq("id", uid).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

