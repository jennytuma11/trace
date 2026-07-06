import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { computeAnalytics } from "@/lib/analytics/compute";
import { canViewAnalytics } from "@/lib/permissions";
import { getTimezoneFromSearchParams } from "@/lib/datetime";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canViewAnalytics(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const timeZone = getTimezoneFromSearchParams(searchParams);

  const analytics = await computeAnalytics({ startDate, endDate, timeZone });

  return NextResponse.json({
    callsByType: analytics.callsByType,
    callsByUnit: analytics.callsByUnit,
    callsByHour: analytics.callsByHour,
    avgDurationByType: analytics.avgDurationByType,
    outcomes: analytics.outcomes,
    teamTimeByDay: analytics.teamTimeByDay,
    totalCalls: analytics.totalCalls,
  });
}
