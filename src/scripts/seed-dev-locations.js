"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDevLocations = seedDevLocations;
const contracts_1 = require("@growing/contracts");
const taxonomy_prisma_for_migration_1 = require("./taxonomy-prisma-for-migration");
const SEED_PREFIX = "seed:bk-rew-01-6";
const DEV_LOCATION_FIXTURES = [
    {
        slug: "growbox-fixed-grid",
        name: "DEV — Гроубокс 120",
        environmentVariantKey: "environment.type.indoor.growbox",
        seatLayoutMode: "fixed_grid",
        dimensions: { width: 120, depth: 60, height: 180, unit: "cm" },
        layoutMeta: { gridCols: 4, gridRows: 1, cellWidthCm: 25, cellDepthCm: 25 },
        wateringType: "manual",
        occupiedCount: 0,
        specBlocks: [
            {
                position: 0,
                kind: "space",
                space: { width: 120, height: 180, depth: 60 },
            },
        ],
        seats: [
            { label: "A1", position: { row: 0, col: 0 } },
            { label: "A2", position: { row: 0, col: 1 } },
            { label: "A3", position: { row: 0, col: 2 } },
            { label: "A4", position: { row: 0, col: 3 } },
        ],
    },
    {
        slug: "outdoor-bed-unlimited",
        name: "DEV — Грядка А",
        environmentVariantKey: "environment.type.outdoor.bed",
        seatLayoutMode: "unlimited",
        wateringType: "manual",
        occupiedCount: 0,
    },
    {
        slug: "balcony-simple-counter",
        name: "DEV — Балкон юг",
        environmentVariantKey: "environment.type.indoor.shelf",
        seatLayoutMode: "simple_counter",
        wateringType: "drip",
        capacity: 8,
        occupiedCount: 2,
    },
];
async function resolveEnvironmentTagIds(variantKeys) {
    const url = process.env.TAXONOMY_DATABASE_URL?.trim();
    if (!url) {
        throw new Error("TAXONOMY_DATABASE_URL is required for dev location seed (taxonomy variant tags)");
    }
    const taxonomy = (0, taxonomy_prisma_for_migration_1.createTaxonomyPrisma)(url);
    try {
        const tags = await taxonomy.taxonomyTag.findMany({
            where: { key: { in: variantKeys } },
            select: { id: true, key: true },
        });
        const byKey = new Map(tags.map((t) => [t.key, t.id]));
        const missing = variantKeys.filter((key) => !byKey.has(key));
        if (missing.length > 0) {
            throw new Error(`taxonomy tags not found: ${missing.join(", ")}`);
        }
        return byKey;
    }
    finally {
        await taxonomy.$disconnect();
    }
}
function legacyTypeFieldsFromVariantKey(variantKey) {
    const subType = contracts_1.ENVIRONMENT_VARIANT_TO_LOCATION_SUB_TYPE[variantKey] ?? null;
    const environmentGroupSlug = (0, contracts_1.environmentGroupSlugFromVariantKey)(variantKey);
    const type = environmentGroupSlug
        ? environmentGroupSlug
        : null;
    return { environmentGroupSlug, type, subType };
}
async function upsertDevLocation(prisma, userId, fixture, tagIdsByKey) {
    const description = `${SEED_PREFIX}:${fixture.slug}`;
    const environmentTagId = tagIdsByKey.get(fixture.environmentVariantKey);
    if (!environmentTagId) {
        throw new Error(`taxonomy tag id missing for ${fixture.environmentVariantKey}`);
    }
    const legacy = legacyTypeFieldsFromVariantKey(fixture.environmentVariantKey);
    const data = {
        user: { connect: { id: userId } },
        name: fixture.name,
        description,
        status: "active",
        environmentTagId,
        environmentGroupSlug: legacy.environmentGroupSlug,
        seatLayoutMode: fixture.seatLayoutMode,
        ...(fixture.dimensions != null && { dimensions: fixture.dimensions }),
        ...(fixture.layoutMeta != null && { layoutMeta: fixture.layoutMeta }),
        ...(fixture.wateringType != null && { wateringType: fixture.wateringType }),
        occupiedCount: fixture.occupiedCount ?? 0,
        ...(fixture.specBlocks?.length && {
            specBlocks: {
                create: fixture.specBlocks.map((block) => ({
                    position: block.position,
                    kind: block.kind,
                    space: {
                        create: {
                            width: block.space.width,
                            height: block.space.height,
                            depth: block.space.depth,
                        },
                    },
                })),
            },
        }),
    };
    const existing = await prisma.location.findFirst({
        where: { userId, description },
        select: { id: true },
    });
    if (existing) {
        await prisma.locationSpecBlock.deleteMany({ where: { locationId: existing.id } });
        return prisma.location.update({
            where: { id: existing.id },
            data: {
                name: fixture.name,
                environmentTagId,
                environmentGroupSlug: legacy.environmentGroupSlug,
                seatLayoutMode: fixture.seatLayoutMode,
                ...(fixture.dimensions != null && { dimensions: fixture.dimensions }),
                ...(fixture.layoutMeta != null && { layoutMeta: fixture.layoutMeta }),
                ...(fixture.wateringType != null && { wateringType: fixture.wateringType }),
                occupiedCount: fixture.occupiedCount ?? 0,
                ...(fixture.specBlocks?.length && {
                    specBlocks: {
                        create: fixture.specBlocks.map((block) => ({
                            position: block.position,
                            kind: block.kind,
                            space: {
                                create: {
                                    width: block.space.width,
                                    height: block.space.height,
                                    depth: block.space.depth,
                                },
                            },
                        })),
                    },
                }),
            },
        });
    }
    return prisma.location.create({ data });
}
async function syncDevSeats(prisma, locationId, seats) {
    const labels = seats.map((s) => s.label);
    await prisma.seat.updateMany({
        where: {
            locationId,
            status: "active",
            label: { notIn: labels },
        },
        data: { status: "archived" },
    });
    for (const seat of seats) {
        const existing = await prisma.seat.findFirst({
            where: { locationId, label: seat.label, status: "active" },
        });
        if (existing) {
            await prisma.seat.update({
                where: { id: existing.id },
                data: { position: seat.position },
            });
            continue;
        }
        await prisma.seat.create({
            data: {
                locationId,
                label: seat.label,
                position: seat.position,
                status: "active",
            },
        });
    }
}
async function seedDevLocations(prisma) {
    const user = await prisma.user.findUnique({
        where: { email: "user@growingapp.com" },
        select: { id: true },
    });
    if (!user) {
        throw new Error("seedDevLocations: user@growingapp.com not found — run user seed first");
    }
    const tagIdsByKey = await resolveEnvironmentTagIds(DEV_LOCATION_FIXTURES.map((f) => f.environmentVariantKey));
    const results = [];
    for (const fixture of DEV_LOCATION_FIXTURES) {
        const row = await upsertDevLocation(prisma, user.id, fixture, tagIdsByKey);
        if (fixture.seats?.length) {
            await syncDevSeats(prisma, row.id, fixture.seats);
        }
        results.push({
            slug: fixture.slug,
            id: row.id,
            seatLayoutMode: row.seatLayoutMode,
        });
    }
    return { userId: user.id, locations: results };
}
async function runCli() {
    const { PrismaClient } = await Promise.resolve().then(() => __importStar(require("@prisma/client")));
    const prisma = new PrismaClient();
    try {
        const result = await seedDevLocations(prisma);
        console.log("Dev locations seed completed:", result);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    runCli().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
//# sourceMappingURL=seed-dev-locations.js.map