import type { PrismaClient } from "@prisma/client";
import { GROW_SEED_ACCOUNT_IDS } from "../modules/users/grow-seed-accounts";

export async function resolveGrowSeedUser(
  prisma: PrismaClient,
  caller: string,
): Promise<{ id: string }> {
  const preferred = await prisma.user.findUnique({
    where: { id: GROW_SEED_ACCOUNT_IDS.user },
    select: { id: true },
  });
  if (preferred) {
    return preferred;
  }

  throw new Error(
    `${caller}: grow account ${GROW_SEED_ACCOUNT_IDS.user} missing. ` +
      `Run backend_nest prisma seed and/or: node scripts/align-platform-seed-ids.mjs`,
  );
}
