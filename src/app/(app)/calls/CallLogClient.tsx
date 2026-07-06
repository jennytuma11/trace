"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CallTypeBadge } from "@/components/CallTypeBadge";
import { SetupBanner } from "@/components/SetupBanner";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { SessionUser } from "@/lib/types";
import { canExcludeFromReporting, canExportData } from "@/lib/permissions";
import {
  appendTimezoneParam,
  formatDuration,
  formatLocalDateTime,
  formatLocalTime,
  getUserTimezone,
  toISODateInput,
} from "@/lib/datetime";
import { subDays } from "date-fns";

interface Call {
  id: string;
  startTime: string;
  teamArrivalTime: string | null;
  responseTimeSeconds: number | null;
  resolvedTime: string | null;
  totalCallDurationSeconds: number | null;
  callTypeId: string;
  callType: { name: string };
  rapidResponseCategory: { name: string } | null;
  unitLocation: string;
  outcome: { name: string } | null;
  user: { name: string };
  excludedFromReporting: boolean;
  excludedAt: string | null;
  excludedByUser: { name: string } | null;
  exclusionReason: string | null;
  eventType: string;
  status: string;
}

interface LookupData {
  callTypes: { id: string; name: string }[];
  outcomes: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

interface CallLogClientProps {
  user: SessionUser;
}

export function CallLogClient({ user }: CallLogClientProps) {
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExcluded, setShowExcluded] = useState(false);

  const today = new Date();
  const timeZone = getUserTimezone();
  const [startDate, setStartDate] = useState(toISODateInput(subDays(today, 30), timeZone));
  const [endDate, setEndDate] = useState(toISODateInput(today, timeZone));
  const [callTypeId, setCallTypeId] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");

  const loadCalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (callTypeId) params.set("callTypeId", callTypeId);
    if (outcomeId) params.set("outcomeId", outcomeId);
    if (userId) params.set("userId", userId);
    if (search) params.set("search", search);
    if (showExcluded) params.set("includeExcluded", "true");
    appendTimezoneParam(params, timeZone);

    const res = await fetch(`/api/calls?${params}`);
    const data = await res.json();
    setCalls(data.calls || []);
    setLoading(false);
  }, [startDate, endDate, callTypeId, outcomeId, userId, search, showExcluded, timeZone]);

  useEffect(() => {
    fetch("/api/lookup").then((r) => r.json()).then(setLookup);
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const isAdmin = canExcludeFromReporting(user.role);

  function getExportParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (callTypeId) params.callTypeId = callTypeId;
    if (outcomeId) params.outcomeId = outcomeId;
    if (userId) params.userId = userId;
    if (search) params.search = search;
    return params;
  }

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <SetupBanner />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Call History</h2>
            <p className="text-muted text-sm mt-1">{calls.length} calls</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-border bg-white">
                <input
                  type="checkbox"
                  checked={showExcluded}
                  onChange={(e) => setShowExcluded(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Show Excluded Events
              </label>
            )}
            {canExportData(user.role) && (
              <ExportExcelButton
                exportType="history"
                params={getExportParams()}
                className="sm:w-auto"
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
          <input
            type="search"
            placeholder="Search location, type, category, outcome, team member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterDate label="From" value={startDate} onChange={setStartDate} />
            <FilterDate label="To" value={endDate} onChange={setEndDate} />
            {lookup && (
              <>
                <FilterSelect
                  label="Type"
                  value={callTypeId}
                  onChange={setCallTypeId}
                  options={lookup.callTypes}
                />
                <FilterSelect
                  label="Outcome"
                  value={outcomeId}
                  onChange={setOutcomeId}
                  options={lookup.outcomes}
                />
                <FilterSelect
                  label="Team member"
                  value={userId}
                  onChange={setUserId}
                  options={lookup.users}
                />
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
        ) : calls.length === 0 ? (
          <div className="text-center py-12 text-muted">No calls match your filters</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">RR Category</th>
                    <th className="px-4 py-3 font-semibold">Unit / Location</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">Team Arrival</th>
                    <th className="px-4 py-3 font-semibold">Response</th>
                    <th className="px-4 py-3 font-semibold">End</th>
                    <th className="px-4 py-3 font-semibold">Total Duration</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <CallHistoryRow
                      key={call.id}
                      call={call}
                      timeZone={timeZone}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-3">
              {calls.map((call) => (
                <CallHistoryCard
                  key={call.id}
                  call={call}
                  timeZone={timeZone}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function CallHistoryRow({ call, timeZone }: { call: Call; timeZone: string }) {
  const excluded = call.excludedFromReporting;

  return (
    <tr
      className={`border-b border-border last:border-0 hover:bg-background/50 ${
        excluded ? "bg-gray-50 text-muted" : ""
      }`}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <CallTypeBadge
            callTypeId={call.callTypeId}
            callTypeName={call.callType.name}
            size="sm"
          />
          {excluded && <ExcludedBadge />}
        </div>
      </td>
      <td className="px-4 py-3">{call.rapidResponseCategory?.name ?? "—"}</td>
      <td className="px-4 py-3">
        <Link href={`/calls/${call.id}`} className="hover:text-primary hover:underline">
          {call.unitLocation}
        </Link>
        {excluded && <ExcludedMeta call={call} timeZone={timeZone} />}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {formatLocalDateTime(call.startTime, timeZone)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {call.teamArrivalTime
          ? formatLocalDateTime(call.teamArrivalTime, timeZone)
          : "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {call.responseTimeSeconds != null
          ? formatDuration(call.responseTimeSeconds, "response")
          : "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {call.resolvedTime
          ? formatLocalDateTime(call.resolvedTime, timeZone)
          : "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap font-mono">
        {call.totalCallDurationSeconds != null
          ? formatDuration(call.totalCallDurationSeconds, "elapsed")
          : "—"}
      </td>
      <td className="px-4 py-3">{call.outcome?.name ?? "—"}</td>
    </tr>
  );
}

function CallHistoryCard({ call, timeZone }: { call: Call; timeZone: string }) {
  const excluded = call.excludedFromReporting;

  return (
    <Link
      href={`/calls/${call.id}`}
      className={`block rounded-2xl border p-4 shadow-sm ${
        excluded ? "bg-gray-50 border-gray-200 text-muted" : "bg-white border-border"
      }`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CallTypeBadge
            callTypeId={call.callTypeId}
            callTypeName={call.callType.name}
            size="sm"
          />
          {excluded && <ExcludedBadge />}
        </div>
        <p className="text-xs text-muted shrink-0">
          {formatLocalTime(call.startTime, timeZone)}
        </p>
      </div>
      <p className="text-sm font-medium">{call.unitLocation}</p>
      {call.rapidResponseCategory && (
        <p className="text-sm text-muted mt-1">{call.rapidResponseCategory.name}</p>
      )}
      {excluded && <ExcludedMeta call={call} timeZone={timeZone} />}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <HistoryStat
          label="Response"
          value={
            call.responseTimeSeconds != null
              ? formatDuration(call.responseTimeSeconds, "response")
              : "—"
          }
        />
        <HistoryStat
          label="Total"
          value={
            call.totalCallDurationSeconds != null
              ? formatDuration(call.totalCallDurationSeconds, "elapsed")
              : "—"
          }
        />
        <HistoryStat label="Outcome" value={call.outcome?.name ?? "—"} />
        <HistoryStat
          label="End"
          value={
            call.resolvedTime
              ? formatLocalTime(call.resolvedTime, timeZone)
              : "—"
          }
        />
      </div>
    </Link>
  );
}

function ExcludedBadge() {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wide">
      Excluded
    </span>
  );
}

function ExcludedMeta({ call, timeZone }: { call: Call; timeZone: string }) {
  return (
    <div className="mt-1 text-xs text-muted space-y-0.5">
      <p>Event type: {call.eventType}</p>
      {call.excludedAt && (
        <p>Excluded: {formatLocalDateTime(call.excludedAt, timeZone)}</p>
      )}
      {call.excludedByUser && <p>Excluded by: {call.excludedByUser.name}</p>}
      {call.exclusionReason && <p>Reason: {call.exclusionReason}</p>}
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2 text-sm rounded-lg border border-border"
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2 text-sm rounded-lg border border-border bg-white"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p>{value}</p>
    </div>
  );
}
