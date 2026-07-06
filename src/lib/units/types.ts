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
