import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  countActiveMockCalls,
  getActiveCallForUser,
  listEndedMockCalls,
} from "@/lib/mock-calls";
import { getCallDurationMinutes, getTodayRange, getWeekRange } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { start: todayStart, end: todayEnd } = getTodayRange();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const endedCalls = listEndedMockCalls();
  const todayCalls = endedCalls.filter((call) => {
    const received = new Date(call.pageReceivedAt);
    return received >= todayStart && received <= todayEnd;
  });
  const weekCalls = endedCalls.filter((call) => {
    const received = new Date(call.pageReceivedAt);
    return received >= weekStart && received <= weekEnd;
  });

  const durations = todayCalls
    .filter((c) => c.endTime)
    .map((c) =>
      getCallDurationMinutes(new Date(c.pageReceivedAt), new Date(c.endTime!))
    );

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

  const userActiveCall = getActiveCallForUser(session.id);

  return NextResponse.json({
    totalCallsToday: todayCalls.length,
    activeCalls: countActiveMockCalls(),
    avgDurationMinutes: avgDuration,
    totalMinutesToday,
    callsThisWeek: weekCalls.length,
    mostFrequentCallType: maxTypeCount > 0 ? mostFrequentCallType : "—",
    busiestUnit: maxUnitCount > 0 ? busiestUnit : "—",
    userActiveCallId: userActiveCall?.id ?? null,
    generatedAt: now.toISOString(),
  });
}
