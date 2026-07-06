import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  countActiveCalls,
  getActiveCall,
  listReportingCalls,
} from "@/lib/calls/repository";
import { canViewDashboard } from "@/lib/permissions";
import {
  getCallDurationMinutes,
  getTimezoneFromSearchParams,
  getTodayRangeInTimezone,
  getWeekRangeInTimezone,
  toStoredISOString,
} from "@/lib/datetime";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canViewDashboard(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const timeZone = getTimezoneFromSearchParams(searchParams);
  const { start: todayStart, end: todayEnd } = getTodayRangeInTimezone(timeZone);
  const { start: weekStart, end: weekEnd } = getWeekRangeInTimezone(timeZone);

  const reportingCalls = await listReportingCalls({ timeZone });
  const todayCalls = reportingCalls.filter((call) => {
    const received = new Date(call.startTime);
    return received >= todayStart && received <= todayEnd;
  });
  const weekCalls = reportingCalls.filter((call) => {
    const received = new Date(call.startTime);
    return received >= weekStart && received <= weekEnd;
  });

  const durations = todayCalls
    .filter((c) => c.resolvedTime)
    .map((c) => getCallDurationMinutes(c.startTime, c.resolvedTime!));

  const totalMinutesToday = durations.reduce((sum, d) => sum + d, 0);
  const avgDuration =
    durations.length > 0 ? Math.round(totalMinutesToday / durations.length) : 0;

  const typeCounts: Record<string, number> = {};
  for (const call of todayCalls) {
    typeCounts[call.callType.name] = (typeCounts[call.callType.name] || 0) + 1;
  }

  const unitCounts: Record<string, number> = {};
  for (const call of todayCalls) {
    unitCounts[call.unitLocation] = (unitCounts[call.unitLocation] || 0) + 1;
  }

  let mostFrequentCallType = "—";
  let maxTypeCount = 0;
  for (const [name, count] of Object.entries(typeCounts)) {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      mostFrequentCallType = name;
    }
  }

  let busiestUnit = "—";
  let maxUnitCount = 0;
  for (const [name, count] of Object.entries(unitCounts)) {
    if (count > maxUnitCount) {
      maxUnitCount = count;
      busiestUnit = name;
    }
  }

  const userActiveCall = await getActiveCall(session.id);

  return NextResponse.json({
    totalCallsToday: todayCalls.length,
    activeCalls: await countActiveCalls(),
    avgDurationMinutes: avgDuration,
    totalMinutesToday,
    callsThisWeek: weekCalls.length,
    mostFrequentCallType: maxTypeCount > 0 ? mostFrequentCallType : "—",
    busiestUnit: maxUnitCount > 0 ? busiestUnit : "—",
    userActiveCallId: userActiveCall?.id ?? null,
    generatedAt: toStoredISOString(),
  });
}
