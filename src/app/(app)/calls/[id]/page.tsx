import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canViewCallHistory } from "@/lib/permissions";
import { CallDetailClient } from "./CallDetailClient";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canViewCallHistory(session.role)) {
    redirect("/");
  }

  const { id } = await params;
  return <CallDetailClient user={session} callId={id} />;
}
