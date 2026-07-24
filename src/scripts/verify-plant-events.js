"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const SEED_PLANT_PREFIX = "seed:rew-06:";
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("REW-07 plant events verify");
    const plants = await prisma.plant.findMany({
        where: { name: { startsWith: SEED_PLANT_PREFIX } },
        select: { id: true, name: true },
    });
    if (plants.length === 0) {
        console.warn("No seed placement plants — run npm run db:seed:plant-placement");
        process.exit(0);
    }
    let totalEvents = 0;
    for (const plant of plants) {
        const count = await prisma.event.count({
            where: { targetType: "Plant", targetId: plant.id },
        });
        totalEvents += count;
        console.log(`  ${plant.name}: ${count} event(s)`);
    }
    const placementEvents = await prisma.event.count({
        where: {
            targetType: "Plant",
            actionPath: { startsWith: "plant.placement." },
        },
    });
    console.log(`Total events on seed plants: ${totalEvents}`);
    console.log(`Placement events (all plants): ${placementEvents}`);
    if (placementEvents === 0) {
        console.warn("No placement events yet — run placement mutations or backfill");
    }
    console.log("Plant events schema checks passed.");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=verify-plant-events.js.map