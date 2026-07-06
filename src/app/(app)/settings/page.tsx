import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canConfigureSettings } from "@/lib/permissions";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canConfigureSettings(session.role)) {
    redirect("/");
  }

  return <SettingsClient user={session} />;
}
