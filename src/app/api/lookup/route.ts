import { NextResponse } from "next/server";
import { getAppLookup } from "@/lib/lookup";
import { requireSession } from "@/lib/auth/require-session";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(await getAppLookup());
}
