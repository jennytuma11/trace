"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SelectField } from "@/components/SelectField";
import { ActionButton } from "@/components/ActionButton";
import { SetupBanner } from "@/components/SetupBanner";
import { getCallTypeButtonClasses } from "@/components/CallTypeBadge";
import { SessionUser } from "@/lib/types";
import {
  CODE_BLUE_TYPE_ID,
  RAPID_RESPONSE_TYPE_ID,
} from "@/lib/mock-data";

interface LookupData {
  callTypes: { id: string; name: string }[];
  rapidResponseCategories: { id: string; name: string }[];
}

interface StartCallClientProps {
  user: SessionUser;
}

function isValidLookup(data: unknown): data is LookupData {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  return (
    Array.isArray(record.callTypes) &&
    Array.isArray(record.rapidResponseCategories)
  );
}

export function StartCallClient({ user }: StartCallClientProps) {
  const router = useRouter();
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [unitLocation, setUnitLocation] = useState("");
  const [callTypeId, setCallTypeId] = useState("");
  const [rrCategoryId, setRrCategoryId] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isPracticeTest, setIsPracticeTest] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  const isRapidResponse = callTypeId === RAPID_RESPONSE_TYPE_ID;

  useEffect(() => {
    Promise.all([
      fetch("/api/lookup").then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load lookup data");
        if (!isValidLookup(data)) throw new Error("Invalid lookup data received");
        return data;
      }),
      fetch("/api/calls/active").then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to check active call");
        return data;
      }),
    ])
      .then(([lookupData, activeData]) => {
        setLookup(lookupData);
        if (activeData.activeCall?.id) {
          setActiveCallId(activeData.activeCall.id);
        }
      })
      .catch((err) => {
        console.error("[Trace] Failed to load start call data:", err);
        setError("Unable to load start call form. Please refresh and try again.");
      });
  }, []);

  useEffect(() => {
    if (activeCallId) {
      router.push(`/call/${activeCallId}`);
    }
  }, [activeCallId, router]);

  function selectCallType(id: string) {
    setCallTypeId(id);
    if (id === CODE_BLUE_TYPE_ID) {
      setRrCategoryId("");
    }
    if (error) setError("");
  }

  async function handleStart() {
    if (!unitLocation.trim() && !callTypeId) {
      setError("Please enter a unit / location and select a call type.");
      return;
    }
    if (!unitLocation.trim()) {
      setError("Unit / location is required.");
      return;
    }
    if (!callTypeId) {
      setError("Please select a call type before starting.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/calls/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitLocation: unitLocation.trim(),
          callTypeId,
          rapidResponseCategoryId: isRapidResponse ? rrCategoryId || null : null,
          additionalNotes: additionalNotes.trim() || null,
          isPracticeTest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.callId) {
          router.push(`/call/${data.callId}`);
          return;
        }
        console.error("[Trace] Start call failed:", data.error || res.status);
        setError(data.error || "Failed to start call. Please try again.");
        return;
      }

      if (!data.call?.id) {
        console.error("[Trace] Start call returned no call id:", data);
        setError("Call started but navigation failed. Please refresh and try again.");
        return;
      }

      router.push(`/call/${data.call.id}`);
    } catch (err) {
      console.error("[Trace] Failed to start call:", err);
      setError("Unable to start call. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (activeCallId) {
    return (
      <AppShell user={user}>
        <div className="text-center py-12 text-muted">Redirecting to active call…</div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-lg mx-auto">
        <SetupBanner />

        <div>
          <h2 className="text-2xl font-bold">Start Call</h2>
          <p className="text-muted text-sm mt-1">Timer starts when you begin</p>
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {lookup ? (
          <div className="space-y-4 bg-white rounded-2xl border border-border p-5 shadow-sm">
            <div>
              <span className="block text-sm font-medium text-foreground mb-2">
                Call Type
              </span>
              <div className="grid grid-cols-2 gap-3">
                {lookup.callTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => selectCallType(type.id)}
                    className={`px-4 py-5 text-base rounded-2xl border-2 font-semibold transition-colors ${getCallTypeButtonClasses(type.id, callTypeId === type.id)}`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {isRapidResponse && (
              <SelectField
                label="Rapid Response Category (Optional)"
                options={lookup.rapidResponseCategories}
                value={rrCategoryId}
                onChange={(e) => setRrCategoryId(e.target.value)}
              />
            )}

            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-2">
                Unit / Location
              </span>
              <input
                type="text"
                value={unitLocation}
                onChange={(e) => {
                  setUnitLocation(e.target.value);
                  if (error) setError("");
                }}
                required
                placeholder="Enter unit, room, or location..."
                className="w-full px-4 py-3.5 text-base rounded-xl border-2 border-border bg-white focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted mt-2">
                e.g. 5 South, ICU Room 12, ED Trauma 2, Cath Lab
              </p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-2">
                Additional Notes / Details
              </span>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                placeholder="Operational details only — no PHI"
                className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary resize-none"
              />
            </label>

            <div className="rounded-xl border border-border bg-background p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPracticeTest}
                  onChange={(e) => setIsPracticeTest(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-medium">Practice / Test Event</span>
                  <span className="block text-xs text-muted mt-1">
                    Use this for training, testing, or practice events that should not be
                    included in operational reporting.
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : !error ? (
          <div className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
        ) : null}

        <ActionButton
          size="xl"
          onClick={handleStart}
          disabled={loading || !lookup}
        >
          {loading ? "Starting…" : "Start Call"}
        </ActionButton>
      </div>
    </AppShell>
  );
}
