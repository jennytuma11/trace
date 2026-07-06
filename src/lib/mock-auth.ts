import { TraceRole } from "@/lib/types";

export const DEMO_PASSWORD = "password123";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: TraceRole;
  password: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "mock-admin",
    email: "admin@trace.local",
    name: "Admin User",
    role: "ADMINISTRATOR",
    password: DEMO_PASSWORD,
  },
  {
    id: "mock-member",
    email: "member@trace.local",
    name: "Team Member",
    role: "TEAM_MEMBER",
    password: DEMO_PASSWORD,
  },
  {
    id: "mock-viewer",
    email: "viewer@trace.local",
    name: "Viewer User",
    role: "VIEWER",
    password: DEMO_PASSWORD,
  },
];

export function authenticateMockUser(
  email: string,
  password: string
): Omit<MockUser, "password"> | null {
  const normalizedEmail = email.toLowerCase().trim();
  const user = MOCK_USERS.find((u) => u.email === normalizedEmail);

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
