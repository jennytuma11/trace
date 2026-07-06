"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CallTimer } from "@/components/CallTimer";
import { ActionButton } from "@/components/ActionButton";
import { SelectField } from "@/components/SelectField";
import { CallTypeBadge } from "@/components/CallTypeBadge";
import { SessionUser } from "@/lib/types";
import { canResolveCall } from "@/lib/permissions";
import {
  formatLocalDateTime,
  formatDuration,
} from "@/lib/datetime";

interface Call {
  id: string;
  status: string;
  callTypeId: string;
  callType: { id: string; name: string };
  rapidResponseCategory: { id: string; name: string } | null;
  unitLocation: string;
  reportingUnit: string | null;
  mappingStatus: "Mapped" | "Unmapped";
  additionalNotes: string | null;
  startTime: string;
  teamArrivalTime: string | null;
  responseTimeSeconds: number | null;
  eventType: string;
  excludedFromReporting: boolean;
}

interface LookupData {
  outcomes: { id: string; name: string }[];
}

interface ActiveCallClientProps {
  user: SessionUser;
  callId: string;
}

export function ActiveCallClient({ user, callId }: ActiveCallClientProps) {
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [outcomeId, setOutcomeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [arrivalLoading, setArrivalLoading] = useState(false);

  const canResolve = canResolveCall(user.role);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calls/${callId}`).then((r) => r.json()),
      fetch("/api/lookup").then((r) => r.json()),
    ])
      .then(([callData, lookupData]) => {
        if (callData.call) {
          if (callData.call.status !== "ACTIVE") {
            router.push(`/calls/${callId}`);
            return;
          }
          setCall(callData.call);
        } else {
          console.error("[Trace] Active call not found:", callData);
          setError("Active call not found. It may have expired — please start a new call.");
        }
        setLookup(lookupData);
      })
      .catch((err) => {
        console.error("[Trace] Failed to load active call:", err);
        setError("Unable to load active call. Please try again.");
      });
  }, [callId, router]);

  async function handleTeamArrived() {
    setArrivalLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "team_arrived" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to record team arrival");
        return;
      }

      setCall(data.call);
    } catch (err) {
      console.error("[Trace] Team arrival failed:", err);
      setError("Failed to record team arrival. Please try again.");
    } finally {
      setArrivalLoading(false);
    }
  }

  async function handleResolveCall() {
    if (!outcomeId) {
      setError("Please select an outcome before resolving the call.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeId, resolutionNotes }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resolve call");
        return;
      }

      router.push(`/calls/${callId}`);
    } catch (err) {
      console.error("[Trace] Resolve call failed:", err);
      setError("Failed to resolve call. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!call) {
    return (
      <AppShell user={user}>
        {error ? (
          <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        ) : (
          <div className="h-64 rounded-2xl bg-white border border-border animate-pulse" />
        )}
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Active Call</h2>
          <span className="inline-block px-3 py-1 rounded-full bg-teal-100 text-primary text-xs font-semibold uppercase tracking-wide">
            Active
          </span>
        </div>

        {call.excludedFromReporting && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-muted">
            Practice / test event — excluded from operational reporting.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
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
          {call.rapidResponseCategory && (
            <InfoRow label="RR Category" value={call.rapidResponseCategory.name} />
          )}
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
          {call.additionalNotes && (
            <InfoRow label="Additional Notes" value={call.additionalNotes} />
          )}
          <InfoRow label="Call Start Time" value={formatLocalDateTime(call.startTime)} />
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm text-center">
          <CallTimer
            startTime={call.startTime}
            format="hms"
            label="Total Time on Call"
          />
        </div>

        {canResolve && (
          <>
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Team Arrival</h3>
                <p className="text-sm text-muted mt-1">
                  Record when the rapid response team arrives on scene.
                </p>
              </div>

              {call.responseTimeSeconds != null ? (
                <div className="rounded-xl bg-background border border-border p-4 text-center">
                  <p className="text-sm font-medium text-muted uppercase tracking-wide">
                    Response Time
                  </p>
                  <p className="font-mono text-4xl font-bold tracking-wider mt-2 tabular-nums">
                    {formatDuration(call.responseTimeSeconds, "response")}
                  </p>
                  {call.teamArrivalTime && (
                    <p className="text-xs text-muted mt-2">
                      Arrived {formatLocalDateTime(call.teamArrivalTime)}
                    </p>
                  )}
                </div>
              ) : (
                <ActionButton
                  size="xl"
                  variant="success"
                  onClick={handleTeamArrived}
                  disabled={arrivalLoading}
                >
                  {arrivalLoading ? "Recording…" : "Team Arrived"}
                </ActionButton>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-lg">Resolve Call</h3>

              {lookup && (
                <SelectField
                  label="Outcome *"
                  options={lookup.outcomes}
                  value={outcomeId}
                  onChange={(e) => {
                    setOutcomeId(e.target.value);
                    if (error) setError("");
                  }}
                  required
                />
              )}

              <label className="block">
                <span className="block text-sm font-medium mb-2">
                  Resolution Notes (Optional)
                </span>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Operational notes only — no PHI"
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary resize-none"
                />
              </label>

              {error && (
                <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              <ActionButton
                size="xl"
                variant="danger"
                onClick={handleResolveCall}
                disabled={loading || !outcomeId}
              >
                {loading ? "Resolving…" : "Resolve Call"}
              </ActionButton>
            </div>
          </>
        )}

        {!canResolve && (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
            You have read-only access to this active call.
          </div>
        )}

        <Link href="/calls" className="block text-center text-sm text-primary hover:underline">
          View call history
        </Link>
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
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
