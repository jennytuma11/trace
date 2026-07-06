import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewDashboard } from "@/lib/permissions";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canViewDashboard(session.role)) {
    redirect("/call/start");
  }

  return <DashboardClient user={session} />;
}
