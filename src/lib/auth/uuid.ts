const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LEGACY_MOCK_USER_IDS = new Set([
  "mock-admin",
  "mock-member",
  "mock-viewer",
]);

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isLegacyMockUserId(value: string): boolean {
  return LEGACY_MOCK_USER_IDS.has(value) || value.startsWith("mock-");
}

export const AUTH_ERROR_INVALID_SESSION =
  "Your session is invalid. Please sign out and sign in again with your Supabase account.";

export const AUTH_ERROR_NOT_AUTHENTICATED = "Authentication required. Please sign in.";
