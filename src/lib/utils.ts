import {
  differenceInMinutes,
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatDurationMinutes(start: Date | string, end: Date | string): string {
  return formatTotalMinutes(differenceInMinutes(new Date(end), new Date(start)));
}

export function formatTotalMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDurationSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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

export function toISODateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function toDateTimeLocalInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function parseDateTimeLocal(value: string): Date {
  return new Date(value);
}

export function getCallDurationMinutes(
  pageReceivedAt: Date,
  endTime: Date | null,
  now: Date = new Date()
): number {
  const end = endTime ?? now;
  return Math.max(0, differenceInMinutes(end, pageReceivedAt));
}

export function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
