import {
  CODE_BLUE_TYPE_ID,
  findMockCallType,
  findMockOutcome,
  findMockOutcomeByName,
  findMockRrCategory,
  findMockRrCategoryByName,
  MOCK_CALL_TYPES,
  RAPID_RESPONSE_TYPE_ID,
} from "@/lib/mock-data";
import { CallStatus, EventType } from "@/lib/types";
import { MappingStatus } from "@/lib/units/types";

export interface CallRecord {
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

export interface CreateCallInput {
  callTypeId: string;
  unitLocation: string;
  rapidResponseCategoryId?: string | null;
  additionalNotes?: string | null;
  isPracticeTest?: boolean;
}

export interface ResolveCallInput {
  outcomeId: string;
  resolutionNotes?: string | null;
}

export interface ExcludeCallInput {
  reason?: string | null;
}

export interface ListCallsOptions {
  startDate?: string | null;
  endDate?: string | null;
  callTypeId?: string | null;
  outcomeId?: string | null;
  userId?: string | null;
  search?: string | null;
  timeZone?: string;
  includeExcluded?: boolean;
  reportingOnly?: boolean;
  statuses?: CallStatus[];
}

export function callTypeNameToId(name: string): string {
  return name === "Code Blue" ? CODE_BLUE_TYPE_ID : RAPID_RESPONSE_TYPE_ID;
}

export function callTypeIdToName(id: string): string {
  return MOCK_CALL_TYPES.find((t) => t.id === id)?.name ?? "Rapid Response";
}

export function findCategoryIdByName(name: string | null | undefined): string | null {
  if (!name) return null;
  return findMockRrCategoryByName(name)?.id ?? null;
}

export function findOutcomeIdByName(name: string | null | undefined): string | null {
  if (!name) return null;
  return findMockOutcomeByName(name)?.id ?? null;
}

export function enrichCallRecord(
  partial: Omit<
    CallRecord,
    "callType" | "rapidResponseCategory" | "outcome" | "user" | "callTypeId" | "outcomeId" | "rapidResponseCategoryId"
  > & {
    callTypeId?: string;
    callTypeName?: string;
    rapidResponseCategoryId?: string | null;
    rapidResponseCategoryName?: string | null;
    outcomeId?: string | null;
    outcomeName?: string | null;
    userName?: string;
    user?: { id: string; name: string };
  }
): CallRecord | null {
  const callTypeId =
    partial.callTypeId ??
    (partial.callTypeName ? callTypeNameToId(partial.callTypeName) : RAPID_RESPONSE_TYPE_ID);
  const callType = findMockCallType(callTypeId);
  if (!callType) return null;

  const rapidResponseCategoryId =
    partial.rapidResponseCategoryId ??
    (partial.rapidResponseCategoryName
      ? findCategoryIdByName(partial.rapidResponseCategoryName)
      : null);
  const rapidResponseCategory = rapidResponseCategoryId
    ? findMockRrCategory(rapidResponseCategoryId)
    : null;

  const outcomeId =
    partial.outcomeId ??
    (partial.outcomeName ? findOutcomeIdByName(partial.outcomeName) : null);
  const outcome = outcomeId ? findMockOutcome(outcomeId) : null;

  return {
    id: partial.id,
    userId: partial.userId,
    status: partial.status,
    callTypeId,
    callType,
    rapidResponseCategoryId: rapidResponseCategory?.id ?? null,
    rapidResponseCategory,
    unitLocation: partial.unitLocation,
    reportingUnit: partial.reportingUnit ?? null,
    mappingStatus: partial.mappingStatus ?? "Unmapped",
    additionalNotes: partial.additionalNotes,
    startTime: partial.startTime,
    teamArrivalTime: partial.teamArrivalTime,
    responseTimeSeconds: partial.responseTimeSeconds,
    resolvedTime: partial.resolvedTime,
    totalCallDurationSeconds: partial.totalCallDurationSeconds,
    outcomeId: outcome?.id ?? null,
    outcome,
    resolutionNotes: partial.resolutionNotes,
    excludedFromReporting: partial.excludedFromReporting,
    excludedAt: partial.excludedAt,
    excludedBy: partial.excludedBy,
    excludedByUser: partial.excludedByUser,
    exclusionReason: partial.exclusionReason,
    eventType: partial.eventType,
    user: partial.user ?? { id: partial.userId, name: partial.userName ?? "Unknown" },
  };
}

export type { CallStatus, EventType, MappingStatus };
