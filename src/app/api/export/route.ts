import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listEndedMockCalls } from "@/lib/mock-calls";
import {
  escapeCsvField,
  formatCallTypeLabel,
  formatDate,
  formatDurationMinutes,
  formatTime,
} from "@/lib/utils";
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
        (call.rapidResponseCategory?.name.toLowerCase().includes(search) ?? false) ||
        (call.outcome?.name.toLowerCase().includes(search) ?? false) ||
        call.user.name.toLowerCase().includes(search) ||
        (call.detailsNotes?.toLowerCase().includes(search) ?? false) ||
        (call.notes?.toLowerCase().includes(search) ?? false)
    );
  }

  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Duration",
    "Unit",
    "Call Type",
    "RR Category",
    "Details",
    "Outcome",
    "Team Member",
    "End Notes",
  ];

  const rows = calls.map((call) => {
    const duration =
      call.endTime != null
        ? formatDurationMinutes(call.pageReceivedAt, call.endTime)
        : "";

    return [
      formatDate(call.pageReceivedAt),
      formatTime(call.pageReceivedAt),
      call.endTime ? formatTime(call.endTime) : "",
      duration,
      call.unit.name,
      formatCallTypeLabel(call),
      call.rapidResponseCategory?.name ?? "",
      call.detailsNotes ?? "",
      call.outcome?.name ?? "",
      call.user.name,
      call.notes ?? "",
    ]
      .map(escapeCsvField)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `trace-call-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
