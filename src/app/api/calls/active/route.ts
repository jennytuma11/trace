import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCall = await prisma.call.findFirst({
    where: { userId: session.id, status: "ACTIVE" },
    include: {
      unit: true,
      callType: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { pageReceivedAt: "desc" },
  });

  return NextResponse.json({ activeCall });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.call.findFirst({
    where: { userId: session.id, status: "ACTIVE" },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active call", callId: existing.id },
      { status: 409 }
    );
  }

  const { unitId, callTypeId } = await request.json();
  if (!unitId || !callTypeId) {
    return NextResponse.json({ error: "Unit and call type required" }, { status: 400 });
  }

  const call = await prisma.call.create({
    data: {
      userId: session.id,
      unitId,
      callTypeId,
      pageReceivedAt: new Date(),
      status: "ACTIVE",
    },
    include: {
      unit: true,
      callType: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ call }, { status: 201 });
}
