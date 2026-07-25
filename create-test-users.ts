/**
 * Legacy helper — identity now lives in auth-service (ADR-0023).
 * Prefer: `cd services/auth && npm run db:seed`
 */
import { PrismaClient } from "@prisma/client";
import { GROW_SEED_ACCOUNT_IDS } from "./src/modules/users/grow-seed-accounts";

const prisma = new PrismaClient();

async function main() {
  for (const id of Object.values(GROW_SEED_ACCOUNT_IDS)) {
    await prisma.user.upsert({
      where: { id },
      create: { id },
      update: {},
    });
  }
  console.log("Ensured grow account stubs:", GROW_SEED_ACCOUNT_IDS);
  console.log("Identity seed: cd services/auth && npm run db:seed");
  console.log("👤 user@growingapp.com / user123");
  console.log("👑 admin@growingapp.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
