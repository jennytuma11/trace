import { MOCK_USERS } from "@/lib/mock-auth";

export interface MockLookupItem {
  id: string;
  name: string;
}

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
  { id: "rr-stroke", name: "Stroke" },
  { id: "rr-respiratory-distress", name: "Respiratory Distress" },
  { id: "rr-patient-deterioration", name: "Patient Deterioration Assessment" },
  { id: "rr-critical-care-transport", name: "Critical Care Transport" },
  { id: "rr-clinical-assistance", name: "Clinical Assistance" },
  { id: "rr-mtp", name: "MTP" },
  { id: "rr-airway-emergency", name: "Airway Emergency" },
];

export const MOCK_OUTCOMES: MockLookupItem[] = [
  { id: "outcome-remained", name: "Remained on Unit" },
  { id: "outcome-icu", name: "Transferred to ICU" },
  { id: "outcome-or", name: "Transferred to OR" },
  { id: "outcome-expired", name: "Expired" },
  { id: "outcome-cancelled", name: "Cancelled" },
];

export function getMockLookup() {
  return {
    callTypes: MOCK_CALL_TYPES,
    rapidResponseCategories: MOCK_RR_CATEGORIES,
    outcomes: MOCK_OUTCOMES,
    users: MOCK_USERS.map(({ id, name, role }) => ({ id, name, role })),
  };
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

export function findMockUser(id: string) {
  const user = MOCK_USERS.find((u) => u.id === id);
  if (!user) return null;
  return { id: user.id, name: user.name };
}

export function isRapidResponseType(callTypeId: string) {
  return callTypeId === RAPID_RESPONSE_TYPE_ID;
}

export function isCodeBlueType(callTypeId: string) {
  return callTypeId === CODE_BLUE_TYPE_ID;
}
