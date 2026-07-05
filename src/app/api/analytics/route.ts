import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listEndedMockCalls } from "@/lib/mock-calls";
import { getCallDurationMinutes } from "@/lib/utils";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let calls = listEndedMockCalls();

  if (startDate && endDate) {
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    calls = calls.filter((call) => {
      const received = new Date(call.pageReceivedAt);
      return received >= start && received <= end;
    });
  }

  const callsByType: Record<string, number> = {};
  const callsByUnit: Record<string, number> = {};
  const callsByHour: Record<number, number> = {};
  const durationByType: Record<string, { total: number; count: number }> = {};
  const outcomes: Record<string, number> = {};
  const teamTimeByDay: Record<string, number> = {};

  for (const call of calls) {
    if (!call.endTime) continue;

    const typeLabel = call.callType.name;
    callsByType[typeLabel] = (callsByType[typeLabel] || 0) + 1;
    callsByUnit[call.unit.name] = (callsByUnit[call.unit.name] || 0) + 1;

    const hour = new Date(call.pageReceivedAt).getHours();
    callsByHour[hour] = (callsByHour[hour] || 0) + 1;

    const duration = getCallDurationMinutes(
      new Date(call.pageReceivedAt),
      new Date(call.endTime)
    );
    if (!durationByType[typeLabel]) {
      durationByType[typeLabel] = { total: 0, count: 0 };
    }
    durationByType[typeLabel].total += duration;
    durationByType[typeLabel].count += 1;

    if (call.outcome) {
      outcomes[call.outcome.name] = (outcomes[call.outcome.name] || 0) + 1;
    }

    const dayKey = format(new Date(call.pageReceivedAt), "yyyy-MM-dd");
    teamTimeByDay[dayKey] = (teamTimeByDay[dayKey] || 0) + duration;
  }

  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ampm = i < 12 ? "AM" : "PM";
    return `${h}${ampm}`;
  });

  const callsByHourData = Array.from({ length: 24 }, (_, hour) => ({
    hour: hourLabels[hour],
    count: callsByHour[hour] || 0,
  }));

  const avgDurationByType = Object.entries(durationByType).map(([name, { total, count }]) => ({
    name,
    avgMinutes: count > 0 ? Math.round(total / count) : 0,
  }));

  const teamTimeByDayData = Object.entries(teamTimeByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: format(parseISO(date), "MMM d"),
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
