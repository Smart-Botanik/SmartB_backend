-- BK-REW-01-3 (ADR-0013 Phase C): drop legacy Location classification / tree fields.
-- Prerequisite: REW-03 backfill + db:verify:location-legacy-cleanup on this database.

-- DropForeignKey (Location parent tree)
ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_parentLocationId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Location_parentLocationId_idx";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN IF EXISTS "parentLocationId";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "subType";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "capacity";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "occupiedSlots";
