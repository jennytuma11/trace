"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@prisma/client";

interface AppShellProps {
  children: React.ReactNode;
  user: { name: string; role: Role };
}

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/call/start", label: "Start Call", icon: "🚨" },
  { href: "/calls", label: "Call History", icon: "📋" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
              T
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg leading-tight text-foreground">Trace</h1>
              <p className="text-xs text-muted truncate">Rapid Response Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted capitalize">{user.role.replace("_", " ").toLowerCase()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg border border-border hover:bg-background transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2.5 px-1 text-xs font-medium transition-colors ${
                  active
                    ? "text-primary bg-teal-50"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span className="text-lg leading-none mb-1" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
