import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { canConfigureSettings } from "@/lib/permissions";
import {
  setCrosswalkRuleActive,
  updateCrosswalkRule,
} from "@/lib/units/crosswalk";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canConfigureSettings(auth.session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (body.active !== undefined && body.locationPattern === undefined && body.reportingUnit === undefined) {
    const result = await setCrosswalkRuleActive(id, Boolean(body.active));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ rule: result.rule });
  }

  const result = await updateCrosswalkRule(id, {
    locationPattern: body.locationPattern ?? "",
    reportingUnit: body.reportingUnit ?? "",
    description: body.description ?? null,
    active: body.active ?? true,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ rule: result.rule });
}
