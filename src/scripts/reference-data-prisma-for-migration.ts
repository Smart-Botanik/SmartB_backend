import * as path from "node:path";
import type { PrismaClient } from "@prisma/client";

/** Minimal surface used by cutover export/verify scripts (reference-data-service schema). */
export type ReferenceDataMigrationPrisma = {
  brand: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
    findMany: (args: { select: { id: true } }) => Promise<Array<{ id: string }>>;
  };
  product: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  $executeRaw: PrismaClient["$executeRaw"];
  $queryRaw: PrismaClient["$queryRaw"];
  $disconnect: () => Promise<void>;
};

export function createReferenceDataPrisma(
  targetUrl: string,
): ReferenceDataMigrationPrisma {
  const clientPath = path.join(
    __dirname,
    "../../../services/reference-data/node_modules/@prisma/client",
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: RefDataPrismaClient } = require(clientPath) as {
      PrismaClient: new (args?: {
        datasources?: { db: { url: string } };
      }) => ReferenceDataMigrationPrisma;
    };
    return new RefDataPrismaClient({
      datasources: { db: { url: targetUrl } },
    });
  } catch {
    throw new Error(
      "reference-data Prisma client not found — run: cd services/reference-data && npm install && npm run prisma:generate",
    );
  }
}
