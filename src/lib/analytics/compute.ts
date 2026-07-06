import { listReportingCalls } from "@/lib/calls/repository";
import { CallRecord } from "@/lib/calls/types";
import {
  formatLocalDateKey,
  getCallDurationMinutes,
  getLocalDateKey,
  getLocalHour,
  getLocalHourLabel,
  getTodayRangeInTimezone,
  isInstantInLocalDateRange,
} from "@/lib/datetime";

export interface AnalyticsResult {
  callsByType: { name: string; count: number }[];
  callsByUnit: { name: string; count: number }[];
  callsByHour: { hour: string; count: number }[];
  avgDurationByType: { name: string; avgMinutes: number }[];
  outcomes: { name: string; count: number }[];
  teamTimeByDay: { date: string; minutes: number; hours: number }[];
  totalCalls: number;
  calls: CallRecord[];
}

export interface AnalyticsOptions {
  startDate?: string | null;
  endDate?: string | null;
  timeZone: string;
}

export async function computeAnalytics(
  options: AnalyticsOptions
): Promise<AnalyticsResult> {
  const { startDate, endDate, timeZone } = options;

  let calls = await listReportingCalls({ timeZone });

  if (startDate && endDate) {
    calls = calls.filter((call) =>
      isInstantInLocalDateRange(call.startTime, startDate, endDate, timeZone)
    );
  }

  const callsByType: Record<string, number> = {};
  const callsByUnit: Record<string, number> = {};
  const callsByHour: Record<number, number> = {};
  const durationByType: Record<string, { total: number; count: number }> = {};
  const outcomes: Record<string, number> = {};
  const teamTimeByDay: Record<string, number> = {};

  for (const call of calls) {
    if (!call.resolvedTime) continue;

    const typeLabel = call.callType.name;
    callsByType[typeLabel] = (callsByType[typeLabel] || 0) + 1;
    callsByUnit[call.unitLocation] = (callsByUnit[call.unitLocation] || 0) + 1;

    const hour = getLocalHour(call.startTime, timeZone);
    callsByHour[hour] = (callsByHour[hour] || 0) + 1;

    const duration = getCallDurationMinutes(call.startTime, call.resolvedTime);
    if (!durationByType[typeLabel]) {
      durationByType[typeLabel] = { total: 0, count: 0 };
    }
    durationByType[typeLabel].total += duration;
    durationByType[typeLabel].count += 1;

    if (call.outcome) {
      outcomes[call.outcome.name] = (outcomes[call.outcome.name] || 0) + 1;
    }

    const dayKey = getLocalDateKey(call.startTime, timeZone);
    teamTimeByDay[dayKey] = (teamTimeByDay[dayKey] || 0) + duration;
  }

  const callsByHourData = Array.from({ length: 24 }, (_, hour) => ({
    hour: getLocalHourLabel(hour),
    count: callsByHour[hour] || 0,
  }));

  const avgDurationByType = Object.entries(durationByType).map(([name, { total, count }]) => ({
    name,
    avgMinutes: count > 0 ? Math.round(total / count) : 0,
  }));

  const teamTimeByDayData = Object.entries(teamTimeByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: formatLocalDateKey(date),
      minutes,
      hours: Math.round((minutes / 60) * 10) / 10,
    }));

  return {
    callsByType: Object.entries(callsByType).map(([name, count]) => ({ name, count })),
    callsByUnit: Object.entries(callsByUnit).map(([name, count]) => ({ name, count })),
    callsByHour: callsByHourData,
    avgDurationByType,
    outcomes: Object.entries(outcomes).map(([name, count]) => ({ name, count })),
    teamTimeByDay: teamTimeByDayData,
    totalCalls: calls.length,
    calls,
  };
}

export interface DashboardExportData {
  totalCalls: number;
  rapidResponses: number;
  codeBlues: number;
  avgResponseTimeSeconds: number | null;
  avgTimeOnCallSeconds: number | null;
  outcomes: { name: string; count: number }[];
  callsByUnit: { name: string; count: number }[];
  callsByDay: { date: string; count: number }[];
  callsByHour: { hour: string; count: number }[];
}

export async function computeDashboardExportData(
  timeZone: string
): Promise<DashboardExportData> {
  const { start: todayStart, end: todayEnd } = getTodayRangeInTimezone(timeZone);
  const reportingCalls = await listReportingCalls({ timeZone });

  const todayCalls = reportingCalls.filter((call) => {
    const received = new Date(call.startTime);
    return received >= todayStart && received <= todayEnd && call.resolvedTime;
  });

  let rapidResponses = 0;
  let codeBlues = 0;
  const outcomes: Record<string, number> = {};
  const callsByUnit: Record<string, number> = {};
  const callsByDay: Record<string, number> = {};
  const callsByHour: Record<number, number> = {};
  const responseTimes: number[] = [];
  const totalCallTimes: number[] = [];

  for (const call of todayCalls) {
    if (call.callType.name === "Rapid Response") rapidResponses += 1;
    if (call.callType.name === "Code Blue") codeBlues += 1;

    if (call.outcome) {
      outcomes[call.outcome.name] = (outcomes[call.outcome.name] || 0) + 1;
    }

    callsByUnit[call.unitLocation] = (callsByUnit[call.unitLocation] || 0) + 1;

    const dayKey = formatLocalDateKey(getLocalDateKey(call.startTime, timeZone));
    callsByDay[dayKey] = (callsByDay[dayKey] || 0) + 1;

    const hour = getLocalHour(call.startTime, timeZone);
    callsByHour[hour] = (callsByHour[hour] || 0) + 1;

    if (call.responseTimeSeconds != null) responseTimes.push(call.responseTimeSeconds);
    if (call.totalCallDurationSeconds != null) {
      totalCallTimes.push(call.totalCallDurationSeconds);
    }
  }

  const avg = (values: number[]) =>
    values.length > 0
      ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
      : null;

  return {
    totalCalls: todayCalls.length,
    rapidResponses,
    codeBlues,
    avgResponseTimeSeconds: avg(responseTimes),
    avgTimeOnCallSeconds: avg(totalCallTimes),
    outcomes: Object.entries(outcomes).map(([name, count]) => ({ name, count })),
    callsByUnit: Object.entries(callsByUnit).map(([name, count]) => ({ name, count })),
    callsByDay: Object.entries(callsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    callsByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour: getLocalHourLabel(hour),
      count: callsByHour[hour] || 0,
    })),
  };
}

function avg(values: number[]): number | null {
  return values.length > 0
    ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
    : null;
}

export function computeResponseTimeStats(calls: CallRecord[]) {
  const rows = calls
    .filter((call) => call.responseTimeSeconds != null)
    .map((call) => ({
      eventId: call.id,
      callType: call.callType.name,
      unit: call.unitLocation,
      responseTimeSeconds: call.responseTimeSeconds!,
    }));

  const values = rows.map((r) => r.responseTimeSeconds);
  return {
    rows,
    averageSeconds: avg(values),
  };
}

export function computeTimeOnCallStats(calls: CallRecord[]) {
  const rows = calls
    .filter((call) => call.totalCallDurationSeconds != null)
    .map((call) => ({
      eventId: call.id,
      callType: call.callType.name,
      unit: call.unitLocation,
      totalCallDurationSeconds: call.totalCallDurationSeconds!,
    }));

  const values = rows.map((r) => r.totalCallDurationSeconds);
  return {
    rows,
    averageSeconds: avg(values),
  };
}
