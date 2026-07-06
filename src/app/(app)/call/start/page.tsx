import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canStartCall } from "@/lib/permissions";
import { StartCallClient } from "./StartCallClient";

export default async function StartCallPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canStartCall(session.role)) {
    redirect("/");
  }

  return <StartCallClient user={session} />;
}
