import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCallById,
  recordTeamArrival,
  resolveMockCall,
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

    if (action !== "team_arrived") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = recordTeamArrival(id);
    if (result.error || !result.call) {
      console.error("[Trace] recordTeamArrival failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to record team arrival" },
        { status: result.error === "Call not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ call: result.call });
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
    const { outcomeId, resolutionNotes } = await request.json();

    if (!outcomeId) {
      return NextResponse.json(
        { error: "Outcome is required before resolving the call." },
        { status: 400 }
      );
    }

    const result = resolveMockCall(id, { outcomeId, resolutionNotes });
    if (result.error || !result.call) {
      console.error("[Trace] resolveMockCall failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to resolve call" },
        { status: result.error === "Call not found" ? 404 : 400 }
      );
    }

    return NextResponse.json({ call: result.call });
  } catch (error) {
    console.error("[Trace] PUT /api/calls/[id] failed:", error);
    return NextResponse.json({ error: "Failed to resolve call" }, { status: 500 });
  }
}
