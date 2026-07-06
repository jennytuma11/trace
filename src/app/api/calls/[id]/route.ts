import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  excludeCallFromReporting,
  fetchCallById,
  markTeamArrival,
  resolveCall,
} from "@/lib/calls/repository";
import { canExcludeFromReporting, canResolveCall } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await fetchCallById(id);

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

    if (action === "team_arrived") {
      if (!canResolveCall(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await markTeamArrival(id);
      if (result.error || !result.call) {
        console.error("[Trace] markTeamArrival failed:", result.error);
        return NextResponse.json(
          { error: result.error || "Failed to record team arrival" },
          { status: result.error === "Call not found" ? 404 : 400 }
        );
      }

      return NextResponse.json({ call: result.call });
    }

    if (action === "exclude") {
      if (!canExcludeFromReporting(session.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await excludeCallFromReporting(id, session.id, {
        reason: body.reason,
      });
      if (result.error || !result.call) {
        return NextResponse.json(
          { error: result.error || "Failed to exclude event" },
          { status: result.error === "Call not found" ? 404 : 400 }
        );
      }

      return NextResponse.json({ call: result.call });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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

  if (!canResolveCall(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const result = await resolveCall(id, { outcomeId, resolutionNotes });
    if (result.error || !result.call) {
      console.error("[Trace] resolveCall failed:", result.error);
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
