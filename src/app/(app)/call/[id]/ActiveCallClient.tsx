"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CallTimer } from "@/components/CallTimer";
import { ActionButton } from "@/components/ActionButton";
import { SelectField } from "@/components/SelectField";
import { Role } from "@prisma/client";
import { formatCallTypeLabel, formatDateTime, toDateTimeLocalInput } from "@/lib/utils";

interface Call {
  id: string;
  pageReceivedAt: string;
  arrivedAt: string | null;
  stabilizedAt: string | null;
  status: string;
  detailsNotes: string | null;
  notes: string | null;
  unit: { id: string; name: string };
  callType: { id: string; name: string };
  rapidResponseCategory: { id: string; name: string } | null;
  outcome: { id: string; name: string } | null;
  user: { id: string; name: string };
}

interface LookupData {
  units: { id: string; name: string }[];
  callTypes: { id: string; name: string }[];
  outcomes: { id: string; name: string }[];
}

interface ActiveCallClientProps {
  user: { name: string; role: Role };
  callId: string;
}

export function ActiveCallClient({ user, callId }: ActiveCallClientProps) {
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [showEndForm, setShowEndForm] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calls/${callId}`).then((r) => r.json()),
      fetch("/api/lookup").then((r) => r.json()),
    ]).then(([callData, lookupData]) => {
      if (callData.call) {
        setCall(callData.call);
        if (callData.call.status === "ENDED") {
          router.push("/calls");
          return;
        }
        setEndTime(toDateTimeLocalInput(new Date()));
      } else {
        console.error("[Trace] Active call not found:", callData);
        setError("Active call not found. It may have expired — please start a new call.");
      }
      setLookup(lookupData);
    }).catch((err) => {
      console.error("[Trace] Failed to load active call:", err);
      setError("Unable to load active call. Please try again.");
    });
  }, [callId, router]);

  async function performAction(action: string) {
    setActionLoading(action);
    setError("");

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }

      setCall(data.call);

      if (action === "icu_transfer" || action === "cancelled") {
        const suggested = lookup?.outcomes.find((o) => o.name === data.suggestedOutcome);
        if (suggested) setOutcomeId(suggested.id);
        setShowEndForm(true);
      }
    } catch {
      setError("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEndCall(e: React.FormEvent) {
    e.preventDefault();
    if (!endTime || !outcomeId) {
      setError("End time and outcome are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime, outcomeId, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to end call");
        return;
      }

      router.push("/calls");
    } catch {
      setError("Failed to end call. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!call) {
    return (
      <AppShell user={user}>
        <div className="h-64 rounded-2xl bg-white border border-border animate-pulse" />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-primary text-xs font-semibold uppercase tracking-wide">
            Status: Active
          </span>
          <p className="text-sm font-medium text-primary uppercase tracking-wide mt-3">Active Call</p>
          <CallTimer startTime={call.pageReceivedAt} className="mt-3" />
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <InfoRow label="Status" value="Active" highlight />
          <InfoRow label="Page received" value={formatDateTime(call.pageReceivedAt)} />
          <InfoRow label="Call type" value={formatCallTypeLabel(call)} />
          <InfoRow label="Unit" value={call.unit.name} />
          {call.rapidResponseCategory && (
            <InfoRow
              label="RR category"
              value={call.rapidResponseCategory.name}
            />
          )}
          {call.detailsNotes && (
            <InfoRow label="Details" value={call.detailsNotes} />
          )}
          {call.arrivedAt && (
            <InfoRow label="Arrived" value={formatDateTime(call.arrivedAt)} highlight />
          )}
          {call.stabilizedAt && (
            <InfoRow label="Stabilized" value={formatDateTime(call.stabilizedAt)} highlight />
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {!showEndForm ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionButton
              variant="success"
              onClick={() => performAction("arrived")}
              disabled={!!actionLoading || !!call.arrivedAt}
            >
              {call.arrivedAt ? "Arrived ✓" : actionLoading === "arrived" ? "…" : "Arrived"}
            </ActionButton>
            <ActionButton
              variant="success"
              onClick={() => performAction("stabilized")}
              disabled={!!actionLoading || !!call.stabilizedAt}
            >
              {call.stabilizedAt
                ? "Stabilized ✓"
                : actionLoading === "stabilized"
                  ? "…"
                  : "Patient stabilized"}
            </ActionButton>
            <ActionButton
              variant="warning"
              onClick={() => performAction("icu_transfer")}
              disabled={!!actionLoading}
            >
              ICU transfer
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={() => performAction("cancelled")}
              disabled={!!actionLoading}
            >
              Cancelled
            </ActionButton>
            <div className="sm:col-span-2">
              <ActionButton variant="danger" onClick={() => setShowEndForm(true)}>
                End call
              </ActionButton>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleEndCall}
            className="bg-white rounded-2xl border-2 border-primary p-5 shadow-sm space-y-4"
          >
            <h3 className="font-semibold text-lg">End Call</h3>

            <label className="block">
              <span className="block text-sm font-medium mb-2">End time *</span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl border-2 border-border focus:border-primary"
              />
            </label>

            {lookup && (
              <SelectField
                label="Final outcome *"
                options={lookup.outcomes}
                value={outcomeId}
                onChange={(e) => setOutcomeId(e.target.value)}
                required
              />
            )}

            <label className="block">
              <span className="block text-sm font-medium mb-2">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Operational notes only — no PHI"
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary resize-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <ActionButton
                type="button"
                variant="ghost"
                onClick={() => setShowEndForm(false)}
              >
                Back
              </ActionButton>
              <ActionButton type="submit" variant="danger" disabled={loading}>
                {loading ? "Saving…" : "Complete"}
              </ActionButton>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-success" : ""}`}>
        {value}
      </span>
    </div>
  );
}
