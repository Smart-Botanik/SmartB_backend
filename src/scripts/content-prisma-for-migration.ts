import * as path from "node:path";
import type { PrismaClient } from "@prisma/client";

/**
 * Content-service Prisma client for cutover export/verify/seed scripts.
 * Generated from services/content — run prisma generate there first.
 */
export type ContentMigrationPrisma = {
  telegramBot: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<{
      id: string;
      name: string;
      [key: string]: unknown;
    }>;
    count: () => Promise<number>;
  };
  telegramChannel: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<{
      id: string;
      name: string;
      [key: string]: unknown;
    }>;
    count: () => Promise<number>;
  };
  cropGuide: {
    upsert: (args: {
      where: { id?: string; slug?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string; slug: string; [key: string]: unknown }>;
    findMany: (args?: Record<string, unknown>) => Promise<
      Array<{
        id: string;
        slug: string;
        body: unknown;
        bodySiteMd: string;
        [key: string]: unknown;
      }>
    >;
    update: (args: {
      where: { id?: string; slug?: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  cropGuideTaxonomyTag: {
    upsert: (args: {
      where: {
        cropGuideId_taxonomyTagId: {
          cropGuideId: string;
          taxonomyTagId: string;
        };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    deleteMany: (args: {
      where: Record<string, unknown>;
    }) => Promise<unknown>;
    createMany: (args: {
      data: Array<Record<string, unknown>>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  cropGuideTelegramPublication: {
    upsert: (args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  sitePage: {
    upsert: (args: {
      where: { id?: string; key?: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
    count: () => Promise<number>;
  };
  $executeRaw: PrismaClient["$executeRaw"];
  $queryRaw: PrismaClient["$queryRaw"];
  $disconnect: () => Promise<void>;
};

export function createContentPrisma(targetUrl: string): ContentMigrationPrisma {
  const clientPath = path.join(
    __dirname,
    "../../../services/content/node_modules/@prisma/client",
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: ContentPrismaClient } = require(clientPath) as {
      PrismaClient: new (args?: {
        datasources?: { db: { url: string } };
      }) => ContentMigrationPrisma;
    };
    return new ContentPrismaClient({
      datasources: { db: { url: targetUrl } },
    });
  } catch {
    throw new Error(
      "content Prisma client not found — run: cd services/content && npm install && npm run prisma:generate",
    );
  }
}

export function requireContentDatabaseUrl(): string {
  const url = process.env.CONTENT_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "CONTENT_DATABASE_URL is required (content-service DB after BK-MS-CONTENT cutover)",
    );
  }
  return url;
}
