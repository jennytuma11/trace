"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  AvgDurationChart,
  CallsByHourChart,
  CallsByTypeChart,
  CallsByUnitChart,
  ChartCard,
  OutcomesChart,
  TeamTimeChart,
} from "@/components/Charts";
import { Role } from "@prisma/client";
import { toISODateInput } from "@/lib/utils";
import { subDays } from "date-fns";

interface AnalyticsData {
  callsByType: { name: string; count: number }[];
  callsByUnit: { name: string; count: number }[];
  callsByHour: { hour: string; count: number }[];
  avgDurationByType: { name: string; avgMinutes: number }[];
  outcomes: { name: string; count: number }[];
  teamTimeByDay: { date: string; hours: number; minutes: number }[];
  totalCalls: number;
}

interface AnalyticsClientProps {
  user: { name: string; role: Role };
}

export function AnalyticsClient({ user }: AnalyticsClientProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(toISODateInput(subDays(today, 30)));
  const [endDate, setEndDate] = useState(toISODateInput(today));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ startDate, endDate });
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-muted text-sm mt-1">
              {data ? `${data.totalCalls} calls in selected period` : "Loading…"}
            </p>
          </div>
          <div className="flex gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-white"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-white"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="grid md:grid-cols-2 gap-4">
            <ChartCard title="Calls by type">
              <CallsByTypeChart data={data.callsByType} />
            </ChartCard>
            <ChartCard title="Calls by unit">
              <CallsByUnitChart data={data.callsByUnit} />
            </ChartCard>
            <ChartCard title="Calls by hour of day">
              <CallsByHourChart data={data.callsByHour} />
            </ChartCard>
            <ChartCard title="Average duration by call type">
              <AvgDurationChart data={data.avgDurationByType} />
            </ChartCard>
            <ChartCard title="Outcomes">
              <OutcomesChart data={data.outcomes} />
            </ChartCard>
            <ChartCard title="Total team time on calls by day">
              <TeamTimeChart data={data.teamTimeByDay} />
            </ChartCard>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
