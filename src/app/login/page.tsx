"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { DEMO_PASSWORD } from "@/lib/mock-auth";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("member@trace.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }

      if (data.user?.role === "TEAM_MEMBER") {
        router.push("/call/start");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
            T
          </div>
          <h1 className="text-2xl font-bold">Trace</h1>
          <p className="text-muted mt-1">Rapid Response Operations</p>
          <p className="text-xs text-muted mt-3 bg-teal-50 inline-block px-3 py-1 rounded-full">
            No PHI · Operations tracking only
          </p>
        </div>

        <div className="mb-4 rounded-2xl border-2 border-primary/30 bg-teal-50 p-4">
          <p className="text-sm font-semibold text-primary mb-2">Demo credentials</p>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-muted w-24 shrink-0">Administrator</dt>
              <dd className="font-mono">admin@trace.local</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted w-24 shrink-0">Team Member</dt>
              <dd className="font-mono">member@trace.local</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted w-24 shrink-0">Viewer</dt>
              <dd className="font-mono">viewer@trace.local</dd>
            </div>
            <div className="flex gap-2 pt-1">
              <dt className="font-medium text-muted w-24 shrink-0">Password</dt>
              <dd className="font-mono">{DEMO_PASSWORD}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted mt-3">
            Use Supabase Auth accounts with these emails. If calls fail to save, sign out and sign in again.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-50 text-danger text-sm px-4 py-3 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <label className="block">
            <span className="block text-sm font-medium mb-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border focus:border-primary transition-colors"
              placeholder="member@trace.local"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium mb-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-border focus:border-primary transition-colors"
              placeholder={DEMO_PASSWORD}
            />
          </label>

          <ActionButton type="submit" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </ActionButton>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
