import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewReports } from "@/lib/permissions";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canViewReports(session.role)) {
    redirect("/call/start");
  }

  return <ReportsClient user={session} />;
}
