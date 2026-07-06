import { EventType } from "@/lib/types";

export type MappingStatus = "Mapped" | "Unmapped";

export interface UnitCrosswalkRule {
  id: string;
  locationPattern: string;
  reportingUnit: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitMappingResult {
  reportingUnit: string | null;
  mappingStatus: MappingStatus;
}

export function isExcludedFromMappingReview(
  eventType: EventType,
  excludedFromReporting: boolean
): boolean {
  return eventType === "Practice" || excludedFromReporting;
}

export function requiresMappingReview(call: {
  mappingStatus: MappingStatus;
  eventType: EventType;
  excludedFromReporting: boolean;
}): boolean {
  if (isExcludedFromMappingReview(call.eventType, call.excludedFromReporting)) {
    return false;
  }
  return call.mappingStatus === "Unmapped";
}

export function getReportingUnitBucket(
  reportingUnit: string | null | undefined,
  mappingStatus: MappingStatus
): string {
  if (mappingStatus === "Mapped" && reportingUnit) {
    return reportingUnit;
  }
  return "Unmapped";
}

export function formatReportingUnitDisplay(
  reportingUnit: string | null | undefined,
  mappingStatus: MappingStatus
): string {
  if (mappingStatus === "Mapped" && reportingUnit) {
    return reportingUnit;
  }
  return "Unmapped";
}
