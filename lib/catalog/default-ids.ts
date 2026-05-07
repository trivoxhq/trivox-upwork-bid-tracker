/**
 * Stable UUIDs for default profiles/niches — must match Prisma migration seed inserts and prisma/seed.ts.
 */
export const DEFAULT_PROFILE_IDS = {
  pkFemale: "a1111111-1111-4111-8111-111111111101",
  usFemale: "a1111111-1111-4111-8111-111111111102",
  usMale: "a1111111-1111-4111-8111-111111111103",
} as const;

export const DEFAULT_NICHE_IDS = {
  graphicDesign: "b1111111-1111-4111-8111-111111111101",
  aiImaging: "b1111111-1111-4111-8111-111111111102",
  videoCreation: "b1111111-1111-4111-8111-111111111103",
  illustration: "b1111111-1111-4111-8111-111111111104",
  threeD: "b1111111-1111-4111-8111-111111111105",
  ebookLayout: "b1111111-1111-4111-8111-111111111106",
} as const;
