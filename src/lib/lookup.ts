import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_USERS } from "@/lib/mock-auth";
import {
  MOCK_CALL_TYPES,
  MOCK_OUTCOMES,
  MOCK_RR_CATEGORIES,
} from "@/lib/mock-data";

export async function getAppLookup() {
  const users = isSupabaseConfigured()
    ? await fetchProfileLookupUsers()
    : DEMO_USERS.map(({ id, name, role }) => ({ id, name, role }));

  return {
    callTypes: MOCK_CALL_TYPES,
    rapidResponseCategories: MOCK_RR_CATEGORIES,
    outcomes: MOCK_OUTCOMES,
    users,
  };
}

async function fetchProfileLookupUsers() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return DEMO_USERS.map(({ id, name, role }) => ({ id, name, role }));
  }

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");

  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
  }));
}
