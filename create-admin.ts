/**
 * Legacy helper — identity now lives in auth-service (ADR-0023).
 * Prefer: `cd services/auth && npm run db:seed`
 * Grow account stubs: `npm run db:seed` in backend_nest.
 */
import { PrismaClient } from "@prisma/client";
import { GROW_SEED_ACCOUNT_IDS } from "./src/modules/users/grow-seed-accounts";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: GROW_SEED_ACCOUNT_IDS.admin },
    create: { id: GROW_SEED_ACCOUNT_IDS.admin },
    update: {},
  });
  console.log(
    "Ensured grow account stub:",
    GROW_SEED_ACCOUNT_IDS.admin,
    "(credentials: services/auth npm run db:seed → admin@growingapp.com / admin123)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
