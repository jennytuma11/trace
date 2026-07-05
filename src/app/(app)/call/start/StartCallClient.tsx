"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SelectField } from "@/components/SelectField";
import { ActionButton } from "@/components/ActionButton";
import { Role } from "@prisma/client";

interface LookupData {
  units: { id: string; name: string }[];
  callTypes: { id: string; name: string }[];
}

interface StartCallClientProps {
  user: { name: string; role: Role };
}

export function StartCallClient({ user }: StartCallClientProps) {
  const router = useRouter();
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [unitId, setUnitId] = useState("");
  const [callTypeId, setCallTypeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/lookup").then((r) => r.json()),
      fetch("/api/calls/active").then((r) => r.json()),
    ]).then(([lookupData, activeData]) => {
      setLookup(lookupData);
      if (activeData.activeCall) {
        setActiveCallId(activeData.activeCall.id);
      }
    });
  }, []);

  async function handleStart() {
    if (!unitId || !callTypeId) {
      setError("Please select unit and call type");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/calls/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, callTypeId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.callId) {
          router.push(`/call/${data.callId}`);
          return;
        }
        setError(data.error || "Failed to start call");
        return;
      }

      router.push(`/call/${data.call.id}`);
    } catch {
      setError("Unable to start call. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (activeCallId) {
    router.push(`/call/${activeCallId}`);
    return null;
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-lg mx-auto">
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
            <SelectField
              label="Unit / Location"
              options={lookup.units}
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            />
            <SelectField
              label="Call Type"
              options={lookup.callTypes}
              value={callTypeId}
              onChange={(e) => setCallTypeId(e.target.value)}
            />
          </div>
        ) : (
          <div className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
        )}

        <ActionButton size="xl" onClick={handleStart} disabled={loading || !lookup}>
          {loading ? "Starting…" : "Start Call"}
        </ActionButton>
      </div>
    </AppShell>
  );
}
