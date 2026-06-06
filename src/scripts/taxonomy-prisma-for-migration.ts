import * as path from "node:path";

/** Minimal surface for cutover export/verify scripts (taxonomy-service schema). */
export type TaxonomyMigrationPrisma = {
  taxonomyScope: {
    upsert: (args: {
      where: { key: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  taxonomyTag: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    findMany: (args?: {
      where?: { key?: { in: string[] } };
      orderBy?: unknown;
      select?: { id: true; key?: true; scopeKey?: true; parentId?: true };
    }) => Promise<Array<{ id: string; key: string; scopeKey?: string; parentId?: string | null }>>;
    count: () => Promise<number>;
  };
  $disconnect: () => Promise<void>;
};

export function createTaxonomyPrisma(targetUrl: string): TaxonomyMigrationPrisma {
  const clientPath = path.join(
    __dirname,
    "../../../services/taxonomy/node_modules/@prisma/client",
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: TaxonomyPrismaClient } = require(clientPath) as {
      PrismaClient: new (args?: {
        datasources?: { db: { url: string } };
      }) => TaxonomyMigrationPrisma;
    };
    return new TaxonomyPrismaClient({
      datasources: { db: { url: targetUrl } },
    });
  } catch {
    throw new Error(
      "taxonomy Prisma client not found — run: cd services/taxonomy && npm install && npm run prisma:generate",
    );
  }
}
