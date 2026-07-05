import { Role } from "@prisma/client";

export const DEMO_PASSWORD = "password123";

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "mock-admin",
    email: "admin@trace.local",
    name: "Admin User",
    role: "ADMIN",
    password: DEMO_PASSWORD,
  },
  {
    id: "mock-manager",
    email: "manager@trace.local",
    name: "Manager User",
    role: "MANAGER",
    password: DEMO_PASSWORD,
  },
  {
    id: "mock-member",
    email: "member@trace.local",
    name: "Team Member",
    role: "TEAM_MEMBER",
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
