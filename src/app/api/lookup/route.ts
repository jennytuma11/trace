import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [units, callTypes, outcomes, users] = await Promise.all([
    prisma.unit.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.callType.findMany({ orderBy: { name: "asc" } }),
    prisma.outcome.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ units, callTypes, outcomes, users });
}
