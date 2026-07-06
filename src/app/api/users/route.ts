import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { canManageUsers, formatRoleLabel } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("full_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users: (data ?? []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        roleLabel: formatRoleLabel(profile.role),
        createdAt: profile.created_at,
      })),
      source: "supabase",
    });
  }

  const { MOCK_USERS } = await import("@/lib/mock-auth");
  return NextResponse.json({
    users: MOCK_USERS.map(({ id, email, name, role }) => ({
      id,
      email,
      name,
      role,
      roleLabel: formatRoleLabel(role),
    })),
    source: "mock",
  });
}
