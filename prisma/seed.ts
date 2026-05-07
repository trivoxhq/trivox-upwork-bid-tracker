import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_NICHE_IDS, DEFAULT_PROFILE_IDS } from "../lib/catalog/default-ids";

const prisma = new PrismaClient();

const DEFAULT_PROFILES = [
  { id: DEFAULT_PROFILE_IDS.pkFemale, name: "PK Female" },
  { id: DEFAULT_PROFILE_IDS.usFemale, name: "US Female" },
  { id: DEFAULT_PROFILE_IDS.usMale, name: "US Male" },
] as const;

const DEFAULT_NICHES = [
  { id: DEFAULT_NICHE_IDS.graphicDesign, name: "Graphic Design" },
  { id: DEFAULT_NICHE_IDS.aiImaging, name: "AI Imaging" },
  { id: DEFAULT_NICHE_IDS.videoCreation, name: "Video Creation" },
  { id: DEFAULT_NICHE_IDS.illustration, name: "Illustration" },
  { id: DEFAULT_NICHE_IDS.threeD, name: "3D" },
  { id: DEFAULT_NICHE_IDS.ebookLayout, name: "Ebook / Layout" },
] as const;

/**
 * Initial rollout passwords — rotate immediately via Users admin (“Password”).
 * Members share dev credential below unless overridden after migration.
 */
const ADMIN_BOOT_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const MEMBER_BOOT_PASSWORD =
  process.env.SEED_MEMBER_PASSWORD ?? "TrivoxBidTracker2026!";

async function main() {
  const adminPasswordHash = bcrypt.hashSync(ADMIN_BOOT_PASSWORD, 12);
  const memberPasswordHash = bcrypt.hashSync(MEMBER_BOOT_PASSWORD, 12);

  for (const p of DEFAULT_PROFILES) {
    await prisma.profile.upsert({
      where: { id: p.id },
      update: { name: p.name, isActive: true },
      create: { id: p.id, name: p.name },
    });
  }
  for (const n of DEFAULT_NICHES) {
    await prisma.niche.upsert({
      where: { id: n.id },
      update: { name: n.name, isActive: true },
      create: { id: n.id, name: n.name },
    });
  }

  await prisma.user.upsert({
    where: { email: "js@trivoxhq.com" },
    update: {
      name: "JS",
      role: "admin",
      password: adminPasswordHash,
      isActive: true,
      dailyTarget: 0,
      monthlyTarget: 0,
    },
    create: {
      email: "js@trivoxhq.com",
      name: "JS",
      role: "admin",
      password: adminPasswordHash,
      dailyTarget: 0,
      monthlyTarget: 0,
      isActive: true,
    },
  });

  const salesTeam = [
    {
      email: "syedmahad@trivoxhq.com",
      name: "Mahad",
      dailyTarget: 500,
      monthlyTarget: 10000,
    },
    {
      email: "moosa@trivoxhq.com",
      name: "Moosa",
      dailyTarget: 500,
      monthlyTarget: 10000,
    },
    {
      email: "essa@trivoxhq.com",
      name: "Essa",
      dailyTarget: 500,
      monthlyTarget: 10000,
    },
    {
      email: "haris@trivoxhq.com",
      name: "Haris",
      dailyTarget: 500,
      monthlyTarget: 10000,
    },
  ] as const;

  for (const m of salesTeam) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {
        name: m.name,
        role: "member",
        password: memberPasswordHash,
        dailyTarget: m.dailyTarget,
        monthlyTarget: m.monthlyTarget,
        isActive: true,
      },
      create: {
        email: m.email,
        name: m.name,
        role: "member",
        password: memberPasswordHash,
        dailyTarget: m.dailyTarget,
        monthlyTarget: m.monthlyTarget,
        isActive: true,
      },
    });
  }

  console.log(
    `[seed] Admin: js@trivoxhq.com (${ADMIN_BOOT_PASSWORD === "admin123" ? 'password "admin123"' : "password from SEED_ADMIN_PASSWORD"}). Members: syedmahad / moosa / essa / haris @trivoxhq.com — ${MEMBER_BOOT_PASSWORD === "TrivoxBidTracker2026!" ? 'password "TrivoxBidTracker2026!"' : "password from SEED_MEMBER_PASSWORD"}.`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
