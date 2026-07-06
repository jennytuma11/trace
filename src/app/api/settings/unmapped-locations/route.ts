import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import { listUnmappedCalls } from "@/lib/calls/repository";
import { canConfigureSettings } from "@/lib/permissions";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canConfigureSettings(auth.session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const calls = await listUnmappedCalls();
  return NextResponse.json({
    calls: calls.map((call) => ({
      id: call.id,
      unitLocation: call.unitLocation,
      reportingUnit: call.reportingUnit,
      mappingStatus: call.mappingStatus,
      startTime: call.startTime,
      callType: call.callType.name,
      status: call.status,
      eventType: call.eventType,
      excludedFromReporting: call.excludedFromReporting,
    })),
  });
}
