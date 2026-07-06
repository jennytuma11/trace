import { getSession } from "@/lib/auth";
import { SessionUser } from "@/lib/types";
import {
  AUTH_ERROR_INVALID_SESSION,
  AUTH_ERROR_NOT_AUTHENTICATED,
  isValidSessionUser,
} from "@/lib/auth/session-user";

export type SessionResult =
  | { ok: true; session: SessionUser }
  | { ok: false; error: string; status: number };

export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();

  if (!session) {
    return { ok: false, error: AUTH_ERROR_NOT_AUTHENTICATED, status: 401 };
  }

  if (!isValidSessionUser(session)) {
    return { ok: false, error: AUTH_ERROR_INVALID_SESSION, status: 401 };
  }

  return { ok: true, session };
}
