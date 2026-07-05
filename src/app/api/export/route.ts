import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listResolvedMockCalls } from "@/lib/mock-calls";
import {
  escapeCsvField,
  formatCallTypeLabel,
  formatDuration,
  formatLocalDateTime,
  getLocalDateKey,
  getTimezoneFromSearchParams,
  isInstantInLocalDateRange,
  toStoredISOString,
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

  const headers = [
    "Call Type",
    "RR Category",
    "Unit / Location",
    "Start Time",
    "Team Arrival Time",
    "Response Time",
    "End Time",
    "Total Call Duration",
    "Outcome",
    "Additional Notes",
    "Resolution Notes",
    "Team Member",
  ];

  const rows = calls.map((call) =>
    [
      formatCallTypeLabel(call),
      call.rapidResponseCategory?.name ?? "",
      call.unitLocation,
      formatLocalDateTime(call.startTime, timeZone),
      call.teamArrivalTime
        ? formatLocalDateTime(call.teamArrivalTime, timeZone)
        : "",
      call.responseTimeSeconds != null
        ? formatDuration(call.responseTimeSeconds, "response")
        : "",
      call.resolvedTime ? formatLocalDateTime(call.resolvedTime, timeZone) : "",
      call.totalCallDurationSeconds != null
        ? formatDuration(call.totalCallDurationSeconds, "elapsed")
        : "",
      call.outcome?.name ?? "",
      call.additionalNotes ?? "",
      call.resolutionNotes ?? "",
      call.user.name,
    ]
      .map(escapeCsvField)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `trace-call-history-${getLocalDateKey(toStoredISOString(), timeZone)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
