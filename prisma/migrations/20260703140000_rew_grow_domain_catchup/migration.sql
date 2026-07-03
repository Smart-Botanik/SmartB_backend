-- REW-01..06 domain catch-up: unified Location fields, Seat, PlantGroup/placement,
-- LocationGroup (REW-04), Metrics (REW-05).
-- Must run BEFORE 20260703153000_location_drop_legacy_columns on fresh deploy.
-- Dev DB already synced via db push: `npx prisma migrate resolve --applied 20260703140000_rew_grow_domain_catchup`

-- CreateEnum
CREATE TYPE "PlantGroupStatus" AS ENUM ('active', 'cancelled');
CREATE TYPE "SeatLayoutMode" AS ENUM ('fixed_grid', 'unlimited', 'simple_counter');
CREATE TYPE "SeatStatus" AS ENUM ('active', 'archived');
CREATE TYPE "PlantPlacementStage" AS ENUM ('none', 'planned', 'ready_to_plant', 'seated');
CREATE TYPE "MetricStatus" AS ENUM ('active', 'archived');

-- CreateTable
CREATE TABLE "PlantGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diaryId" TEXT,
    "status" "PlantGroupStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CultivationUnit" ADD COLUMN IF NOT EXISTS "current" JSONB;
ALTER TABLE "CultivationUnit" ALTER COLUMN "primaryLocationId" DROP NOT NULL;

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "environmentTagId" TEXT,
ADD COLUMN IF NOT EXISTS "environmentGroupSlug" TEXT,
ADD COLUMN IF NOT EXISTS "dimensions" JSONB,
ADD COLUMN IF NOT EXISTS "seatLayoutMode" "SeatLayoutMode" NOT NULL DEFAULT 'simple_counter',
ADD COLUMN IF NOT EXISTS "layoutMeta" JSONB,
ADD COLUMN IF NOT EXISTS "occupiedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Plant" ADD COLUMN IF NOT EXISTS "groupId" TEXT,
ADD COLUMN IF NOT EXISTS "placementStage" "PlantPlacementStage" NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS "plannedLocationId" TEXT,
ADD COLUMN IF NOT EXISTS "currentSeatId" TEXT;

-- CreateTable
CREATE TABLE "LocationTaxonomyTag" (
    "locationId" TEXT NOT NULL,
    "taxonomyTagId" TEXT NOT NULL,

    CONSTRAINT "LocationTaxonomyTag_pkey" PRIMARY KEY ("locationId","taxonomyTagId")
);

CREATE TABLE "Seat" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "position" JSONB,
    "status" "SeatStatus" NOT NULL DEFAULT 'active',
    "plantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeatTaxonomyTag" (
    "seatId" TEXT NOT NULL,
    "taxonomyTagId" TEXT NOT NULL,

    CONSTRAINT "SeatTaxonomyTag_pkey" PRIMARY KEY ("seatId","taxonomyTagId")
);

CREATE TABLE "LocationGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LocationGroupMember" (
    "locationGroupId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationGroupMember_pkey" PRIMARY KEY ("locationGroupId","locationId")
);

CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MetricStatus" NOT NULL DEFAULT 'active',
    "displayPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetricLocationMember" (
    "metricId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricLocationMember_pkey" PRIMARY KEY ("metricId","locationId")
);

CREATE TABLE "MetricPlantMember" (
    "metricId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricPlantMember_pkey" PRIMARY KEY ("metricId","plantId")
);

-- CreateIndex
CREATE INDEX "PlantGroup_userId_idx" ON "PlantGroup"("userId");
CREATE INDEX "PlantGroup_diaryId_idx" ON "PlantGroup"("diaryId");
CREATE INDEX "Plant_groupId_idx" ON "Plant"("groupId");
CREATE INDEX "Plant_plannedLocationId_idx" ON "Plant"("plannedLocationId");
CREATE INDEX "Plant_placementStage_idx" ON "Plant"("placementStage");
CREATE UNIQUE INDEX "Plant_currentSeatId_key" ON "Plant"("currentSeatId");
CREATE INDEX "Location_environmentTagId_idx" ON "Location"("environmentTagId");
CREATE INDEX "Location_environmentGroupSlug_idx" ON "Location"("environmentGroupSlug");
CREATE INDEX "LocationTaxonomyTag_taxonomyTagId_idx" ON "LocationTaxonomyTag"("taxonomyTagId");
CREATE INDEX "Seat_locationId_status_idx" ON "Seat"("locationId", "status");
CREATE UNIQUE INDEX "Seat_locationId_label_key" ON "Seat"("locationId", "label");
CREATE UNIQUE INDEX "Seat_plantId_key" ON "Seat"("plantId");
CREATE INDEX "SeatTaxonomyTag_taxonomyTagId_idx" ON "SeatTaxonomyTag"("taxonomyTagId");
CREATE INDEX "LocationGroup_userId_idx" ON "LocationGroup"("userId");
CREATE INDEX "LocationGroupMember_locationId_idx" ON "LocationGroupMember"("locationId");
CREATE INDEX "Metric_userId_idx" ON "Metric"("userId");
CREATE INDEX "Metric_userId_status_idx" ON "Metric"("userId", "status");
CREATE INDEX "MetricLocationMember_locationId_idx" ON "MetricLocationMember"("locationId");
CREATE INDEX "MetricPlantMember_plantId_idx" ON "MetricPlantMember"("plantId");

-- AddForeignKey
ALTER TABLE "PlantGroup" ADD CONSTRAINT "PlantGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlantGroup" ADD CONSTRAINT "PlantGroup_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlantGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_plannedLocationId_fkey" FOREIGN KEY ("plannedLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_currentSeatId_fkey" FOREIGN KEY ("currentSeatId") REFERENCES "Seat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LocationTaxonomyTag" ADD CONSTRAINT "LocationTaxonomyTag_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeatTaxonomyTag" ADD CONSTRAINT "SeatTaxonomyTag_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationGroup" ADD CONSTRAINT "LocationGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationGroupMember" ADD CONSTRAINT "LocationGroupMember_locationGroupId_fkey" FOREIGN KEY ("locationGroupId") REFERENCES "LocationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationGroupMember" ADD CONSTRAINT "LocationGroupMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricLocationMember" ADD CONSTRAINT "MetricLocationMember_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricLocationMember" ADD CONSTRAINT "MetricLocationMember_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricPlantMember" ADD CONSTRAINT "MetricPlantMember_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetricPlantMember" ADD CONSTRAINT "MetricPlantMember_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
