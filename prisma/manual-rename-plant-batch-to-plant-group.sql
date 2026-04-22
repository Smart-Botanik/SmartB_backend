-- Run once on an existing database that still has PlantBatch + Plant.batchId
-- before `prisma db push` / deploy with the new Prisma schema (PlantGroup + Plant.groupId).
-- Fresh databases: skip this file and use `prisma db push` or a normal migrate baseline.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlantGroupStatus') THEN
    CREATE TYPE "PlantGroupStatus" AS ENUM ('active', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PlantBatch'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PlantGroup'
  ) THEN
    ALTER TABLE "PlantBatch" RENAME TO "PlantGroup";
  END IF;
END $$;

ALTER TABLE "PlantGroup" ADD COLUMN IF NOT EXISTS "status" "PlantGroupStatus" NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Plant' AND column_name = 'batchId'
  ) THEN
    ALTER TABLE "Plant" RENAME COLUMN "batchId" TO "groupId";
  END IF;
END $$;
