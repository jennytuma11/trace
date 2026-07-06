import { createClient } from "@supabase/supabase-js";
import { SessionUser, TraceRole } from "@/lib/types";
import { authenticateMockUser, inferDemoRoleFromEmail } from "@/lib/mock-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: SessionUser | null; error?: string }> {
  if (isSupabaseConfigured()) {
    return authenticateWithSupabase(email, password);
  }

  const user = authenticateMockUser(email, password);
  return { user };
}

async function authenticateWithSupabase(
  email: string,
  password: string
): Promise<{ user: SessionUser | null; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user) {
    return {
      user: null,
      error:
        "Invalid email or password. Sign in with a Supabase Auth account (for example admin@trace.local).",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      user: null,
      error: "Supabase is not fully configured on the server. Contact your administrator.",
    };
  }

  const profile = await ensureProfileForAuthUser({
    id: data.user.id,
    email: data.user.email ?? normalizedEmail,
    fullName:
      (data.user.user_metadata?.full_name as string | undefined) ??
      data.user.email?.split("@")[0] ??
      "User",
  });

  if (!profile) {
    return {
      user: null,
      error: "Unable to load your user profile. Please try again or contact your administrator.",
    };
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role as TraceRole,
    },
  };
}

async function ensureProfileForAuthUser(input: {
  id: string;
  email: string;
  fullName: string;
}): Promise<{
  id: string;
  email: string;
  full_name: string;
  role: TraceRole;
} | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", input.id)
    .maybeSingle();

  if (existing) {
    return existing as {
      id: string;
      email: string;
      full_name: string;
      role: TraceRole;
    };
  }

  const role = inferDemoRoleFromEmail(input.email);

  const { data: created, error } = await admin
    .from("profiles")
    .upsert(
      {
        id: input.id,
        email: input.email,
        full_name: input.fullName,
        role,
      },
      { onConflict: "id" }
    )
    .select("id, email, full_name, role")
    .single();

  if (error || !created) {
    console.error("[Trace] Failed to ensure profile:", error);
    return null;
  }

  return created as {
    id: string;
    email: string;
    full_name: string;
    role: TraceRole;
  };
}
