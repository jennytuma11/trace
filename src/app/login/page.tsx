"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
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
        setError(data.error || "Login failed");
        return;
      }

      const from = searchParams.get("from") || "/";
      router.push(from);
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
              placeholder="you@hospital.org"
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
            />
          </label>

          <ActionButton type="submit" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </ActionButton>
        </form>

        <div className="mt-6 text-center text-xs text-muted space-y-1">
          <p>Demo accounts (password: <code className="bg-white px-1 rounded">password123</code>)</p>
          <p>admin@trace.local · manager@trace.local · member@trace.local</p>
        </div>
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
