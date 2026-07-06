import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewAnalytics } from "@/lib/permissions";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canViewAnalytics(session.role)) {
    redirect("/call/start");
  }

  return <AnalyticsClient user={session} />;
}
