import { toStoredISOString } from "@/lib/datetime";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { matchesLocationPattern } from "@/lib/units/pattern";
import { UnitCrosswalkRule, UnitMappingResult } from "@/lib/units/types";

export interface CrosswalkRuleInput {
  locationPattern: string;
  reportingUnit: string;
  description?: string | null;
  active?: boolean;
}

interface SupabaseCrosswalkRow {
  id: string;
  location_pattern: string;
  reporting_unit: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const globalForCrosswalk = globalThis as unknown as {
  mockCrosswalkStore: Map<string, UnitCrosswalkRule> | undefined;
};

const DEFAULT_MOCK_RULES: Omit<UnitCrosswalkRule, "createdAt" | "updatedAt">[] = [
  { id: "xwalk-3", locationPattern: "3*", reportingUnit: "3 West", description: "3rd floor west units", active: true },
  { id: "xwalk-4", locationPattern: "4*", reportingUnit: "4 West", description: "4th floor west units", active: true },
  { id: "xwalk-icu", locationPattern: "ICU*", reportingUnit: "ICU", description: "Intensive care units", active: true },
  { id: "xwalk-ed", locationPattern: "ED*", reportingUnit: "Emergency Department", description: "Emergency department", active: true },
  { id: "xwalk-pacu", locationPattern: "PACU*", reportingUnit: "PACU", description: "Post-anesthesia care", active: true },
  { id: "xwalk-or", locationPattern: "OR*", reportingUnit: "Operating Room", description: "Operating rooms", active: true },
];

function getMockStore(): Map<string, UnitCrosswalkRule> {
  if (!globalForCrosswalk.mockCrosswalkStore) {
    const store = new Map<string, UnitCrosswalkRule>();
    const now = toStoredISOString();
    for (const rule of DEFAULT_MOCK_RULES) {
      store.set(rule.id, { ...rule, createdAt: now, updatedAt: now });
    }
    globalForCrosswalk.mockCrosswalkStore = store;
  }
  return globalForCrosswalk.mockCrosswalkStore;
}

function mapRow(row: SupabaseCrosswalkRow): UnitCrosswalkRule {
  return {
    id: row.id,
    locationPattern: row.location_pattern,
    reportingUnit: row.reporting_unit,
    description: row.description,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateRuleInput(input: CrosswalkRuleInput): string | null {
  if (!input.locationPattern?.trim()) return "Location pattern is required.";
  if (!input.reportingUnit?.trim()) return "Reporting unit is required.";
  return null;
}

export async function listCrosswalkRules(): Promise<UnitCrosswalkRule[]> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return listMockCrosswalkRules();

    const { data, error } = await admin
      .from("unit_crosswalk")
      .select("*")
      .order("location_pattern");

    if (error || !data) return [];
    return data.map((row) => mapRow(row as SupabaseCrosswalkRow));
  }

  return listMockCrosswalkRules();
}

function listMockCrosswalkRules(): UnitCrosswalkRule[] {
  return Array.from(getMockStore().values()).sort((a, b) =>
    a.locationPattern.localeCompare(b.locationPattern)
  );
}

export async function listActiveCrosswalkRules(): Promise<UnitCrosswalkRule[]> {
  const rules = await listCrosswalkRules();
  return rules
    .filter((rule) => rule.active)
    .sort((a, b) => b.locationPattern.length - a.locationPattern.length);
}

export async function resolveUnitMapping(unitLocation: string): Promise<UnitMappingResult> {
  const trimmed = unitLocation.trim();
  const activeRules = await listActiveCrosswalkRules();

  for (const rule of activeRules) {
    if (matchesLocationPattern(trimmed, rule.locationPattern)) {
      return {
        reportingUnit: rule.reportingUnit,
        mappingStatus: "Mapped",
      };
    }
  }

  return {
    reportingUnit: null,
    mappingStatus: "Unmapped",
  };
}

export async function createCrosswalkRule(
  input: CrosswalkRuleInput
): Promise<{ rule?: UnitCrosswalkRule; error?: string }> {
  const validationError = validateRuleInput(input);
  if (validationError) return { error: validationError };

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return createMockCrosswalkRule(input);

    const { data, error } = await admin
      .from("unit_crosswalk")
      .insert({
        location_pattern: input.locationPattern.trim(),
        reporting_unit: input.reportingUnit.trim(),
        description: input.description?.trim() || null,
        active: input.active ?? true,
      })
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to create crosswalk rule." };
    return { rule: mapRow(data as SupabaseCrosswalkRow) };
  }

  return createMockCrosswalkRule(input);
}

function createMockCrosswalkRule(
  input: CrosswalkRuleInput
): { rule?: UnitCrosswalkRule; error?: string } {
  const store = getMockStore();
  const now = toStoredISOString();
  const rule: UnitCrosswalkRule = {
    id: `xwalk-${crypto.randomUUID()}`,
    locationPattern: input.locationPattern.trim(),
    reportingUnit: input.reportingUnit.trim(),
    description: input.description?.trim() || null,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  store.set(rule.id, rule);
  return { rule };
}

export async function updateCrosswalkRule(
  id: string,
  input: CrosswalkRuleInput
): Promise<{ rule?: UnitCrosswalkRule; error?: string }> {
  const validationError = validateRuleInput(input);
  if (validationError) return { error: validationError };

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return updateMockCrosswalkRule(id, input);

    const { data, error } = await admin
      .from("unit_crosswalk")
      .update({
        location_pattern: input.locationPattern.trim(),
        reporting_unit: input.reportingUnit.trim(),
        description: input.description?.trim() || null,
        active: input.active ?? true,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to update crosswalk rule." };
    return { rule: mapRow(data as SupabaseCrosswalkRow) };
  }

  return updateMockCrosswalkRule(id, input);
}

function updateMockCrosswalkRule(
  id: string,
  input: CrosswalkRuleInput
): { rule?: UnitCrosswalkRule; error?: string } {
  const store = getMockStore();
  const existing = store.get(id);
  if (!existing) return { error: "Crosswalk rule not found." };

  const rule: UnitCrosswalkRule = {
    ...existing,
    locationPattern: input.locationPattern.trim(),
    reportingUnit: input.reportingUnit.trim(),
    description: input.description?.trim() || null,
    active: input.active ?? true,
    updatedAt: toStoredISOString(),
  };
  store.set(id, rule);
  return { rule };
}

export async function setCrosswalkRuleActive(
  id: string,
  active: boolean
): Promise<{ rule?: UnitCrosswalkRule; error?: string }> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (!admin) return setMockCrosswalkRuleActive(id, active);

    const { data, error } = await admin
      .from("unit_crosswalk")
      .update({ active })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) return { error: error?.message || "Failed to update crosswalk rule." };
    return { rule: mapRow(data as SupabaseCrosswalkRow) };
  }

  return setMockCrosswalkRuleActive(id, active);
}

function setMockCrosswalkRuleActive(
  id: string,
  active: boolean
): { rule?: UnitCrosswalkRule; error?: string } {
  const store = getMockStore();
  const existing = store.get(id);
  if (!existing) return { error: "Crosswalk rule not found." };

  const rule: UnitCrosswalkRule = {
    ...existing,
    active,
    updatedAt: toStoredISOString(),
  };
  store.set(id, rule);
  return { rule };
}
