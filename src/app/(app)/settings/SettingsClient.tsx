"use client";

import { AppShell } from "@/components/AppShell";
import { SetupBanner } from "@/components/SetupBanner";
import { SessionUser } from "@/lib/types";
import { useEffect, useState } from "react";

export function SettingsClient({ user }: { user: SessionUser }) {
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setSupabaseConfigured(data.supabaseConfigured))
      .catch(() => setSupabaseConfigured(false));
  }, []);

  return (
    <AppShell user={user}>
      <div className="space-y-6 max-w-2xl">
        <SetupBanner />

        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted text-sm mt-1">System configuration</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold">Database</h3>
            <p className="text-sm text-muted mt-1">
              Status:{" "}
              {supabaseConfigured === null
                ? "Checking…"
                : supabaseConfigured
                  ? "Supabase connected"
                  : "Local demo mode (in-memory fallback)"}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="text-sm space-y-2 text-muted">
              <p>To enable persistent call history:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Supabase project</li>
                <li>Run <code className="bg-background px-1 rounded">supabase/schema.sql</code> in the SQL Editor</li>
                <li>Create auth users for admin, member, and viewer demo accounts</li>
                <li>Set environment variables in Vercel or <code className="bg-background px-1 rounded">.env.local</code></li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
