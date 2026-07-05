import { MOCK_USERS } from "@/lib/mock-auth";

export interface MockLookupItem {
  id: string;
  name: string;
}

export const MOCK_UNITS: MockLookupItem[] = [
  { id: "unit-icu", name: "ICU" },
  { id: "unit-med-surg-3a", name: "Med-Surg 3A" },
  { id: "unit-med-surg-3b", name: "Med-Surg 3B" },
  { id: "unit-med-surg-4a", name: "Med-Surg 4A" },
  { id: "unit-med-surg-4b", name: "Med-Surg 4B" },
  { id: "unit-telemetry-5a", name: "Telemetry 5A" },
  { id: "unit-telemetry-5b", name: "Telemetry 5B" },
  { id: "unit-ed", name: "Emergency Department" },
  { id: "unit-pacu", name: "Post-Anesthesia Care" },
  { id: "unit-ld", name: "Labor & Delivery" },
  { id: "unit-peds", name: "Pediatrics" },
  { id: "unit-oncology", name: "Oncology" },
];

export const MOCK_CALL_TYPES: MockLookupItem[] = [
  { id: "type-rapid-response", name: "Rapid Response" },
  { id: "type-code-blue", name: "Code Blue" },
];

export const RAPID_RESPONSE_TYPE_ID = "type-rapid-response";
export const CODE_BLUE_TYPE_ID = "type-code-blue";

export const MOCK_RR_CATEGORIES: MockLookupItem[] = [
  { id: "rr-sepsis", name: "Sepsis" },
  { id: "rr-ams", name: "AMS" },
  { id: "rr-stemi", name: "STEMI" },
  { id: "rr-stroke", name: "STROKE" },
  { id: "rr-respiratory-distress", name: "Respiratory Distress" },
  { id: "rr-patient-deterioration", name: "Patient Deterioration Assessment" },
  { id: "rr-critical-care-transport", name: "Critical Care Transport" },
  { id: "rr-clinical-assistance", name: "Clinical Assistance" },
  { id: "rr-mtp", name: "MTP" },
  { id: "rr-airway-emergency", name: "Airway Emergency" },
];

export const MOCK_OUTCOMES: MockLookupItem[] = [
  { id: "outcome-stabilized", name: "Stabilized on unit" },
  { id: "outcome-icu", name: "Transferred to ICU" },
  { id: "outcome-code-blue", name: "Code Blue" },
  { id: "outcome-cancelled", name: "Cancelled page" },
  { id: "outcome-death", name: "Death" },
  { id: "outcome-other", name: "Other" },
];

export function getMockLookup() {
  return {
    units: MOCK_UNITS,
    callTypes: MOCK_CALL_TYPES,
    rapidResponseCategories: MOCK_RR_CATEGORIES,
    outcomes: MOCK_OUTCOMES,
    users: MOCK_USERS.map(({ id, name, role }) => ({ id, name, role })),
  };
}

export function findMockUnit(id: string) {
  return MOCK_UNITS.find((u) => u.id === id) ?? null;
}

export function findMockCallType(id: string) {
  return MOCK_CALL_TYPES.find((t) => t.id === id) ?? null;
}

export function findMockRrCategory(id: string) {
  return MOCK_RR_CATEGORIES.find((c) => c.id === id) ?? null;
}

export function findMockOutcome(id: string) {
  return MOCK_OUTCOMES.find((o) => o.id === id) ?? null;
}

export function findMockOutcomeByName(name: string) {
  return MOCK_OUTCOMES.find((o) => o.name === name) ?? null;
}

export function findMockUser(id: string) {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, name: user.name };
}
