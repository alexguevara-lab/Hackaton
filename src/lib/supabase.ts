import { createClient, type User } from "@supabase/supabase-js";
import type { AuthUser } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

export async function toAuthUser(user: User): Promise<AuthUser> {
  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name || user.user_metadata.full_name || user.email || "Usuario",
    role: profile?.role || user.user_metadata.role || "Onboarding Manager",
  };
}
