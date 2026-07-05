import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { escapeCsvField, formatDate, formatDurationMinutes, formatTime } from "@/lib/utils";
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
  const search = searchParams.get("search");

  const where: Prisma.CallWhereInput = { status: "ENDED" };

  if (startDate || endDate) {
    where.pageReceivedAt = {};
    if (startDate) where.pageReceivedAt.gte = startOfDay(parseISO(startDate));
    if (endDate) where.pageReceivedAt.lte = endOfDay(parseISO(endDate));
  }

  if (unitId) where.unitId = unitId;
  if (callTypeId) where.callTypeId = callTypeId;
  if (outcomeId) where.outcomeId = outcomeId;
  if (userId) where.userId = userId;

  if (search) {
    where.OR = [
      { unit: { name: { contains: search } } },
      { callType: { name: { contains: search } } },
      { outcome: { name: { contains: search } } },
      { user: { name: { contains: search } } },
      { notes: { contains: search } },
    ];
  }

  const calls = await prisma.call.findMany({
    where,
    include: {
      unit: true,
      callType: true,
      outcome: true,
      user: { select: { name: true } },
    },
    orderBy: { pageReceivedAt: "desc" },
  });

  const headers = [
    "Date",
    "Start Time",
    "End Time",
    "Duration",
    "Unit",
    "Call Type",
    "Outcome",
    "Team Member",
    "Notes",
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
      call.callType.name,
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
