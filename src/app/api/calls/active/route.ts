import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/require-session";
import {
  countActiveCalls,
  createCall,
  getActiveCall,
} from "@/lib/calls/repository";
import { canStartCall } from "@/lib/permissions";
import { isUuid } from "@/lib/auth/uuid";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AUTH_ERROR_INVALID_SESSION } from "@/lib/auth/session-user";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const activeCall = await getActiveCall(auth.session.id);
  return NextResponse.json({ activeCall });
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!canStartCall(auth.session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isSupabaseConfigured() && !isUuid(auth.session.id)) {
    return NextResponse.json({ error: AUTH_ERROR_INVALID_SESSION }, { status: 401 });
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

    const existing = await getActiveCall(auth.session.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active call", callId: existing.id },
        { status: 409 }
      );
    }

    const result = await createCall(auth.session.id, {
      callTypeId,
      unitLocation,
      rapidResponseCategoryId,
      additionalNotes,
      isPracticeTest,
    });
    if (result.error || !result.call) {
      console.error("[Trace] createCall failed:", result.error);
      const status = result.error?.includes("Authentication") ? 401 : 400;
      return NextResponse.json(
        { error: result.error || "Failed to start call." },
        { status }
      );
    }

    return NextResponse.json({ call: result.call }, { status: 201 });
  } catch (error) {
    console.error("[Trace] POST /api/calls/active failed:", error);
    return NextResponse.json({ error: "Failed to start call." }, { status: 500 });
  }
}

export async function HEAD() {
  const auth = await requireSession();
  if (!auth.ok) {
    return new NextResponse(null, { status: auth.status });
  }
  const count = await countActiveCalls();
  return new NextResponse(null, {
    status: 200,
    headers: { "X-Active-Calls": String(count) },
  });
}
