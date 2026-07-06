function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrlOptional() && getSupabaseAnonKeyOptional() && getSupabaseServiceRoleKeyOptional());
}

function getSupabaseUrlOptional(): string | undefined {
  return readEnv(
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "supabase_url",
    "next_public_supabase_url"
  );
}

function getSupabaseAnonKeyOptional(): string | undefined {
  return readEnv(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "supabase_anon_key",
    "supabase_publishable_key",
    "next_public_supabase_anon_key"
  );
}

function getSupabaseServiceRoleKeyOptional(): string | undefined {
  return readEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "supabase_service_role_key"
  );
}

export function getSupabaseUrl(): string {
  const url = getSupabaseUrlOptional();
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = getSupabaseAnonKeyOptional();
  if (!key) throw new Error("SUPABASE_ANON_KEY is not configured");
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = getSupabaseServiceRoleKeyOptional();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return key;
}
