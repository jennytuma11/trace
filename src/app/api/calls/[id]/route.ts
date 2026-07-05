import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  endMockCall,
  getCallById,
  updateMockCallAction,
} from "@/lib/mock-calls";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = getCallById(id);

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

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 });
    }

    const result = updateMockCallAction(id, action);
    if (result.error || !result.call) {
      console.error("[Trace] updateMockCallAction failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Action failed" },
        { status: result.error === "Call not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({
      call: result.call,
      suggestedOutcome: result.suggestedOutcome ?? null,
    });
  } catch (error) {
    console.error("[Trace] PATCH /api/calls/[id] failed:", error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { endTime, outcomeId, notes } = await request.json();

    if (!endTime || !outcomeId) {
      return NextResponse.json({ error: "End time and outcome required" }, { status: 400 });
    }

    const result = endMockCall(id, endTime, outcomeId, notes);
    if (result.error || !result.call) {
      console.error("[Trace] endMockCall failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to end call" },
        { status: result.error === "Call not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ call: result.call });
  } catch (error) {
    console.error("[Trace] PUT /api/calls/[id] failed:", error);
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 });
  }
}
