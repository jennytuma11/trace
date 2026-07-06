import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  countActiveCalls,
  createCall,
  getActiveCall,
} from "@/lib/calls/repository";
import { canStartCall } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCall = await getActiveCall(session.id);
  return NextResponse.json({ activeCall });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canStartCall(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const {
      unitLocation,
      callTypeId,
      rapidResponseCategoryId,
      additionalNotes,
      isPracticeTest,
    } = await request.json();

    if (!unitLocation?.trim() && !callTypeId) {
      return NextResponse.json(
        { error: "Please enter a unit / location and select a call type." },
        { status: 400 }
      );
    }
    if (!unitLocation?.trim()) {
      return NextResponse.json(
        { error: "Unit / location is required." },
        { status: 400 }
      );
    }
    if (!callTypeId) {
      return NextResponse.json(
        { error: "Please select a call type before starting." },
        { status: 400 }
      );
    }

    const existing = await getActiveCall(session.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active call", callId: existing.id },
        { status: 409 }
      );
    }

    const result = await createCall(session.id, {
      callTypeId,
      unitLocation,
      rapidResponseCategoryId,
      additionalNotes,
      isPracticeTest,
    });
    if (result.error || !result.call) {
      console.error("[Trace] createCall failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to start call." },
        { status: 400 }
      );
    }

    return NextResponse.json({ call: result.call }, { status: 201 });
  } catch (error) {
    console.error("[Trace] POST /api/calls/active failed:", error);
    return NextResponse.json({ error: "Failed to start call." }, { status: 500 });
  }
}

export async function HEAD() {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }
  const count = await countActiveCalls();
  return new NextResponse(null, {
    status: 200,
    headers: { "X-Active-Calls": String(count) },
  });
}
