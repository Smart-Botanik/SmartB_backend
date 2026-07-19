import * as path from "node:path";

export type ContentEdgesMigrationPrisma = {
  contentFacetProfile: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  contentFacetSlot: {
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    createMany: (args: {
      data: Array<Record<string, unknown>>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  $disconnect: () => Promise<void>;
};

export function createContentEdgesPrisma(
  targetUrl: string,
): ContentEdgesMigrationPrisma {
  const clientPath = path.join(
    __dirname,
    "../../../services/content-edges/node_modules/@prisma/client",
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: ContentEdgesPrismaClient } = require(clientPath) as {
      PrismaClient: new (args?: {
        datasources?: { db: { url: string } };
      }) => ContentEdgesMigrationPrisma;
    };
    return new ContentEdgesPrismaClient({
      datasources: { db: { url: targetUrl } },
    });
  } catch {
    throw new Error(
      "content-edges Prisma client not found — run: cd services/content-edges && npm install && npm run prisma:generate",
    );
  }
}

export function requireContentEdgesDatabaseUrl(): string {
  const url = process.env.CONTENT_EDGES_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "CONTENT_EDGES_DATABASE_URL is required (content-edges DB after BK-MS-EDGES cutover)",
    );
  }
  return url;
}
