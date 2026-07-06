import {
  countActiveMockCalls,
  createMockCall,
  excludeMockCall,
  getActiveCallForUser,
  getCallById,
  listMockCalls,
  recordTeamArrival,
  resolveMockCall,
  SerializedMockCall,
} from "@/lib/mock-calls";
import {
  CallRecord,
  CreateCallInput,
  enrichCallRecord,
  ExcludeCallInput,
  ListCallsOptions,
  ResolveCallInput,
  callTypeIdToName,
  findCategoryIdByName,
  findOutcomeIdByName,
} from "@/lib/calls/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AUTH_ERROR_INVALID_SESSION } from "@/lib/auth/session-user";
import { isUuid } from "@/lib/auth/uuid";
import { isInstantInLocalDateRange } from "@/lib/datetime";
import { CallStatus } from "@/lib/types";

interface SupabaseCallRow {
  id: string;
  call_type: string;
  rapid_response_category: string | null;
  unit_location: string;
  additional_notes: string | null;
  start_time: string;
  team_arrival_time: string | null;
  response_time_seconds: number | null;
  resolved_time: string | null;
  total_call_duration_seconds: number | null;
  outcome: string | null;
  resolution_notes: string | null;
  status: CallStatus;
  created_by: string;
  excluded_from_reporting: boolean;
  excluded_at: string | null;
  excluded_by: string | null;
  exclusion_reason: string | null;
  event_type: CallRecord["eventType"];
}

interface SupabaseProfileRow {
  id: string;
  full_name: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, SupabaseProfileRow>> {
  const admin = getSupabaseAdmin();
  const map = new Map<string, SupabaseProfileRow>();
  if (!admin || ids.length === 0) return map;

  const uniqueIds = [...new Set(ids)];
  const { data } = await admin.from("profiles").select("id, full_name").in("id", uniqueIds);
  for (const profile of data ?? []) {
    map.set(profile.id, profile);
  }
  return map;
}

function mapSupabaseRow(
  row: SupabaseCallRow,
  profiles: Map<string, SupabaseProfileRow>
): CallRecord | null {
  const creator = profiles.get(row.created_by);
  const excluder = row.excluded_by ? profiles.get(row.excluded_by) : null;

  return enrichCallRecord({
    id: row.id,
    userId: row.created_by,
    status: row.status,
    callTypeName: row.call_type,
    rapidResponseCategoryName: row.rapid_response_category,
    unitLocation: row.unit_location,
    additionalNotes: row.additional_notes,
    startTime: row.start_time,
    teamArrivalTime: row.team_arrival_time,
    responseTimeSeconds: row.response_time_seconds,
    resolvedTime: row.resolved_time,
    totalCallDurationSeconds: row.total_call_duration_seconds,
    outcomeName: row.outcome,
    resolutionNotes: row.resolution_notes,
    excludedFromReporting: row.excluded_from_reporting,
    excludedAt: row.excluded_at,
    excludedBy: row.excluded_by,
    excludedByUser: excluder ? { id: excluder.id, name: excluder.full_name } : null,
    exclusionReason: row.exclusion_reason,
    eventType: row.event_type,
    user: creator ? { id: creator.id, name: creator.full_name } : undefined,
    userName: creator?.full_name,
  });
}

function mockToCallRecord(call: SerializedMockCall): CallRecord {
  return call as CallRecord;
}

function supabaseConfigError(): { error: string } {
  return { error: "Supabase is not fully configured on the server." };
}

function invalidUserIdError(): { error: string } {
  return { error: AUTH_ERROR_INVALID_SESSION };
}

function assertSupabaseUserId(userId: string): { ok: true } | { ok: false; error: string } {
  if (!isUuid(userId)) {
    return { ok: false, error: AUTH_ERROR_INVALID_SESSION };
  }
  return { ok: true };
}

function filterCalls(calls: CallRecord[], options: ListCallsOptions): CallRecord[] {
  const {
    startDate,
    endDate,
    callTypeId,
    outcomeId,
    userId,
    search,
    timeZone = "UTC",
  } = options;

  let filtered = calls;

  if (startDate && endDate) {
    filtered = filtered.filter((call) =>
      isInstantInLocalDateRange(call.startTime, startDate, endDate, timeZone)
    );
  }
  if (callTypeId) filtered = filtered.filter((call) => call.callTypeId === callTypeId);
  if (outcomeId) filtered = filtered.filter((call) => call.outcomeId === outcomeId);
  if (userId) filtered = filtered.filter((call) => call.userId === userId);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (call) =>
        call.unitLocation.toLowerCase().includes(q) ||
        call.callType.name.toLowerCase().includes(q) ||
        (call.rapidResponseCategory?.name.toLowerCase().includes(q) ?? false) ||
        (call.outcome?.name.toLowerCase().includes(q) ?? false) ||
        call.user.name.toLowerCase().includes(q) ||
        (call.additionalNotes?.toLowerCase().includes(q) ?? false) ||
        (call.resolutionNotes?.toLowerCase().includes(q) ?? false) ||
        call.eventType.toLowerCase().includes(q) ||
        (call.exclusionReason?.toLowerCase().includes(q) ?? false)
    );
  }

  return filtered;
}

export function isUsingSupabase(): boolean {
  return isSupabaseConfigured();
}

export async function getActiveCall(userId: string): Promise<CallRecord | null> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    const { data, error } = await admin
      .from("calls")
      .select("*")
      .eq("created_by", userId)
      .eq("status", "ACTIVE")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const profiles = await fetchProfiles([data.created_by, data.excluded_by].filter(Boolean));
    return mapSupabaseRow(data as SupabaseCallRow, profiles);
  }

  const call = getActiveCallForUser(userId);
  return call ? mockToCallRecord(call) : null;
}

export async function fetchCallById(id: string): Promise<CallRecord | null> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return null;

    const { data, error } = await admin.from("calls").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;

    const profiles = await fetchProfiles([data.created_by, data.excluded_by].filter(Boolean));
    return mapSupabaseRow(data as SupabaseCallRow, profiles);
  }

  const call = getCallById(id);
  return call ? mockToCallRecord(call) : null;
}

export async function createCall(
  userId: string,
  input: CreateCallInput
): Promise<{ call?: CallRecord; error?: string }> {
  if (isSupabaseConfigured()) {
    const userCheck = assertSupabaseUserId(userId);
    if (!userCheck.ok) return invalidUserIdError();

    const admin = getSupabaseAdmin();
    if (!admin) return supabaseConfigError();

    const existing = await getActiveCall(userId);
    if (existing) {
      return { error: "You already have an active call", call: existing };
    }

    const isPractice = Boolean(input.isPracticeTest);
    const categoryName = input.rapidResponseCategoryId
      ? (await import("@/lib/mock-data")).findMockRrCategory(input.rapidResponseCategoryId)?.name ??
        null
      : null;

    const { data, error } = await admin
      .from("calls")
      .insert({
        call_type: callTypeIdToName(input.callTypeId),
        rapid_response_category: categoryName,
        unit_location: input.unitLocation.trim(),
        additional_notes: input.additionalNotes?.trim() || null,
        created_by: userId,
        event_type: isPractice ? "Practice" : "Operational",
        excluded_from_reporting: isPractice,
        excluded_at: isPractice ? new Date().toISOString() : null,
        excluded_by: isPractice ? userId : null,
        exclusion_reason: isPractice ? "Practice Event" : null,
        status: "ACTIVE",
      })
      .select("*")
      .single();

    if (error || !data) {
      return { error: error?.message || "Failed to create call." };
    }

    const profiles = await fetchProfiles([userId]);
    const call = mapSupabaseRow(data as SupabaseCallRow, profiles);
    if (!call) return { error: "Failed to create call." };
    return { call };
  }

  const result = createMockCall(userId, input);
  return {
    call: result.call ? mockToCallRecord(result.call) : undefined,
    error: result.error,
  };
}

export async function markTeamArrival(
  id: string
): Promise<{ call?: CallRecord; error?: string }> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return supabaseConfigError();

    const existing = await fetchCallById(id);
    if (!existing) return { error: "Call not found" };
    if (existing.status !== "ACTIVE") return { error: "Call is not active" };
    if (existing.teamArrivalTime) return { error: "Team arrival already recorded" };

    const arrival = new Date();
    const responseTimeSeconds = Math.max(
      0,
      Math.floor((arrival.getTime() - new Date(existing.startTime).getTime()) / 1000)
    );

    const { data, error } = await admin
      .from("calls")
      .update({
        team_arrival_time: arrival.toISOString(),
        response_time_seconds: responseTimeSeconds,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to record team arrival." };

    const profiles = await fetchProfiles([data.created_by, data.excluded_by].filter(Boolean));
    const call = mapSupabaseRow(data as SupabaseCallRow, profiles);
    if (!call) return { error: "Failed to record team arrival." };
    return { call };
  }

  const result = recordTeamArrival(id);
  return {
    call: result.call ? mockToCallRecord(result.call) : undefined,
    error: result.error,
  };
}

export async function resolveCall(
  id: string,
  input: ResolveCallInput
): Promise<{ call?: CallRecord; error?: string }> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return supabaseConfigError();

    const existing = await fetchCallById(id);
    if (!existing) return { error: "Call not found" };
    if (existing.status !== "ACTIVE") return { error: "Call is not active" };

    const outcomeName = (await import("@/lib/mock-data")).findMockOutcome(input.outcomeId)?.name;
    if (!outcomeName) return { error: "Invalid outcome selected." };

    const resolved = new Date();
    const totalCallDurationSeconds = Math.max(
      0,
      Math.floor((resolved.getTime() - new Date(existing.startTime).getTime()) / 1000)
    );

    const { data, error } = await admin
      .from("calls")
      .update({
        resolved_time: resolved.toISOString(),
        total_call_duration_seconds: totalCallDurationSeconds,
        outcome: outcomeName,
        resolution_notes: input.resolutionNotes?.trim() || null,
        status: "RESOLVED",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to resolve call." };

    const profiles = await fetchProfiles([data.created_by, data.excluded_by].filter(Boolean));
    const call = mapSupabaseRow(data as SupabaseCallRow, profiles);
    if (!call) return { error: "Failed to resolve call." };
    return { call };
  }

  const result = resolveMockCall(id, input);
  return {
    call: result.call ? mockToCallRecord(result.call) : undefined,
    error: result.error,
  };
}

export async function excludeCallFromReporting(
  id: string,
  userId: string,
  input: ExcludeCallInput
): Promise<{ call?: CallRecord; error?: string }> {
  if (isSupabaseConfigured()) {
    const userCheck = assertSupabaseUserId(userId);
    if (!userCheck.ok) return invalidUserIdError();

    const admin = getSupabaseAdmin();
    if (!admin) return supabaseConfigError();

    const existing = await fetchCallById(id);
    if (!existing) return { error: "Call not found" };
    if (existing.status === "ACTIVE") {
      return { error: "Active calls must be resolved before excluding from reporting." };
    }
    if (existing.status === "EXCLUDED") {
      return { error: "This event is already excluded from reporting." };
    }

    const { data, error } = await admin
      .from("calls")
      .update({
        excluded_from_reporting: true,
        excluded_at: new Date().toISOString(),
        excluded_by: userId,
        exclusion_reason: input.reason?.trim() || null,
        status: "EXCLUDED",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to exclude call." };

    const profiles = await fetchProfiles([data.created_by, data.excluded_by].filter(Boolean));
    const call = mapSupabaseRow(data as SupabaseCallRow, profiles);
    if (!call) return { error: "Failed to exclude call." };
    return { call };
  }

  const result = excludeMockCall(id, userId, input);
  return {
    call: result.call ? mockToCallRecord(result.call) : undefined,
    error: result.error,
  };
}

export async function listCalls(options: ListCallsOptions = {}): Promise<CallRecord[]> {
  const {
    includeExcluded = false,
    reportingOnly = false,
    statuses,
  } = options;

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return [];

    let query = admin.from("calls").select("*");

    if (reportingOnly) {
      query = query.eq("excluded_from_reporting", false);
    } else if (!includeExcluded) {
      query = query.eq("excluded_from_reporting", false);
    }

    if (statuses?.length) {
      query = query.in("status", statuses);
    } else if (!reportingOnly) {
      query = query.in("status", ["RESOLVED", "EXCLUDED"]);
    } else {
      query = query.eq("status", "RESOLVED");
    }

    const { data, error } = await query.order("start_time", { ascending: false });
    if (error || !data) return [];

    const profileIds = data.flatMap((row) =>
      [row.created_by, row.excluded_by].filter(Boolean)
    ) as string[];
    const profiles = await fetchProfiles(profileIds);

    const calls = data
      .map((row) => mapSupabaseRow(row as SupabaseCallRow, profiles))
      .filter((call): call is CallRecord => call !== null);

    return filterCalls(calls, options);
  }

  let calls = listMockCalls({ includeExcluded, reportingOnly }).map(mockToCallRecord);

  if (statuses?.length) {
    calls = calls.filter((call) => statuses.includes(call.status));
  }

  return filterCalls(calls, options);
}

export async function countActiveCalls(): Promise<number> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return 0;

    const { count, error } = await admin
      .from("calls")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE");

    return error ? 0 : count ?? 0;
  }

  return countActiveMockCalls();
}

export async function listReportingCalls(options: ListCallsOptions = {}): Promise<CallRecord[]> {
  return listCalls({
    ...options,
    reportingOnly: true,
    includeExcluded: false,
  });
}

export { findCategoryIdByName, findOutcomeIdByName };
