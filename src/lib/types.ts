export type TraceRole = "ADMINISTRATOR" | "TEAM_MEMBER" | "VIEWER";

export type CallStatus = "ACTIVE" | "RESOLVED" | "EXCLUDED";

export type EventType = "Operational" | "Practice" | "Training" | "Test";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: TraceRole;
}

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  role: TraceRole;
  created_at: string;
  updated_at: string;
}
