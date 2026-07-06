import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCalls } from "@/lib/calls/repository";
import { canViewCallHistory } from "@/lib/permissions";
import { getTimezoneFromSearchParams } from "@/lib/datetime";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canViewCallHistory(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const callTypeId = searchParams.get("callTypeId");
  const outcomeId = searchParams.get("outcomeId");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search");
  const timeZone = getTimezoneFromSearchParams(searchParams);
  const includeExcluded = searchParams.get("includeExcluded") === "true";

  const calls = await listCalls({
    startDate,
    endDate,
    callTypeId,
    outcomeId,
    userId,
    search,
    timeZone,
    includeExcluded: session.role === "ADMINISTRATOR" && includeExcluded,
  });

  return NextResponse.json({ calls });
}
