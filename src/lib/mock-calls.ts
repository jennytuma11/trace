import {
  findMockCallType,
  findMockOutcome,
  findMockRrCategory,
  findMockUser,
  isCodeBlueType,
  isRapidResponseType,
} from "@/lib/mock-data";
import { toStoredISOString } from "@/lib/datetime";
import { CallStatus, EventType } from "@/lib/types";
import { MappingStatus } from "@/lib/units/types";

export interface MockCallRecord {
  id: string;
  userId: string;
  callTypeId: string;
  rapidResponseCategoryId: string | null;
  unitLocation: string;
  reportingUnit: string | null;
  mappingStatus: MappingStatus;
  additionalNotes: string | null;
  startTime: Date;
  teamArrivalTime: Date | null;
  responseTimeSeconds: number | null;
  resolvedTime: Date | null;
  totalCallDurationSeconds: number | null;
  outcomeId: string | null;
  resolutionNotes: string | null;
  status: CallStatus;
  excludedFromReporting: boolean;
  excludedAt: Date | null;
  excludedBy: string | null;
  exclusionReason: string | null;
  eventType: EventType;
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
  reportingUnit: string | null;
  mappingStatus: MappingStatus;
  additionalNotes: string | null;
  startTime: string;
  teamArrivalTime: string | null;
  responseTimeSeconds: number | null;
  resolvedTime: string | null;
  totalCallDurationSeconds: number | null;
  outcomeId: string | null;
  outcome: { id: string; name: string } | null;
  resolutionNotes: string | null;
  excludedFromReporting: boolean;
  excludedAt: string | null;
  excludedBy: string | null;
  excludedByUser: { id: string; name: string } | null;
  exclusionReason: string | null;
  eventType: EventType;
  user: { id: string; name: string };
}

export interface CreateMockCallInput {
  callTypeId: string;
  unitLocation: string;
  reportingUnit?: string | null;
  mappingStatus?: MappingStatus;
  rapidResponseCategoryId?: string | null;
  additionalNotes?: string | null;
  isPracticeTest?: boolean;
}

export interface ResolveMockCallInput {
  outcomeId: string;
  resolutionNotes?: string | null;
}

export interface ExcludeMockCallInput {
  reason?: string | null;
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
  const excludedByUser = call.excludedBy ? findMockUser(call.excludedBy) : null;

  return {
    id: call.id,
    userId: call.userId,
    status: call.status,
    callTypeId: call.callTypeId,
    callType,
    rapidResponseCategoryId: call.rapidResponseCategoryId,
    rapidResponseCategory,
    unitLocation: call.unitLocation,
    reportingUnit: call.reportingUnit ?? null,
    mappingStatus: call.mappingStatus ?? "Unmapped",
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
    excludedFromReporting: call.excludedFromReporting,
    excludedAt: call.excludedAt ? toStoredISOString(call.excludedAt) : null,
    excludedBy: call.excludedBy,
    excludedByUser,
    exclusionReason: call.exclusionReason,
    eventType: call.eventType,
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
  const {
    callTypeId,
    unitLocation,
    reportingUnit,
    mappingStatus,
    rapidResponseCategoryId,
    additionalNotes,
    isPracticeTest,
  } = input;

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

  const isPractice = Boolean(isPracticeTest);
  const id = `call-${crypto.randomUUID()}`;
  const record: MockCallRecord = {
    id,
    userId,
    callTypeId,
    rapidResponseCategoryId: categoryId,
    unitLocation: trimmedLocation,
    reportingUnit: reportingUnit ?? null,
    mappingStatus: mappingStatus ?? "Unmapped",
    additionalNotes: additionalNotes?.trim() || null,
    startTime: new Date(),
    teamArrivalTime: null,
    responseTimeSeconds: null,
    resolvedTime: null,
    totalCallDurationSeconds: null,
    outcomeId: null,
    resolutionNotes: null,
    status: "ACTIVE",
    excludedFromReporting: isPractice,
    excludedAt: isPractice ? new Date() : null,
    excludedBy: isPractice ? userId : null,
    exclusionReason: isPractice ? "Practice Event" : null,
    eventType: isPractice ? "Practice" : "Operational",
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

export function excludeMockCall(
  id: string,
  userId: string,
  input: ExcludeMockCallInput
): { call?: SerializedMockCall; error?: string } {
  const store = getStore();
  const call = store.get(id);
  if (!call) return { error: "Call not found" };
  if (call.status === "ACTIVE") {
    return { error: "Active calls must be resolved before excluding from reporting." };
  }
  if (call.excludedFromReporting && call.status === "EXCLUDED") {
    return { error: "This event is already excluded from reporting." };
  }

  call.excludedFromReporting = true;
  call.excludedAt = new Date();
  call.excludedBy = userId;
  call.exclusionReason = input.reason?.trim() || null;
  call.status = "EXCLUDED";
  store.set(id, call);

  const serialized = serializeCall(call);
  if (!serialized) return { error: "Failed to exclude call." };
  return { call: serialized };
}

export interface ListMockCallsOptions {
  includeExcluded?: boolean;
  reportingOnly?: boolean;
}

export function listMockCalls(options: ListMockCallsOptions = {}) {
  const { includeExcluded = false, reportingOnly = false } = options;

  return Array.from(getStore().values())
    .filter((call) => {
      if (reportingOnly && call.excludedFromReporting) return false;
      if (!includeExcluded && call.excludedFromReporting) return false;
      return call.status === "RESOLVED" || call.status === "EXCLUDED";
    })
    .map((call) => serializeCall(call))
    .filter((call): call is SerializedMockCall => call !== null)
    .sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
}

export function listResolvedMockCalls() {
  return listMockCalls();
}

export function countActiveMockCalls() {
  return Array.from(getStore().values()).filter((call) => call.status === "ACTIVE").length;
}

export const listEndedMockCalls = listResolvedMockCalls;
