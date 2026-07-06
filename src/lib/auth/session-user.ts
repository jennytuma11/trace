import { SessionUser } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  AUTH_ERROR_INVALID_SESSION,
  AUTH_ERROR_NOT_AUTHENTICATED,
  isLegacyMockUserId,
  isUuid,
} from "@/lib/auth/uuid";

export function isValidSessionUser(session: SessionUser | null): session is SessionUser {
  if (!session?.id) return false;

  if (isSupabaseConfigured()) {
    return isUuid(session.id) && !isLegacyMockUserId(session.id);
  }

  return true;
}

export { AUTH_ERROR_INVALID_SESSION, AUTH_ERROR_NOT_AUTHENTICATED };
