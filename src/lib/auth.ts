import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isValidSessionUser } from "@/lib/auth/session-user";
import { SessionUser, TraceRole } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type { SessionUser };

const COOKIE_NAME = "trace_session";

const MOCK_JWT_SECRET = "trace-mock-session-secret";

function getSecret() {
  return new TextEncoder().encode(MOCK_JWT_SECRET);
}

export async function createSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as unknown as SessionUser;
    if (isSupabaseConfigured() && !isValidSessionUser(session)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function hasRole(user: SessionUser, roles: TraceRole[]): boolean {
  return roles.includes(user.role);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
