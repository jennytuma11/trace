"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ActionButton } from "@/components/ActionButton";
import { Role } from "@prisma/client";
import {
  formatDate,
  formatDurationMinutes,
  formatTime,
  toISODateInput,
} from "@/lib/utils";
import { subDays } from "date-fns";

interface Call {
  id: string;
  pageReceivedAt: string;
  endTime: string | null;
  unit: { name: string };
  callType: { name: string };
  outcome: { name: string } | null;
  user: { name: string };
}

interface LookupData {
  units: { id: string; name: string }[];
  callTypes: { id: string; name: string }[];
  outcomes: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

interface CallLogClientProps {
  user: { name: string; role: Role };
}

export function CallLogClient({ user }: CallLogClientProps) {
  const [lookup, setLookup] = useState<LookupData | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [startDate, setStartDate] = useState(toISODateInput(subDays(today, 30)));
  const [endDate, setEndDate] = useState(toISODateInput(today));
  const [unitId, setUnitId] = useState("");
  const [callTypeId, setCallTypeId] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");

  const loadCalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (unitId) params.set("unitId", unitId);
    if (callTypeId) params.set("callTypeId", callTypeId);
    if (outcomeId) params.set("outcomeId", outcomeId);
    if (userId) params.set("userId", userId);
    if (search) params.set("search", search);

    const res = await fetch(`/api/calls?${params}`);
    const data = await res.json();
    setCalls(data.calls || []);
    setLoading(false);
  }, [startDate, endDate, unitId, callTypeId, outcomeId, userId, search]);

  useEffect(() => {
    fetch("/api/lookup").then((r) => r.json()).then(setLookup);
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  function handleExport() {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (unitId) params.set("unitId", unitId);
    if (callTypeId) params.set("callTypeId", callTypeId);
    if (outcomeId) params.set("outcomeId", outcomeId);
    if (userId) params.set("userId", userId);
    if (search) params.set("search", search);
    window.open(`/api/export?${params}`, "_blank");
  }

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Call Log</h2>
            <p className="text-muted text-sm mt-1">{calls.length} calls</p>
          </div>
          <ActionButton variant="secondary" size="md" onClick={handleExport} className="sm:w-auto">
            Export CSV
          </ActionButton>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
          <input
            type="search"
            placeholder="Search unit, type, outcome, team member…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-primary"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <FilterDate label="From" value={startDate} onChange={setStartDate} />
            <FilterDate label="To" value={endDate} onChange={setEndDate} />
            {lookup && (
              <>
                <FilterSelect
                  label="Unit"
                  value={unitId}
                  onChange={setUnitId}
                  options={lookup.units}
                />
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
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Start</th>
                    <th className="px-4 py-3 font-semibold">End</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                    <th className="px-4 py-3 font-semibold">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <tr key={call.id} className="border-b border-border last:border-0 hover:bg-background/50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(call.pageReceivedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatTime(call.pageReceivedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {call.endTime ? formatTime(call.endTime) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {call.endTime
                          ? formatDurationMinutes(call.pageReceivedAt, call.endTime)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{call.unit.name}</td>
                      <td className="px-4 py-3">{call.callType.name}</td>
                      <td className="px-4 py-3">{call.outcome?.name ?? "—"}</td>
                      <td className="px-4 py-3">{call.user.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white rounded-2xl border border-border p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="font-semibold">{call.callType.name}</p>
                    <p className="text-xs text-muted shrink-0">
                      {formatDate(call.pageReceivedAt)}
                    </p>
                  </div>
                  <p className="text-sm text-muted">{call.unit.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted">Time</p>
                      <p>
                        {formatTime(call.pageReceivedAt)}
                        {call.endTime ? ` – ${formatTime(call.endTime)}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Duration</p>
                      <p>
                        {call.endTime
                          ? formatDurationMinutes(call.pageReceivedAt, call.endTime)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Outcome</p>
                      <p>{call.outcome?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Team</p>
                      <p>{call.user.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
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
