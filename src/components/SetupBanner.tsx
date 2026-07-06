"use client";

import { useEffect, useState } from "react";

export function SetupBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setShow(!data.supabaseConfigured))
      .catch(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Local demo mode</p>
      <p className="mt-1 text-amber-900">
        Supabase is not configured. Call history is stored in memory and will reset on
        refresh or redeploy. Add{" "}
        <code className="rounded bg-amber-100 px-1">SUPABASE_URL</code>,{" "}
        <code className="rounded bg-amber-100 px-1">SUPABASE_ANON_KEY</code>, and{" "}
        <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>, then run{" "}
        <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> in your Supabase
        project.
      </p>
    </div>
  );
}
