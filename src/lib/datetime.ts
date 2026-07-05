import {
  differenceInMinutes,
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns";

const DEFAULT_TIMEZONE = "UTC";

type DurationStyle = "elapsed" | "response" | "compact";

type ZonedParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

export function getUserTimezone(): string {
  if (typeof window !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return DEFAULT_TIMEZONE;
}

export function resolveTimezone(timezone?: string | null): string {
  if (timezone && timezone.trim()) return timezone.trim();
  return getUserTimezone();
}

export function appendTimezoneParam(
  params: URLSearchParams,
  timezone?: string
): URLSearchParams {
  params.set("timezone", resolveTimezone(timezone));
  return params;
}

export function getTimezoneFromSearchParams(
  searchParams: URLSearchParams
): string {
  return resolveTimezone(searchParams.get("timezone"));
}

export function parseStoredTimestamp(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toStoredISOString(date: Date = new Date()): string {
  return date.toISOString();
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts: Partial<ZonedParts> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type as keyof ZonedParts] = part.value;
    }
  }

  return parts as ZonedParts;
}

function getTimezoneOffsetMs(at: Date, timeZone: string): number {
  const inTimeZone = new Date(at.toLocaleString("en-US", { timeZone }));
  const inUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return inTimeZone.getTime() - inUtc.getTime();
}

export function zonedTimeToUtc(
  dateStr: string,
  time: { hour: number; minute: number; second: number; ms: number },
  timeZone: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  let utcMs = Date.UTC(
    year,
    month - 1,
    day,
    time.hour,
    time.minute,
    time.second,
    time.ms
  );

  for (let i = 0; i < 3; i++) {
    const offset = getTimezoneOffsetMs(new Date(utcMs), timeZone);
    utcMs =
      Date.UTC(year, month - 1, day, time.hour, time.minute, time.second, time.ms) -
      offset;
  }

  return new Date(utcMs);
}

export function getLocalDayBounds(
  dateStr: string,
  timeZone: string
): { start: Date; end: Date } {
  return {
    start: zonedTimeToUtc(
      dateStr,
      { hour: 0, minute: 0, second: 0, ms: 0 },
      timeZone
    ),
    end: zonedTimeToUtc(
      dateStr,
      { hour: 23, minute: 59, second: 59, ms: 999 },
      timeZone
    ),
  };
}

export function getLocalDateKey(date: Date | string, timeZone: string): string {
  const parts = getZonedParts(parseStoredTimestamp(date), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalHour(date: Date | string, timeZone: string): number {
  const parts = getZonedParts(parseStoredTimestamp(date), timeZone);
  return parseInt(parts.hour, 10);
}

export function getLocalHourLabel(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}${ampm}`;
}

export function formatLocalDateTime(
  date: Date | string,
  timeZone?: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimezone(timeZone),
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parseStoredTimestamp(date));
}

export function formatLocalTime(
  date: Date | string,
  timeZone?: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimezone(timeZone),
    hour: "numeric",
    minute: "2-digit",
  }).format(parseStoredTimestamp(date));
}

export function formatLocalDate(
  date: Date | string,
  timeZone?: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimezone(timeZone),
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseStoredTimestamp(date));
}

export function formatLocalDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "MMM d");
}

export function formatDuration(
  totalSeconds: number,
  style: DurationStyle = "compact"
): string {
  if (style === "response") {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (style === "elapsed") {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getDurationSeconds(
  start: Date | string,
  end: Date | string
): number {
  return Math.max(
    0,
    Math.floor(
      (parseStoredTimestamp(end).getTime() -
        parseStoredTimestamp(start).getTime()) /
        1000
    )
  );
}

export function getCallDurationMinutes(
  startTime: Date | string,
  endTime: Date | string | null,
  now: Date = new Date()
): number {
  const end = endTime ?? now;
  return Math.max(
    0,
    differenceInMinutes(parseStoredTimestamp(end), parseStoredTimestamp(startTime))
  );
}

export function isInstantInLocalDateRange(
  instant: Date | string,
  startDate: string,
  endDate: string,
  timeZone: string
): boolean {
  const value = parseStoredTimestamp(instant);
  const start = getLocalDayBounds(startDate, timeZone).start;
  const end = getLocalDayBounds(endDate, timeZone).end;
  return value >= start && value <= end;
}

export function getTodayRangeInTimezone(timeZone: string) {
  const todayKey = getLocalDateKey(new Date(), timeZone);
  return getLocalDayBounds(todayKey, timeZone);
}

export function getWeekRangeInTimezone(timeZone: string) {
  const now = new Date();
  const parts = getZonedParts(now, timeZone);
  const localCalendarDate = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  );
  const weekStartKey = format(
    startOfWeek(localCalendarDate, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const weekEndKey = format(
    endOfWeek(localCalendarDate, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  return {
    start: getLocalDayBounds(weekStartKey, timeZone).start,
    end: getLocalDayBounds(weekEndKey, timeZone).end,
  };
}

export function toISODateInput(date: Date, timeZone?: string): string {
  if (timeZone) {
    return getLocalDateKey(date, timeZone);
  }
  return format(date, "yyyy-MM-dd");
}

export function toDateTimeLocalInput(date: Date, timeZone?: string): string {
  const parts = getZonedParts(date, resolveTimezone(timeZone));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Backward-compatible aliases
export const formatDateTime = formatLocalDateTime;
export const formatTime = formatLocalTime;
export const formatDate = formatLocalDate;
export const formatElapsedHMS = (seconds: number) =>
  formatDuration(seconds, "elapsed");
export const formatResponseTime = (seconds: number) =>
  formatDuration(seconds, "response");
export const formatDurationSeconds = (seconds: number) =>
  formatDuration(seconds, "compact");

export function getTodayRange() {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function getWeekRange() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function parseDateTimeLocal(value: string): Date {
  return new Date(value);
}

export function formatDurationMinutes(
  start: Date | string,
  end: Date | string
): string {
  return formatTotalMinutes(
    differenceInMinutes(parseStoredTimestamp(end), parseStoredTimestamp(start))
  );
}

export function formatTotalMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatCallTypeLabel(call: {
  callType: { name: string };
  rapidResponseCategory?: { name: string } | null;
}): string {
  if (call.rapidResponseCategory) {
    return `${call.callType.name} — ${call.rapidResponseCategory.name}`;
  }
  return call.callType.name;
}

export const CHART_COLORS = [
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#64748b",
];
