"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SetupBanner } from "@/components/SetupBanner";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { KpiCard } from "@/components/KpiCard";
import { SessionUser } from "@/lib/types";
import { canExportData } from "@/lib/permissions";
import { appendTimezoneParam, getUserTimezone, toISODateInput } from "@/lib/datetime";
import { subDays } from "date-fns";

interface ReportsData {
  totalCalls: number;
  callsByType: { name: string; count: number }[];
  outcomes: { name: string; count: number }[];
  callsByUnit: { name: string; count: number }[];
}

export function ReportsClient({ user }: { user: SessionUser }) {
  const today = new Date();
  const timeZone = getUserTimezone();
  const [startDate, setStartDate] = useState(toISODateInput(subDays(today, 30), timeZone));
  const [endDate, setEndDate] = useState(toISODateInput(today, timeZone));
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = appendTimezoneParam(
      new URLSearchParams({ startDate, endDate }),
      timeZone
    );
    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then((analytics) =>
        setData({
          totalCalls: analytics.totalCalls,
          callsByType: analytics.callsByType,
          outcomes: analytics.outcomes,
          callsByUnit: analytics.callsByUnit,
        })
      )
      .finally(() => setLoading(false));
  }, [startDate, endDate, timeZone]);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <SetupBanner />

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-muted text-sm mt-1">
              Operational reporting for quality review and analysis
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {canExportData(user.role) && (
              <ExportExcelButton
                exportType="reports"
                params={{ startDate, endDate }}
                className="sm:w-auto"
              />
            )}
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
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total calls" value={data.totalCalls} />
              <KpiCard
                label="Rapid responses"
                value={data.callsByType.find((t) => t.name === "Rapid Response")?.count ?? 0}
              />
              <KpiCard
                label="Code blues"
                value={data.callsByType.find((t) => t.name === "Code Blue")?.count ?? 0}
              />
              <KpiCard label="Unique units" value={data.callsByUnit.length} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <ReportTable title="Outcomes" rows={data.outcomes.map((o) => [o.name, o.count])} />
              <ReportTable
                title="Calls by unit"
                rows={data.callsByUnit.slice(0, 10).map((u) => [u.name, u.count])}
              />
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function ReportTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, number][];
}) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-background font-semibold">{title}</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No data for selected period</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([name, count]) => (
              <tr key={name} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3 text-right font-medium">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
