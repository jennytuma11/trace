import {
  findMockCallType,
  findMockOutcome,
  findMockRrCategory,
  findMockUser,
  isCodeBlueType,
  isRapidResponseType,
} from "@/lib/mock-data";
import { toStoredISOString } from "@/lib/datetime";

export type CallStatus = "ACTIVE" | "RESOLVED";

export interface MockCallRecord {
  id: string;
  userId: string;
  callTypeId: string;
  rapidResponseCategoryId: string | null;
  unitLocation: string;
  additionalNotes: string | null;
  startTime: Date;
  teamArrivalTime: Date | null;
  responseTimeSeconds: number | null;
  resolvedTime: Date | null;
  totalCallDurationSeconds: number | null;
  outcomeId: string | null;
  resolutionNotes: string | null;
  status: CallStatus;
}

export interface SerializedMockCall {
  id: string;
  userId: string;
  status: CallStatus;
  callTypeId: string;
  callType: { id: string; name: string };
  rapidResponseCategoryId: string | null;
  rapidResponseCategory: { id: string; name: string } | null;
  unitLocation: string;
  additionalNotes: string | null;
  startTime: string;
  teamArrivalTime: string | null;
  responseTimeSeconds: number | null;
  resolvedTime: string | null;
  totalCallDurationSeconds: number | null;
  outcomeId: string | null;
  outcome: { id: string; name: string } | null;
  resolutionNotes: string | null;
  user: { id: string; name: string };
}

export interface CreateMockCallInput {
  callTypeId: string;
  unitLocation: string;
  rapidResponseCategoryId?: string | null;
  additionalNotes?: string | null;
}

export interface ResolveMockCallInput {
  outcomeId: string;
  resolutionNotes?: string | null;
}

const globalForCalls = globalThis as unknown as {
  mockCallStore: Map<string, MockCallRecord> | undefined;
};

function getStore(): Map<string, MockCallRecord> {
  if (!globalForCalls.mockCallStore) {
    globalForCalls.mockCallStore = new Map();
  }
  return globalForCalls.mockCallStore;
}

function computeDurationSeconds(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

function serializeCall(call: MockCallRecord): SerializedMockCall | null {
  const callType = findMockCallType(call.callTypeId);
  const user = findMockUser(call.userId);
  if (!callType || !user) return null;

  const outcome = call.outcomeId ? findMockOutcome(call.outcomeId) : null;
  const rapidResponseCategory = call.rapidResponseCategoryId
    ? findMockRrCategory(call.rapidResponseCategoryId)
    : null;

  return {
    id: call.id,
    userId: call.userId,
    status: call.status,
    callTypeId: call.callTypeId,
    callType,
    rapidResponseCategoryId: call.rapidResponseCategoryId,
    rapidResponseCategory,
    unitLocation: call.unitLocation,
    additionalNotes: call.additionalNotes,
    startTime: toStoredISOString(call.startTime),
    teamArrivalTime: call.teamArrivalTime
      ? toStoredISOString(call.teamArrivalTime)
      : null,
    responseTimeSeconds: call.responseTimeSeconds,
    resolvedTime: call.resolvedTime ? toStoredISOString(call.resolvedTime) : null,
    totalCallDurationSeconds: call.totalCallDurationSeconds,
    outcomeId: call.outcomeId,
    outcome,
    resolutionNotes: call.resolutionNotes,
    user,
  };
}

export function getActiveCallForUser(userId: string): SerializedMockCall | null {
  for (const call of getStore().values()) {
    if (call.userId === userId && call.status === "ACTIVE") {
      return serializeCall(call);
    }
  }
  return null;
}

export function getCallById(id: string): SerializedMockCall | null {
  const call = getStore().get(id);
  if (!call) return null;
  return serializeCall(call);
}

export function createMockCall(
  userId: string,
  input: CreateMockCallInput
): { call?: SerializedMockCall; error?: string } {
  const { callTypeId, unitLocation, rapidResponseCategoryId, additionalNotes } = input;

  const trimmedLocation = unitLocation?.trim();
  if (!trimmedLocation) {
    return { error: "Unit / location is required." };
  }
  if (!findMockCallType(callTypeId)) {
    return { error: "Please select a call type." };
  }
  if (!findMockUser(userId)) {
    return { error: "Invalid user session." };
  }

  let categoryId: string | null = rapidResponseCategoryId?.trim() || null;

  if (isCodeBlueType(callTypeId)) {
    categoryId = null;
  } else if (isRapidResponseType(callTypeId)) {
    if (categoryId && !findMockRrCategory(categoryId)) {
      return { error: "Invalid Rapid Response category selected." };
    }
  } else if (categoryId) {
    return { error: "Rapid Response category is only valid for Rapid Response calls." };
  }

  const existing = getActiveCallForUser(userId);
  if (existing) {
    return { error: "You already have an active call", call: existing };
  }

  const id = `call-${crypto.randomUUID()}`;
  const record: MockCallRecord = {
    id,
    userId,
    callTypeId,
    rapidResponseCategoryId: categoryId,
    unitLocation: trimmedLocation,
    additionalNotes: additionalNotes?.trim() || null,
    startTime: new Date(),
    teamArrivalTime: null,
    responseTimeSeconds: null,
    resolvedTime: null,
    totalCallDurationSeconds: null,
    outcomeId: null,
    resolutionNotes: null,
    status: "ACTIVE",
  };

  getStore().set(id, record);
  const call = serializeCall(record);
  if (!call) return { error: "Failed to create call." };
  return { call };
}

export function recordTeamArrival(
  id: string
): { call?: SerializedMockCall; error?: string } {
  const store = getStore();
  const call = store.get(id);
  if (!call) return { error: "Call not found" };
  if (call.status !== "ACTIVE") return { error: "Call is not active" };
  if (call.teamArrivalTime) return { error: "Team arrival already recorded" };

  const arrival = new Date();
  call.teamArrivalTime = arrival;
  call.responseTimeSeconds = computeDurationSeconds(call.startTime, arrival);
  store.set(id, call);

  const serialized = serializeCall(call);
  if (!serialized) return { error: "Failed to record team arrival." };
  return { call: serialized };
}

export function resolveMockCall(
  id: string,
  input: ResolveMockCallInput
): { call?: SerializedMockCall; error?: string } {
  const store = getStore();
  const call = store.get(id);
  if (!call) return { error: "Call not found" };
  if (call.status !== "ACTIVE") return { error: "Call is not active" };
  if (!input.outcomeId) return { error: "Outcome is required before resolving the call." };
  if (!findMockOutcome(input.outcomeId)) {
    return { error: "Invalid outcome selected." };
  }

  const resolved = new Date();
  call.resolvedTime = resolved;
  call.totalCallDurationSeconds = computeDurationSeconds(call.startTime, resolved);
  call.outcomeId = input.outcomeId;
  call.resolutionNotes = input.resolutionNotes?.trim() || null;
  call.status = "RESOLVED";
  store.set(id, call);

  const serialized = serializeCall(call);
  if (!serialized) return { error: "Failed to resolve call." };
  return { call: serialized };
}

export function listResolvedMockCalls() {
  return Array.from(getStore().values())
    .filter((call) => call.status === "RESOLVED")
    .map((call) => serializeCall(call))
    .filter((call): call is SerializedMockCall => call !== null)
    .sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
}

export function countActiveMockCalls() {
  return Array.from(getStore().values()).filter((call) => call.status === "ACTIVE").length;
}

// Backward-compatible alias used by API routes
export const listEndedMockCalls = listResolvedMockCalls;
