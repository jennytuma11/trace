import { TraceRole } from "@/lib/types";

export function canViewDashboard(role: TraceRole) {
  return role === "ADMINISTRATOR" || role === "VIEWER";
}

export function canViewAnalytics(role: TraceRole) {
  return role === "ADMINISTRATOR" || role === "VIEWER";
}

export function canViewReports(role: TraceRole) {
  return role === "ADMINISTRATOR" || role === "VIEWER";
}

export function canViewCallHistory(role: TraceRole) {
  void role;
  return true;
}

export function canStartCall(role: TraceRole) {
  return role === "ADMINISTRATOR" || role === "TEAM_MEMBER";
}

export function canResolveCall(role: TraceRole) {
  return role === "ADMINISTRATOR" || role === "TEAM_MEMBER";
}

export function canExcludeFromReporting(role: TraceRole) {
  return role === "ADMINISTRATOR";
}

export function canManageUsers(role: TraceRole) {
  return role === "ADMINISTRATOR";
}

export function canConfigureSettings(role: TraceRole) {
  return role === "ADMINISTRATOR";
}

export function canExportData(role: TraceRole) {
  return role === "ADMINISTRATOR";
}

export function formatRoleLabel(role: TraceRole): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "Administrator";
    case "TEAM_MEMBER":
      return "Team Member";
    case "VIEWER":
      return "Viewer";
  }
}
