import * as XLSX from "xlsx";
import { listCalls } from "@/lib/calls/repository";
import { CallRecord } from "@/lib/calls/types";
import {
  computeAnalytics,
  computeDashboardExportData,
  computeResponseTimeStats,
  computeTimeOnCallStats,
} from "@/lib/analytics/compute";
import {
  formatDuration,
  formatLocalDate,
  formatLocalTime,
  getLocalDateKey,
  getTimezoneFromSearchParams,
} from "@/lib/datetime";
import { formatReportingUnitDisplay } from "@/lib/units/types";

export type ExcelExportType = "dashboard" | "history" | "analytics" | "reports";

export interface ExcelExportOptions {
  type: ExcelExportType;
  timeZone: string;
  startDate?: string | null;
  endDate?: string | null;
  callTypeId?: string | null;
  outcomeId?: string | null;
  userId?: string | null;
  search?: string | null;
}

export interface ExcelExportResult {
  buffer: Buffer;
  filename: string;
}

function buildFilename(prefix: string, timeZone: string): string {
  const dateKey = getLocalDateKey(new Date(), timeZone);
  return `TRACE_${prefix}_${dateKey}.xlsx`;
}

function rowsToSheet(rows: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

function tableSheet(
  title: string,
  headers: string[],
  rows: (string | number)[][]
): XLSX.WorkSheet {
  return rowsToSheet([[title], [], headers, ...rows]);
}

function workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function formatResponseTime(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  return formatDuration(seconds, "response");
}

function formatTotalCallTime(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  return formatDuration(seconds, "elapsed");
}

function historyRow(call: CallRecord, timeZone: string): (string | number)[] {
  return [
    call.id,
    formatLocalDate(call.startTime, timeZone),
    formatLocalTime(call.startTime, timeZone),
    call.callType.name,
    call.rapidResponseCategory?.name ?? "",
    call.unitLocation,
    formatReportingUnitDisplay(call.reportingUnit, call.mappingStatus),
    call.mappingStatus,
    formatResponseTime(call.responseTimeSeconds),
    formatTotalCallTime(call.totalCallDurationSeconds),
    call.outcome?.name ?? "",
    call.resolutionNotes ?? "",
    call.user.name,
  ];
}

const HISTORY_HEADERS = [
  "Event ID",
  "Date",
  "Start Time",
  "Call Type",
  "Rapid Response Category",
  "Entered Location",
  "Reporting Unit",
  "Mapping Status",
  "Response Time",
  "Total Call Time",
  "Outcome",
  "Resolution Notes",
  "Created By",
];

async function fetchHistoryCalls(options: ExcelExportOptions): Promise<CallRecord[]> {
  return listCalls({
    startDate: options.startDate,
    endDate: options.endDate,
    callTypeId: options.callTypeId,
    outcomeId: options.outcomeId,
    userId: options.userId,
    search: options.search,
    timeZone: options.timeZone,
    reportingOnly: true,
    includeExcluded: false,
  });
}

function buildDashboardWorkbook(data: Awaited<ReturnType<typeof computeDashboardExportData>>) {
  const summaryRows: (string | number)[][] = [
    ["Total Calls", data.totalCalls],
    ["Rapid Responses", data.rapidResponses],
    ["Code Blues", data.codeBlues],
    [
      "Average Response Time",
      data.avgResponseTimeSeconds != null
        ? formatResponseTime(data.avgResponseTimeSeconds)
        : "—",
    ],
    [
      "Average Time on Call",
      data.avgTimeOnCallSeconds != null
        ? formatTotalCallTime(data.avgTimeOnCallSeconds)
        : "—",
    ],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Dashboard Summary", ["Metric", "Value"], summaryRows),
    "Dashboard Summary"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Outcomes Summary", ["Outcome", "Count"], data.outcomes.map((o) => [o.name, o.count])),
    "Outcomes Summary"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Calls by Unit", ["Reporting Unit", "Count"], data.callsByUnit.map((u) => [u.name, u.count])),
    "Calls by Unit"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Calls by Day", ["Date", "Count"], data.callsByDay.map((d) => [d.date, d.count])),
    "Calls by Day"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Calls by Hour", ["Hour", "Count"], data.callsByHour.map((h) => [h.hour, h.count])),
    "Calls by Hour"
  );

  return workbook;
}

function buildHistoryWorkbook(calls: CallRecord[], timeZone: string) {
  const workbook = XLSX.utils.book_new();
  const rows = calls.map((call) => historyRow(call, timeZone));
  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet([HISTORY_HEADERS, ...rows]),
    "Call History"
  );
  return workbook;
}

function buildAnalyticsWorkbook(
  analytics: Awaited<ReturnType<typeof computeAnalytics>>,
  historyCalls: CallRecord[],
  timeZone: string
) {
  const responseStats = computeResponseTimeStats(analytics.calls);
  const timeOnCallStats = computeTimeOnCallStats(analytics.calls);

  const summaryRows: (string | number)[][] = [
    ["Total Calls", analytics.totalCalls],
    [
      "Average Response Time",
      responseStats.averageSeconds != null
        ? formatResponseTime(responseStats.averageSeconds)
        : "—",
    ],
    [
      "Average Time on Call",
      timeOnCallStats.averageSeconds != null
        ? formatTotalCallTime(timeOnCallStats.averageSeconds)
        : "—",
    ],
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Dashboard Summary", ["Metric", "Value"], summaryRows),
    "Dashboard Summary"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet([HISTORY_HEADERS, ...historyCalls.map((call) => historyRow(call, timeZone))]),
    "Call History"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet(
      "Response Time",
      ["Event ID", "Call Type", "Reporting Unit", "Response Time"],
      responseStats.rows.map((row) => [
        row.eventId,
        row.callType,
        row.unit,
        formatResponseTime(row.responseTimeSeconds),
      ])
    ),
    "Response Time"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet(
      "Time on Call",
      ["Event ID", "Call Type", "Reporting Unit", "Total Call Time"],
      timeOnCallStats.rows.map((row) => [
        row.eventId,
        row.callType,
        row.unit,
        formatTotalCallTime(row.totalCallDurationSeconds),
      ])
    ),
    "Time on Call"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Outcomes", ["Outcome", "Count"], analytics.outcomes.map((o) => [o.name, o.count])),
    "Outcomes"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet("Units", ["Reporting Unit", "Count"], analytics.callsByUnit.map((u) => [u.name, u.count])),
    "Units"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    tableSheet(
      "Call Volume",
      ["Call Type", "Count"],
      analytics.callsByType.map((t) => [t.name, t.count])
    ),
    "Call Volume"
  );

  return workbook;
}

function buildReportsWorkbook(
  analytics: Awaited<ReturnType<typeof computeAnalytics>>,
  historyCalls: CallRecord[],
  timeZone: string
) {
  return buildAnalyticsWorkbook(analytics, historyCalls, timeZone);
}

export async function generateExcelExport(
  options: ExcelExportOptions
): Promise<ExcelExportResult> {
  const { type, timeZone } = options;

  switch (type) {
    case "dashboard": {
      const data = await computeDashboardExportData(timeZone);
      const buffer = workbookToBuffer(buildDashboardWorkbook(data));
      return { buffer, filename: buildFilename("Dashboard", timeZone) };
    }
    case "history": {
      const calls = await fetchHistoryCalls(options);
      const buffer = workbookToBuffer(buildHistoryWorkbook(calls, timeZone));
      return { buffer, filename: buildFilename("Call_History", timeZone) };
    }
    case "analytics": {
      const analytics = await computeAnalytics({
        startDate: options.startDate,
        endDate: options.endDate,
        timeZone,
      });
      const historyCalls = await fetchHistoryCalls(options);
      const buffer = workbookToBuffer(
        buildAnalyticsWorkbook(analytics, historyCalls, timeZone)
      );
      return { buffer, filename: buildFilename("Analytics", timeZone) };
    }
    case "reports": {
      const analytics = await computeAnalytics({
        startDate: options.startDate,
        endDate: options.endDate,
        timeZone,
      });
      const historyCalls = await fetchHistoryCalls(options);
      const buffer = workbookToBuffer(
        buildReportsWorkbook(analytics, historyCalls, timeZone)
      );
      return { buffer, filename: buildFilename("Reports", timeZone) };
    }
    default:
      throw new Error(`Unsupported export type: ${String(type)}`);
  }
}

export function parseExportOptions(searchParams: URLSearchParams): ExcelExportOptions {
  const type = searchParams.get("type") as ExcelExportType | null;
  if (!type || !["dashboard", "history", "analytics", "reports"].includes(type)) {
    throw new Error("Invalid export type.");
  }

  return {
    type,
    timeZone: getTimezoneFromSearchParams(searchParams),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    callTypeId: searchParams.get("callTypeId"),
    outcomeId: searchParams.get("outcomeId"),
    userId: searchParams.get("userId"),
    search: searchParams.get("search"),
  };
}
