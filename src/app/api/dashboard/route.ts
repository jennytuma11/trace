import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCallDurationMinutes, getTodayRange, getWeekRange } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { start: todayStart, end: todayEnd } = getTodayRange();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const [todayCalls, activeCalls, weekCalls] = await Promise.all([
    prisma.call.findMany({
      where: {
        pageReceivedAt: { gte: todayStart, lte: todayEnd },
        status: "ENDED",
      },
      include: { callType: true, unit: true },
    }),
    prisma.call.count({ where: { status: "ACTIVE" } }),
    prisma.call.count({
      where: {
        pageReceivedAt: { gte: weekStart, lte: weekEnd },
        status: "ENDED",
      },
    }),
  ]);

  const durations = todayCalls
    .filter((c) => c.endTime)
    .map((c) => getCallDurationMinutes(c.pageReceivedAt, c.endTime));

  const totalMinutesToday = durations.reduce((sum, d) => sum + d, 0);
  const avgDuration =
    durations.length > 0 ? Math.round(totalMinutesToday / durations.length) : 0;

  const typeCounts: Record<string, number> = {};
  for (const call of todayCalls) {
    typeCounts[call.callType.name] = (typeCounts[call.callType.name] || 0) + 1;
  }

  const unitCounts: Record<string, number> = {};
  for (const call of todayCalls) {
    unitCounts[call.unit.name] = (unitCounts[call.unit.name] || 0) + 1;
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

  const userActiveCall = await prisma.call.findFirst({
    where: { userId: session.id, status: "ACTIVE" },
    select: { id: true },
  });

  return NextResponse.json({
    totalCallsToday: todayCalls.length,
    activeCalls,
    avgDurationMinutes: avgDuration,
    totalMinutesToday,
    callsThisWeek: weekCalls,
    mostFrequentCallType: maxTypeCount > 0 ? mostFrequentCallType : "—",
    busiestUnit: maxUnitCount > 0 ? busiestUnit : "—",
    userActiveCallId: userActiveCall?.id ?? null,
    generatedAt: now.toISOString(),
  });
}
