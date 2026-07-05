import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  const where: { status: "ENDED"; pageReceivedAt?: { gte: Date; lte: Date } } = {
    status: "ENDED",
  };

  if (startDate && endDate) {
    where.pageReceivedAt = {
      gte: startOfDay(parseISO(startDate)),
      lte: endOfDay(parseISO(endDate)),
    };
  }

  const calls = await prisma.call.findMany({
    where,
    include: {
      unit: true,
      callType: true,
      outcome: true,
    },
  });

  const callsByType: Record<string, number> = {};
  const callsByUnit: Record<string, number> = {};
  const callsByHour: Record<number, number> = {};
  const durationByType: Record<string, { total: number; count: number }> = {};
  const outcomes: Record<string, number> = {};
  const teamTimeByDay: Record<string, number> = {};

  for (const call of calls) {
    if (!call.endTime) continue;

    callsByType[call.callType.name] = (callsByType[call.callType.name] || 0) + 1;
    callsByUnit[call.unit.name] = (callsByUnit[call.unit.name] || 0) + 1;

    const hour = call.pageReceivedAt.getHours();
    callsByHour[hour] = (callsByHour[hour] || 0) + 1;

    const duration = getCallDurationMinutes(call.pageReceivedAt, call.endTime);
    if (!durationByType[call.callType.name]) {
      durationByType[call.callType.name] = { total: 0, count: 0 };
    }
    durationByType[call.callType.name].total += duration;
    durationByType[call.callType.name].count += 1;

    if (call.outcome) {
      outcomes[call.outcome.name] = (outcomes[call.outcome.name] || 0) + 1;
    }

    const dayKey = format(call.pageReceivedAt, "yyyy-MM-dd");
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
