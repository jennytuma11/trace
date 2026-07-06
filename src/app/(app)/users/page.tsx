import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canManageUsers(session.role)) {
    redirect("/");
  }

  return <UsersClient user={session} />;
}
