import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listEndedMockCalls } from "@/lib/mock-calls";
import { endOfDay, parseISO, startOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const unitId = searchParams.get("unitId");
  const callTypeId = searchParams.get("callTypeId");
  const outcomeId = searchParams.get("outcomeId");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search")?.toLowerCase();

  let calls = listEndedMockCalls();

  if (startDate) {
    const start = startOfDay(parseISO(startDate));
    calls = calls.filter((call) => new Date(call.pageReceivedAt) >= start);
  }
  if (endDate) {
    const end = endOfDay(parseISO(endDate));
    calls = calls.filter((call) => new Date(call.pageReceivedAt) <= end);
  }
  if (unitId) calls = calls.filter((call) => call.unitId === unitId);
  if (callTypeId) calls = calls.filter((call) => call.callTypeId === callTypeId);
  if (outcomeId) calls = calls.filter((call) => call.outcomeId === outcomeId);
  if (userId) calls = calls.filter((call) => call.userId === userId);

  if (search) {
    calls = calls.filter(
      (call) =>
        call.unit.name.toLowerCase().includes(search) ||
        call.callType.name.toLowerCase().includes(search) ||
        (call.outcome?.name.toLowerCase().includes(search) ?? false) ||
        call.user.name.toLowerCase().includes(search) ||
        (call.notes?.toLowerCase().includes(search) ?? false)
    );
  }

  return NextResponse.json({ calls });
}
