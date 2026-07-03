import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.locationGroup.count();
  const members = await prisma.locationGroupMember.count();

  console.log("REW-04 LocationGroup verify");
  console.log(`LocationGroup rows: ${groups}`);
  console.log(`LocationGroupMember rows: ${members}`);

  if (groups === 0) {
    console.warn("No LocationGroup rows — run seed or create via API");
    process.exit(0);
  }

  const sample = await prisma.locationGroup.findFirst({
    include: {
      members: {
        include: { location: { select: { id: true, name: true } } },
      },
    },
  });

  if (!sample) {
    console.error("Failed to load sample LocationGroup");
    process.exit(1);
  }

  console.log(`Sample group: ${sample.name} (${sample.members.length} location(s))`);
  for (const member of sample.members) {
    console.log(`  - ${member.location.name}`);
  }

  console.log("LocationGroup schema checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
