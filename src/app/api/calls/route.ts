import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listResolvedMockCalls } from "@/lib/mock-calls";
import {
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
  const callTypeId = searchParams.get("callTypeId");
  const outcomeId = searchParams.get("outcomeId");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search")?.toLowerCase();
  const timeZone = getTimezoneFromSearchParams(searchParams);

  let calls = listResolvedMockCalls();

  if (startDate && endDate) {
    calls = calls.filter((call) =>
      isInstantInLocalDateRange(call.startTime, startDate, endDate, timeZone)
    );
  }
  if (callTypeId) calls = calls.filter((call) => call.callTypeId === callTypeId);
  if (outcomeId) calls = calls.filter((call) => call.outcomeId === outcomeId);
  if (userId) calls = calls.filter((call) => call.userId === userId);

  if (search) {
    calls = calls.filter(
      (call) =>
        call.unitLocation.toLowerCase().includes(search) ||
        call.callType.name.toLowerCase().includes(search) ||
        (call.rapidResponseCategory?.name.toLowerCase().includes(search) ?? false) ||
        (call.outcome?.name.toLowerCase().includes(search) ?? false) ||
        call.user.name.toLowerCase().includes(search) ||
        (call.additionalNotes?.toLowerCase().includes(search) ?? false) ||
        (call.resolutionNotes?.toLowerCase().includes(search) ?? false)
    );
  }

  return NextResponse.json({ calls });
}
