"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActionButton } from "@/components/ActionButton";
import { SetupBanner } from "@/components/SetupBanner";
import { SessionUser } from "@/lib/types";
import { formatLocalDateTime } from "@/lib/datetime";
import { useEffect, useState } from "react";

interface CrosswalkRule {
  id: string;
  locationPattern: string;
  reportingUnit: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UnmappedCall {
  id: string;
  unitLocation: string;
  startTime: string;
  callType: string;
  status: string;
  eventType: string;
  excludedFromReporting: boolean;
}

interface RuleFormState {
  locationPattern: string;
  reportingUnit: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: RuleFormState = {
  locationPattern: "",
  reportingUnit: "",
  description: "",
  active: true,
};

export function SettingsClient({ user }: { user: SessionUser }) {
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);
  const [rules, setRules] = useState<CrosswalkRule[]>([]);
  const [unmappedCalls, setUnmappedCalls] = useState<UnmappedCall[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingUnmapped, setLoadingUnmapped] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<RuleFormState>(EMPTY_FORM);
  const [editingRule, setEditingRule] = useState<CrosswalkRule | null>(null);
  const [editForm, setEditForm] = useState<RuleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadRules() {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/settings/unit-crosswalk");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load crosswalk rules.");
        return;
      }
      setRules(data.rules || []);
    } catch {
      setError("Failed to load crosswalk rules.");
    } finally {
      setLoadingRules(false);
    }
  }

  async function loadUnmapped() {
    setLoadingUnmapped(true);
    try {
      const res = await fetch("/api/settings/unmapped-locations");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load unmapped locations.");
        return;
      }
      setUnmappedCalls(data.calls || []);
    } catch {
      setError("Failed to load unmapped locations.");
    } finally {
      setLoadingUnmapped(false);
    }
  }

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setSupabaseConfigured(data.supabaseConfigured))
      .catch(() => setSupabaseConfigured(false));

    loadRules();
    loadUnmapped();
  }, []);

  async function handleAddRule() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/unit-crosswalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add crosswalk rule.");
        return;
      }
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      await loadRules();
    } catch {
      setError("Failed to add crosswalk rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingRule) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/settings/unit-crosswalk/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update crosswalk rule.");
        return;
      }
      setEditingRule(null);
      await loadRules();
    } catch {
      setError("Failed to update crosswalk rule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: CrosswalkRule) {
    setError("");
    try {
      const res = await fetch(`/api/settings/unit-crosswalk/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rule.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update crosswalk rule.");
        return;
      }
      await loadRules();
    } catch {
      setError("Failed to update crosswalk rule.");
    }
  }

  function openEdit(rule: CrosswalkRule) {
    setEditingRule(rule);
    setEditForm({
      locationPattern: rule.locationPattern,
      reportingUnit: rule.reportingUnit,
      description: rule.description ?? "",
      active: rule.active,
    });
  }

  return (
    <AppShell user={user}>
      <div className="space-y-8 max-w-4xl">
        <SetupBanner />

        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted text-sm mt-1">System configuration</p>
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold">Database</h3>
            <p className="text-sm text-muted mt-1">
              Status:{" "}
              {supabaseConfigured === null
                ? "Checking…"
                : supabaseConfigured
                  ? "Supabase connected"
                  : "Local demo mode (in-memory fallback)"}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="text-sm space-y-2 text-muted">
              <p>To enable persistent call history:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Supabase project</li>
                <li>
                  Run <code className="bg-background px-1 rounded">supabase/schema.sql</code> in
                  the SQL Editor
                </li>
                <li>Create auth users for admin, member, and viewer demo accounts</li>
                <li>
                  Set environment variables in Vercel or{" "}
                  <code className="bg-background px-1 rounded">.env.local</code>
                </li>
              </ol>
            </div>
          )}
        </div>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Unit Crosswalk</h3>
              <p className="text-sm text-muted mt-1">
                Map free-text unit locations to reporting units. TRACE never guesses — only
                administrator-defined rules are applied.
              </p>
              <p className="text-xs text-muted mt-2">
                Patterns support{" "}
                <code className="bg-background px-1 rounded">*</code> wildcards (
                <code className="bg-background px-1 rounded">ICU*</code>,{" "}
                <code className="bg-background px-1 rounded">ct</code>), and numeric ranges (
                <code className="bg-background px-1 rounded">2000-2017</code> matches room{" "}
                <code className="bg-background px-1 rounded">2008</code>).
              </p>
            </div>
            <ActionButton
              variant="primary"
              size="md"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "Cancel" : "Add Rule"}
            </ActionButton>
          </div>

          {showAddForm && (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
              <h4 className="font-medium">New Crosswalk Rule</h4>
              <RuleForm
                form={addForm}
                onChange={setAddForm}
                onSubmit={handleAddRule}
                submitLabel={saving ? "Saving…" : "Save Rule"}
                disabled={saving}
              />
            </div>
          )}

          {loadingRules ? (
            <div className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted">
              No crosswalk rules defined. Calls will be flagged as unmapped until rules are added.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-4 py-3 font-semibold">Location Pattern</th>
                    <th className="px-4 py-3 font-semibold">Reporting Unit</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{rule.locationPattern}</td>
                      <td className="px-4 py-3">{rule.reportingUnit}</td>
                      <td className="px-4 py-3 text-muted">{rule.description || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            rule.active
                              ? "bg-teal-100 text-primary"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className="text-muted hover:underline text-xs font-medium"
                          >
                            {rule.active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Unmapped Locations</h3>
              <p className="text-sm text-muted mt-1">
                Calls where no reporting unit was assigned. Review these to add or adjust crosswalk
                rules.
              </p>
            </div>
            <ActionButton variant="secondary" size="md" onClick={loadUnmapped}>
              Refresh
            </ActionButton>
          </div>

          {loadingUnmapped ? (
            <div className="h-32 rounded-2xl bg-white border border-border animate-pulse" />
          ) : unmappedCalls.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-5 text-sm text-muted">
              No unmapped locations found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-4 py-3 font-semibold">Entered Location</th>
                    <th className="px-4 py-3 font-semibold">Call Type</th>
                    <th className="px-4 py-3 font-semibold">Start Time</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Call</th>
                  </tr>
                </thead>
                <tbody>
                  {unmappedCalls.map((call) => (
                    <tr key={call.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{call.unitLocation}</td>
                      <td className="px-4 py-3">{call.callType}</td>
                      <td className="px-4 py-3">{formatLocalDateTime(call.startTime)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                          Needs mapping
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/calls/${call.id}`} className="text-primary hover:underline text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editingRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-border shadow-xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Edit Crosswalk Rule</h3>
              <RuleForm
                form={editForm}
                onChange={setEditForm}
                onSubmit={handleSaveEdit}
                submitLabel={saving ? "Saving…" : "Save Changes"}
                disabled={saving}
                showActiveToggle
              />
              <ActionButton
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => setEditingRule(null)}
              >
                Cancel
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function RuleForm({
  form,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  showActiveToggle = false,
}: {
  form: RuleFormState;
  onChange: (form: RuleFormState) => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  showActiveToggle?: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-sm font-medium mb-1">Location Pattern</span>
        <input
          type="text"
          value={form.locationPattern}
          onChange={(e) => onChange({ ...form, locationPattern: e.target.value })}
          placeholder="e.g. ICU*, 2000-2017, or ct"
          className="w-full px-3 py-2 rounded-lg border border-border"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Reporting Unit</span>
        <input
          type="text"
          value={form.reportingUnit}
          onChange={(e) => onChange({ ...form, reportingUnit: e.target.value })}
          placeholder="e.g. ICU"
          className="w-full px-3 py-2 rounded-lg border border-border"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Description (optional)</span>
        <input
          type="text"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="Brief description"
          className="w-full px-3 py-2 rounded-lg border border-border"
        />
      </label>
      {showActiveToggle && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => onChange({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary"
          />
          <span className="text-sm">Active</span>
        </label>
      )}
      <ActionButton
        variant="primary"
        size="md"
        className="w-full"
        onClick={onSubmit}
        disabled={disabled || !form.locationPattern.trim() || !form.reportingUnit.trim()}
      >
        {submitLabel}
      </ActionButton>
    </div>
  );
}
