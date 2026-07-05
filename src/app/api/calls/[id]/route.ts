import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      unit: true,
      callType: true,
      outcome: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  return NextResponse.json({ call });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (call.status !== "ACTIVE") {
    return NextResponse.json({ error: "Call is not active" }, { status: 400 });
  }

  const body = await request.json();
  const { action, unitId, callTypeId } = body;

  const data: Record<string, unknown> = {};

  if (unitId) data.unitId = unitId;
  if (callTypeId) data.callTypeId = callTypeId;

  switch (action) {
    case "arrived":
      if (!call.arrivedAt) data.arrivedAt = new Date();
      break;
    case "stabilized":
      if (!call.stabilizedAt) data.stabilizedAt = new Date();
      break;
    case "icu_transfer":
    case "cancelled":
      break;
    default:
      if (action) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
  }

  const updated = await prisma.call.update({
    where: { id },
    data,
    include: {
      unit: true,
      callType: true,
      outcome: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    call: updated,
    suggestedOutcome:
      action === "icu_transfer"
        ? "Transferred to ICU"
        : action === "cancelled"
          ? "Cancelled page"
          : null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await prisma.call.findUnique({ where: { id } });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (call.status !== "ACTIVE") {
    return NextResponse.json({ error: "Call is not active" }, { status: 400 });
  }

  const { endTime, outcomeId, notes } = await request.json();

  if (!endTime || !outcomeId) {
    return NextResponse.json({ error: "End time and outcome required" }, { status: 400 });
  }

  const end = new Date(endTime);
  if (end < call.pageReceivedAt) {
    return NextResponse.json({ error: "End time must be after page received time" }, { status: 400 });
  }

  const updated = await prisma.call.update({
    where: { id },
    data: {
      endTime: end,
      outcomeId,
      notes: notes || null,
      status: "ENDED",
    },
    include: {
      unit: true,
      callType: true,
      outcome: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ call: updated });
}
