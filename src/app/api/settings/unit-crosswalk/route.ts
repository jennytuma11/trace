import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { canConfigureSettings } from "@/lib/permissions";
import {
  createCrosswalkRule,
  listCrosswalkRules,
} from "@/lib/units/crosswalk";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canConfigureSettings(auth.session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await listCrosswalkRules();
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canConfigureSettings(auth.session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = await createCrosswalkRule({
    locationPattern: body.locationPattern ?? "",
    reportingUnit: body.reportingUnit ?? "",
    description: body.description ?? null,
    active: body.active ?? true,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ rule: result.rule }, { status: 201 });
}
