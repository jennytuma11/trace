import { TraceRole } from "@/lib/types";

export const DEMO_PASSWORD = "password123";

/** Fixed UUIDs for local-only demo mode when Supabase is not configured. */
export const LOCAL_DEMO_USER_IDS = {
  admin: "b0000000-0000-4000-8000-000000000001",
  member: "b0000000-0000-4000-8000-000000000002",
  viewer: "b0000000-0000-4000-8000-000000000003",
} as const;

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: TraceRole;
  password: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: LOCAL_DEMO_USER_IDS.admin,
    email: "admin@trace.local",
    name: "Admin User",
    role: "ADMINISTRATOR",
    password: DEMO_PASSWORD,
  },
  {
    id: LOCAL_DEMO_USER_IDS.member,
    email: "member@trace.local",
    name: "Team Member",
    role: "TEAM_MEMBER",
    password: DEMO_PASSWORD,
  },
  {
    id: LOCAL_DEMO_USER_IDS.viewer,
    email: "viewer@trace.local",
    name: "Viewer User",
    role: "VIEWER",
    password: DEMO_PASSWORD,
  },
];

/** @deprecated Use DEMO_USERS */
export const MOCK_USERS = DEMO_USERS;

export function inferDemoRoleFromEmail(email: string): TraceRole {
  const normalized = email.toLowerCase().trim();
  if (normalized === "admin@trace.local") return "ADMINISTRATOR";
  if (normalized === "viewer@trace.local") return "VIEWER";
  return "TEAM_MEMBER";
}

export function authenticateMockUser(
  email: string,
  password: string
): Omit<DemoUser, "password"> | null {
  const normalizedEmail = email.toLowerCase().trim();
  const user = DEMO_USERS.find((u) => u.email === normalizedEmail);

  if (!user || user.password !== password) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
