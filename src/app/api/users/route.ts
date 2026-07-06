import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { DEMO_USERS } from "@/lib/mock-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { canManageUsers, formatRoleLabel } from "@/lib/permissions";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canManageUsers(auth.session.role)) {
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

  return NextResponse.json({
    users: DEMO_USERS.map(({ id, email, name, role }) => ({
      id,
      email,
      name,
      role,
      roleLabel: formatRoleLabel(role),
    })),
    source: "local",
  });
}
