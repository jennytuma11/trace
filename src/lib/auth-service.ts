import { createClient } from "@supabase/supabase-js";
import { SessionUser, TraceRole } from "@/lib/types";
import { authenticateMockUser } from "@/lib/mock-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) {
    const supabaseUser = await authenticateWithSupabase(email, password);
    if (supabaseUser) return supabaseUser;
  }

  return authenticateMockUser(email, password);
}

async function authenticateWithSupabase(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error || !data.user) {
    return null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: profile.role as TraceRole,
  };
}
