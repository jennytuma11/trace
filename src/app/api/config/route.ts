import { NextResponse } from "next/server";
import { isUsingSupabase } from "@/lib/calls/repository";

export async function GET() {
  return NextResponse.json({
    supabaseConfigured: isUsingSupabase(),
  });
}
