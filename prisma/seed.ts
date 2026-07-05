import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CALL_TYPES = [
  "Rapid Response",
  "Code Blue",
  "Stroke Alert",
  "Sepsis Alert",
  "Airway Emergency",
  "Behavioral Emergency",
  "Trauma",
  "Other",
];

const OUTCOMES = [
  "Stabilized on unit",
  "Transferred to ICU",
  "Code Blue",
  "Cancelled page",
  "Death",
  "Other",
];

const UNITS = [
  "ICU",
  "Med-Surg 3A",
  "Med-Surg 3B",
  "Med-Surg 4A",
  "Med-Surg 4B",
  "Telemetry 5A",
  "Telemetry 5B",
  "Emergency Department",
  "Post-Anesthesia Care",
  "Labor & Delivery",
  "Pediatrics",
  "Oncology",
];

async function main() {
  for (const name of CALL_TYPES) {
    await prisma.callType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of OUTCOMES) {
    await prisma.outcome.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of UNITS) {
    await prisma.unit.upsert({
      where: { name },
      update: { active: true },
      create: { name },
    });
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "admin@trace.local", name: "Admin User", role: "ADMIN" as const },
    { email: "manager@trace.local", name: "Manager User", role: "MANAGER" as const },
    { email: "member@trace.local", name: "Team Member", role: "TEAM_MEMBER" as const },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });
  }

  const member = await prisma.user.findUnique({ where: { email: "member@trace.local" } });
  const rapidResponse = await prisma.callType.findUnique({ where: { name: "Rapid Response" } });
  const codeBlue = await prisma.callType.findUnique({ where: { name: "Code Blue" } });
  const stroke = await prisma.callType.findUnique({ where: { name: "Stroke Alert" } });
  const sepsis = await prisma.callType.findUnique({ where: { name: "Sepsis Alert" } });
  const icu = await prisma.unit.findUnique({ where: { name: "ICU" } });
  const med3a = await prisma.unit.findUnique({ where: { name: "Med-Surg 3A" } });
  const tele5a = await prisma.unit.findUnique({ where: { name: "Telemetry 5A" } });
  const ed = await prisma.unit.findUnique({ where: { name: "Emergency Department" } });
  const stabilized = await prisma.outcome.findUnique({ where: { name: "Stabilized on unit" } });
  const transferred = await prisma.outcome.findUnique({ where: { name: "Transferred to ICU" } });
  const cancelled = await prisma.outcome.findUnique({ where: { name: "Cancelled page" } });

  if (
    member &&
    rapidResponse &&
    codeBlue &&
    stroke &&
    sepsis &&
    icu &&
    med3a &&
    tele5a &&
    ed &&
    stabilized &&
    transferred &&
    cancelled
  ) {
    const existingCalls = await prisma.call.count();
    if (existingCalls === 0) {
      const now = new Date();
      const demoCalls = [
        { daysAgo: 0, hour: 8, durationMin: 22, unitId: med3a.id, typeId: rapidResponse.id, outcomeId: stabilized.id },
        { daysAgo: 0, hour: 11, durationMin: 35, unitId: tele5a.id, typeId: sepsis.id, outcomeId: transferred.id },
        { daysAgo: 0, hour: 14, durationMin: 18, unitId: icu.id, typeId: rapidResponse.id, outcomeId: stabilized.id },
        { daysAgo: 1, hour: 9, durationMin: 45, unitId: ed.id, typeId: codeBlue.id, outcomeId: transferred.id },
        { daysAgo: 1, hour: 16, durationMin: 12, unitId: med3a.id, typeId: stroke.id, outcomeId: stabilized.id },
        { daysAgo: 2, hour: 10, durationMin: 8, unitId: tele5a.id, typeId: rapidResponse.id, outcomeId: cancelled.id },
        { daysAgo: 3, hour: 7, durationMin: 28, unitId: icu.id, typeId: sepsis.id, outcomeId: stabilized.id },
        { daysAgo: 5, hour: 13, durationMin: 31, unitId: med3a.id, typeId: rapidResponse.id, outcomeId: stabilized.id },
        { daysAgo: 7, hour: 19, durationMin: 40, unitId: ed.id, typeId: codeBlue.id, outcomeId: transferred.id },
        { daysAgo: 10, hour: 6, durationMin: 15, unitId: tele5a.id, typeId: stroke.id, outcomeId: stabilized.id },
      ];

      for (const demo of demoCalls) {
        const pageReceivedAt = new Date(now);
        pageReceivedAt.setDate(pageReceivedAt.getDate() - demo.daysAgo);
        pageReceivedAt.setHours(demo.hour, 15, 0, 0);
        const endTime = new Date(pageReceivedAt.getTime() + demo.durationMin * 60000);
        const arrivedAt = new Date(pageReceivedAt.getTime() + 4 * 60000);

        await prisma.call.create({
          data: {
            userId: member.id,
            unitId: demo.unitId,
            callTypeId: demo.typeId,
            outcomeId: demo.outcomeId,
            pageReceivedAt,
            arrivedAt,
            endTime,
            status: "ENDED",
          },
        });
      }
    }
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password: password123):");
  users.forEach((u) => console.log(`  ${u.email} (${u.role})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
