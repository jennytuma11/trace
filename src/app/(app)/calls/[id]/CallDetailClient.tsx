"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActionButton } from "@/components/ActionButton";
import { CallTypeBadge } from "@/components/CallTypeBadge";
import { SessionUser } from "@/lib/types";
import { canExcludeFromReporting } from "@/lib/permissions";
import {
  formatDuration,
  formatLocalDateTime,
} from "@/lib/datetime";

const EXCLUSION_REASONS = [
  "Practice Event",
  "Training",
  "Duplicate Entry",
  "Entered in Error",
  "Other",
];

interface Call {
  id: string;
  status: string;
  callTypeId: string;
  callType: { name: string };
  rapidResponseCategory: { name: string } | null;
  unitLocation: string;
  reportingUnit: string | null;
  mappingStatus: "Mapped" | "Unmapped";
  additionalNotes: string | null;
  resolutionNotes: string | null;
  startTime: string;
  teamArrivalTime: string | null;
  responseTimeSeconds: number | null;
  resolvedTime: string | null;
  totalCallDurationSeconds: number | null;
  outcome: { name: string } | null;
  user: { name: string };
  eventType: string;
  excludedFromReporting: boolean;
  excludedAt: string | null;
  excludedByUser: { name: string } | null;
  exclusionReason: string | null;
}

interface CallDetailClientProps {
  user: SessionUser;
  callId: string;
}

export function CallDetailClient({ user, callId }: CallDetailClientProps) {
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [excludeLoading, setExcludeLoading] = useState(false);

  const isAdmin = canExcludeFromReporting(user.role);
  const canExclude =
    isAdmin &&
    call &&
    call.status !== "ACTIVE" &&
    call.status !== "EXCLUDED" &&
    !call.excludedFromReporting;

  useEffect(() => {
    fetch(`/api/calls/${callId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.call) {
          setCall(data.call);
        } else {
          setError("Call not found.");
        }
      })
      .catch(() => setError("Unable to load call details."))
      .finally(() => setLoading(false));
  }, [callId]);

  async function handleExclude() {
    if (!confirmChecked) return;

    setExcludeLoading(true);
    setError("");

    const exclusionReason = reason === "Other" ? customReason.trim() : reason;

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exclude",
          reason: exclusionReason || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to exclude event");
        return;
      }

      setCall(data.call);
      setShowModal(false);
      setConfirmChecked(false);
      setReason("");
      setCustomReason("");
    } catch {
      setError("Failed to exclude event. Please try again.");
    } finally {
      setExcludeLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell user={user}>
        <div className="h-64 rounded-2xl bg-white border border-border animate-pulse" />
      </AppShell>
    );
  }

  if (!call) {
    return (
      <AppShell user={user}>
        <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
          {error || "Call not found."}
        </div>
      </AppShell>
    );
  }

  const excluded = call.excludedFromReporting;

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/calls" className="text-sm text-primary hover:underline">
              ← Back to Call History
            </Link>
            <h2 className="text-2xl font-bold mt-2">Call Details</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            {call.status === "ACTIVE" && (
              <Link
                href={`/call/${call.id}`}
                className="inline-block px-3 py-1 rounded-full bg-teal-100 text-primary text-xs font-semibold uppercase"
              >
                Active
              </Link>
            )}
            {excluded && (
              <span className="inline-block px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-bold uppercase">
                Excluded
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div
          className={`rounded-2xl border p-5 shadow-sm space-y-3 ${
            excluded ? "bg-gray-50 border-gray-200" : "bg-white border-border"
          }`}
        >
          <InfoRow
            label="Call Type"
            value={
              <CallTypeBadge
                callTypeId={call.callTypeId}
                callTypeName={call.callType.name}
                size="sm"
              />
            }
          />
          <InfoRow label="RR Category" value={call.rapidResponseCategory?.name ?? "—"} />
          <InfoRow label="Entered Location" value={call.unitLocation} />
          <InfoRow
            label="Reporting Unit"
            value={call.reportingUnit ?? "Unmapped"}
          />
          <InfoRow
            label="Mapping Status"
            value={
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  call.mappingStatus === "Mapped"
                    ? "bg-teal-100 text-primary"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {call.mappingStatus}
              </span>
            }
          />
          <InfoRow label="Event Type" value={call.eventType} />
          <InfoRow label="Team Member" value={call.user.name} />
          <InfoRow label="Start Time" value={formatLocalDateTime(call.startTime)} />
          <InfoRow
            label="Team Arrival"
            value={
              call.teamArrivalTime
                ? formatLocalDateTime(call.teamArrivalTime)
                : "—"
            }
          />
          <InfoRow
            label="Response Time"
            value={
              call.responseTimeSeconds != null
                ? formatDuration(call.responseTimeSeconds, "response")
                : "—"
            }
          />
          <InfoRow
            label="End Time"
            value={call.resolvedTime ? formatLocalDateTime(call.resolvedTime) : "—"}
          />
          <InfoRow
            label="Total Duration"
            value={
              call.totalCallDurationSeconds != null
                ? formatDuration(call.totalCallDurationSeconds, "elapsed")
                : "—"
            }
          />
          <InfoRow label="Outcome" value={call.outcome?.name ?? "—"} />
          {call.additionalNotes && (
            <InfoRow label="Additional Notes" value={call.additionalNotes} />
          )}
          {call.resolutionNotes && (
            <InfoRow label="Resolution Notes" value={call.resolutionNotes} />
          )}

          {excluded && (
            <>
              {call.excludedAt && (
                <InfoRow label="Excluded Date" value={formatLocalDateTime(call.excludedAt)} />
              )}
              {call.excludedByUser && (
                <InfoRow label="Excluded By" value={call.excludedByUser.name} />
              )}
              {call.exclusionReason && (
                <InfoRow label="Exclusion Reason" value={call.exclusionReason} />
              )}
            </>
          )}
        </div>

        {canExclude && (
          <ActionButton variant="secondary" size="lg" onClick={() => setShowModal(true)}>
            Exclude Event from Reporting
          </ActionButton>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Exclude Event from Reporting</h3>
              <p className="text-sm text-muted">
                This event will remain in the system but will no longer be included in
                dashboards, analytics, reports, or performance metrics.
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary"
                />
                <span className="text-sm">
                  I confirm this event should be excluded from reporting.
                </span>
              </label>

              <label className="block">
                <span className="block text-sm font-medium mb-2">
                  Reason for Exclusion (Optional)
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white"
                >
                  <option value="">Select a reason…</option>
                  {EXCLUSION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              {reason === "Other" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter reason…"
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              )}

              <div className="flex gap-3 pt-2">
                <ActionButton
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false);
                    setConfirmChecked(false);
                  }}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="danger"
                  size="md"
                  className="flex-1"
                  onClick={handleExclude}
                  disabled={!confirmChecked || excludeLoading}
                >
                  {excludeLoading ? "Excluding…" : "Exclude"}
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4 border-b border-border/60 last:border-0 pb-3 last:pb-0">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
