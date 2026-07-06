"use client";

import { AppShell } from "@/components/AppShell";
import { SetupBanner } from "@/components/SetupBanner";
import { SessionUser } from "@/lib/types";
import { formatRoleLabel } from "@/lib/permissions";
import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
}

export function UsersClient({ user }: { user: SessionUser }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setSource(data.source || "");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <SetupBanner />

        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted text-sm mt-1">
            Manage team access and roles
            {source === "mock" && " (demo users — configure Supabase for persistent profiles)"}
          </p>
        </div>

        {loading ? (
          <div className="h-48 rounded-2xl bg-white border border-border animate-pulse" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.email}</td>
                    <td className="px-4 py-3">{row.roleLabel || formatRoleLabel(row.role as SessionUser["role"])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
