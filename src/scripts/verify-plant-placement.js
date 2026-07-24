"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const SEED_PREFIX = "seed:rew-06";
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("REW-06 plant placement verify");
    const plants = await prisma.plant.findMany({
        where: { name: { startsWith: `${SEED_PREFIX}:` } },
        include: {
            currentSeat: { select: { id: true, label: true, plantId: true, locationId: true } },
            plannedLocation: { select: { id: true, name: true } },
        },
    });
    if (plants.length === 0) {
        console.warn("No seed placement plants — run npm run db:seed:plant-placement");
        process.exit(0);
    }
    const issues = [];
    for (const plant of plants) {
        const slug = plant.name.replace(`${SEED_PREFIX}:`, "");
        if (plant.placementStage === "planned" && !plant.plannedLocationId) {
            issues.push(`${slug}: planned without plannedLocationId`);
        }
        if (plant.placementStage === "ready_to_plant" && !plant.plannedLocationId) {
            issues.push(`${slug}: ready_to_plant without plannedLocationId`);
        }
        if (plant.placementStage === "seated") {
            if (!plant.currentSeatId) {
                issues.push(`${slug}: seated without currentSeatId`);
            }
            if (plant.currentSeat && plant.currentSeat.plantId !== plant.id) {
                issues.push(`${slug}: seat.plantId mismatch`);
            }
        }
    }
    const occupiedSeats = await prisma.seat.findMany({
        where: { plantId: { not: null } },
        select: { id: true, label: true, plantId: true, location: { select: { name: true } } },
    });
    const plantIdsOnSeats = occupiedSeats.map((s) => s.plantId).filter(Boolean);
    const uniqueSeatPlants = new Set(plantIdsOnSeats);
    if (uniqueSeatPlants.size !== plantIdsOnSeats.length) {
        issues.push("duplicate plantId on multiple seats");
    }
    for (const seat of occupiedSeats) {
        const plant = await prisma.plant.findUnique({
            where: { id: seat.plantId },
            select: { currentSeatId: true, placementStage: true },
        });
        if (!plant || plant.currentSeatId !== seat.id || plant.placementStage !== "seated") {
            issues.push(`seat ${seat.label}@${seat.location.name}: plant invariant broken`);
        }
    }
    console.log(`Seed plants: ${plants.length}`);
    for (const plant of plants) {
        console.log(`  - ${plant.name}: ${plant.placementStage}` +
            (plant.currentSeat ? ` · ${plant.currentSeat.label}` : ""));
    }
    console.log(`Occupied seats: ${occupiedSeats.length}`);
    if (issues.length > 0) {
        console.error("Issues:", issues);
        process.exit(1);
    }
    console.log("Plant placement invariants OK.");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=verify-plant-placement.js.map