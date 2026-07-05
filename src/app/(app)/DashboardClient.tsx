"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KpiCard } from "@/components/KpiCard";
import { ActionButton } from "@/components/ActionButton";
import { Role } from "@prisma/client";
import { appendTimezoneParam, formatTotalMinutes, getUserTimezone } from "@/lib/datetime";

interface DashboardData {
  totalCallsToday: number;
  activeCalls: number;
  avgDurationMinutes: number;
  totalMinutesToday: number;
  callsThisWeek: number;
  mostFrequentCallType: string;
  busiestUnit: string;
  userActiveCallId: string | null;
}

interface DashboardPageProps {
  user: { name: string; role: Role };
}

export function DashboardClient({ user }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = appendTimezoneParam(new URLSearchParams(), getUserTimezone());
    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted text-sm mt-1">Today&apos;s rapid response operations</p>
        </div>

        {data?.userActiveCallId && (
          <Link
            href={`/call/${data.userActiveCallId}`}
            className="block rounded-2xl border-2 border-primary bg-teal-50 p-4 shadow-sm"
          >
            <p className="font-semibold text-primary">Active call in progress</p>
            <p className="text-sm text-muted mt-1">Tap to return to your call</p>
          </Link>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total calls today" value={data.totalCallsToday} />
              <KpiCard
                label="Active calls"
                value={data.activeCalls}
                accent={data.activeCalls > 0 ? "active" : "default"}
              />
              <KpiCard
                label="Avg call duration"
                value={data.avgDurationMinutes > 0 ? `${data.avgDurationMinutes} min` : "—"}
              />
              <KpiCard
                label="Time on calls today"
                value={
                  data.totalMinutesToday > 0
                    ? formatTotalMinutes(data.totalMinutesToday)
                    : "—"
                }
              />
              <KpiCard label="Calls this week" value={data.callsThisWeek} />
              <KpiCard label="Most frequent type" value={data.mostFrequentCallType} />
              <KpiCard label="Busiest unit" value={data.busiestUnit} />
            </div>

            <Link href="/call/start">
              <ActionButton size="xl" className="mt-2">
                Start Call
              </ActionButton>
            </Link>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
