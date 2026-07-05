import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StartCallClient } from "./StartCallClient";

export default async function StartCallPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <StartCallClient user={session} />;
}
