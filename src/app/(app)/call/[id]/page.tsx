import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ActiveCallClient } from "./ActiveCallClient";

export default async function ActiveCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <ActiveCallClient user={session} callId={id} />;
}
