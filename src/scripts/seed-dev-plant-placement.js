"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDevPlantPlacement = seedDevPlantPlacement;
const SEED_PREFIX = "seed:rew-06";
const GROWBOX_NAME = "DEV — Гроубокс 120";
const SEAT_LABEL = "A1";
const PLACEMENT_FIXTURES = [
    { slug: "planned", stage: "planned", locationName: GROWBOX_NAME },
    { slug: "queued", stage: "ready_to_plant", locationName: GROWBOX_NAME },
    { slug: "seated", stage: "seated", locationName: GROWBOX_NAME, seatLabel: SEAT_LABEL },
];
async function upsertPlacementPlant(prisma, userId, fixture, locationId, seatId) {
    const name = `${SEED_PREFIX}:${fixture.slug}`;
    const existing = await prisma.plant.findFirst({
        where: { userId, name },
        select: { id: true },
    });
    const baseData = {
        placementStage: fixture.stage,
        plannedLocationId: fixture.stage === "planned" || fixture.stage === "ready_to_plant" ? locationId : null,
        locationId: fixture.stage === "seated" ? locationId : locationId,
        currentSeatId: fixture.stage === "seated" ? (seatId ?? null) : null,
    };
    if (existing) {
        await prisma.seat.updateMany({
            where: { plantId: existing.id },
            data: { plantId: null },
        });
        const plant = await prisma.plant.update({
            where: { id: existing.id },
            data: baseData,
        });
        if (fixture.stage === "seated" && seatId) {
            await prisma.seat.update({
                where: { id: seatId },
                data: { plantId: plant.id },
            });
        }
        return { slug: fixture.slug, id: plant.id, stage: plant.placementStage, created: false };
    }
    const plant = await prisma.plant.create({
        data: {
            userId,
            name,
            ...baseData,
        },
    });
    if (fixture.stage === "seated" && seatId) {
        await prisma.seat.update({
            where: { id: seatId },
            data: { plantId: plant.id },
        });
    }
    return { slug: fixture.slug, id: plant.id, stage: plant.placementStage, created: true };
}
async function seedDevPlantPlacement(prisma) {
    const user = await prisma.user.findUnique({
        where: { email: "user@growingapp.com" },
        select: { id: true },
    });
    if (!user) {
        throw new Error("seedDevPlantPlacement: user@growingapp.com not found — run user seed first");
    }
    const growbox = await prisma.location.findFirst({
        where: { userId: user.id, name: GROWBOX_NAME },
        select: { id: true },
    });
    if (!growbox) {
        throw new Error(`seedDevPlantPlacement: location "${GROWBOX_NAME}" not found — run db:seed:locations`);
    }
    const seat = await prisma.seat.findFirst({
        where: { locationId: growbox.id, label: SEAT_LABEL, status: "active" },
        select: { id: true, plantId: true },
    });
    if (!seat) {
        throw new Error(`seedDevPlantPlacement: seat ${SEAT_LABEL} not found on growbox`);
    }
    const results = [];
    for (const fixture of PLACEMENT_FIXTURES) {
        const seatId = fixture.stage === "seated" ? seat.id : undefined;
        results.push(await upsertPlacementPlant(prisma, user.id, fixture, growbox.id, seatId));
    }
    await prisma.location.update({
        where: { id: growbox.id },
        data: {
            occupiedCount: await prisma.plant.count({
                where: {
                    userId: user.id,
                    placementStage: "seated",
                    OR: [{ locationId: growbox.id }, { currentSeat: { locationId: growbox.id } }],
                },
            }),
        },
    });
    return {
        locationId: growbox.id,
        seatId: seat.id,
        plants: results,
    };
}
//# sourceMappingURL=seed-dev-plant-placement.js.map