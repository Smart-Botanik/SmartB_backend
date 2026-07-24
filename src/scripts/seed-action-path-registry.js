"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedActionPathRegistry = seedActionPathRegistry;
const client_1 = require("@prisma/client");
const contracts_1 = require("@growing/contracts");
async function seedActionPathRegistry(prisma, scope = "full") {
    const { groups, entries } = (0, contracts_1.getActionPathRegistrySeedPayload)(scope);
    const jsonNull = client_1.Prisma.JsonNull;
    for (const group of groups) {
        await prisma.actionPathRegistryGroup.upsert({
            where: { path: group.path },
            create: {
                path: group.path,
                description: group.description,
                order: group.defaultOrder,
            },
            update: {
                description: group.description,
                order: group.defaultOrder,
            },
        });
    }
    const groupRows = await prisma.actionPathRegistryGroup.findMany({
        where: { path: { in: groups.map((g) => g.path) } },
        select: { id: true, path: true },
    });
    const groupIdByPath = new Map(groupRows.map((g) => [g.path, g.id]));
    for (const entry of entries) {
        const groupId = groupIdByPath.get(entry.groupPath);
        if (!groupId) {
            throw new Error(`Registry seed: group "${entry.groupPath}" not found for action_path "${entry.actionPath}"`);
        }
        await prisma.actionPathRegistry.upsert({
            where: { actionPath: entry.actionPath },
            create: {
                actionPath: entry.actionPath,
                description: entry.description,
                targetType: entry.targetType,
                mapping: entry.mapping,
                autoTagRules: entry.autoTagRules,
                conditions: entry.conditions ?? jsonNull,
                schema: entry.schema ?? jsonNull,
                groupId,
                position: entry.position,
            },
            update: {
                description: entry.description,
                targetType: entry.targetType,
                mapping: entry.mapping,
                autoTagRules: entry.autoTagRules,
                conditions: entry.conditions ?? jsonNull,
                schema: entry.schema ?? jsonNull,
                groupId,
                position: entry.position,
            },
        });
    }
    return {
        scope,
        groups: groups.length,
        entries: entries.length,
    };
}
async function runCli() {
    const scope = process.env.REGISTRY_SEED_SCOPE === "mvp" ? "mvp" : "full";
    const prisma = new client_1.PrismaClient();
    try {
        const result = await seedActionPathRegistry(prisma, scope);
        console.log(`ActionPathRegistry seed completed (scope=${result.scope}): groups=${result.groups}, entries=${result.entries}`);
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
//# sourceMappingURL=seed-action-path-registry.js.map