import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listResolvedMockCalls } from "@/lib/mock-calls";
import {
  formatLocalDateKey,
  getCallDurationMinutes,
  getLocalDateKey,
  getLocalHour,
  getLocalHourLabel,
  getTimezoneFromSearchParams,
  isInstantInLocalDateRange,
} from "@/lib/datetime";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const timeZone = getTimezoneFromSearchParams(searchParams);

  let calls = listResolvedMockCalls();

  if (startDate && endDate) {
    calls = calls.filter((call) =>
      isInstantInLocalDateRange(call.startTime, startDate, endDate, timeZone)
    );
  }

  const callsByType: Record<string, number> = {};
  const callsByUnit: Record<string, number> = {};
  const callsByHour: Record<number, number> = {};
  const durationByType: Record<string, { total: number; count: number }> = {};
  const outcomes: Record<string, number> = {};
  const teamTimeByDay: Record<string, number> = {};

  for (const call of calls) {
    if (!call.resolvedTime) continue;

    const typeLabel = call.callType.name;
    callsByType[typeLabel] = (callsByType[typeLabel] || 0) + 1;
    callsByUnit[call.unitLocation] = (callsByUnit[call.unitLocation] || 0) + 1;

    const hour = getLocalHour(call.startTime, timeZone);
    callsByHour[hour] = (callsByHour[hour] || 0) + 1;

    const duration = getCallDurationMinutes(call.startTime, call.resolvedTime);
    if (!durationByType[typeLabel]) {
      durationByType[typeLabel] = { total: 0, count: 0 };
    }
    durationByType[typeLabel].total += duration;
    durationByType[typeLabel].count += 1;

    if (call.outcome) {
      outcomes[call.outcome.name] = (outcomes[call.outcome.name] || 0) + 1;
    }

    const dayKey = getLocalDateKey(call.startTime, timeZone);
    teamTimeByDay[dayKey] = (teamTimeByDay[dayKey] || 0) + duration;
  }

  const callsByHourData = Array.from({ length: 24 }, (_, hour) => ({
    hour: getLocalHourLabel(hour),
    count: callsByHour[hour] || 0,
  }));

  const avgDurationByType = Object.entries(durationByType).map(([name, { total, count }]) => ({
    name,
    avgMinutes: count > 0 ? Math.round(total / count) : 0,
  }));

  const teamTimeByDayData = Object.entries(teamTimeByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: formatLocalDateKey(date),
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    }));

  return NextResponse.json({
    callsByType: Object.entries(callsByType).map(([name, count]) => ({ name, count })),
    callsByUnit: Object.entries(callsByUnit).map(([name, count]) => ({ name, count })),
    callsByHour: callsByHourData,
    avgDurationByType,
    outcomes: Object.entries(outcomes).map(([name, count]) => ({ name, count })),
    teamTimeByDay: teamTimeByDayData,
    totalCalls: calls.length,
  });
}
