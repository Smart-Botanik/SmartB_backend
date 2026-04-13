-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('indoor', 'outdoor', 'greenhouse');

-- CreateEnum
CREATE TYPE "LocationSubType" AS ENUM ('indoor_growbox', 'indoor_cabinet', 'indoor_pc_case', 'indoor_shelf', 'indoor_room', 'outdoor_bed', 'outdoor_soil', 'outdoor_pot', 'greenhouse_classic', 'greenhouse_tunnel');

-- CreateEnum
CREATE TYPE "LocationWateringType" AS ENUM ('manual', 'drip', 'hydroponics', 'aeroponics');

-- CreateEnum
CREATE TYPE "LocationSpecKind" AS ENUM ('lighting', 'enclosure', 'space', 'area');

-- AlterTable
ALTER TABLE "Plant" ADD COLUMN "locationId" TEXT;

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'active',
    "type" "LocationType",
    "subType" "LocationSubType",
    "wateringType" "LocationWateringType",
    "description" TEXT,
    "capacity" INTEGER,
    "occupiedSlots" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationSpecBlock" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "LocationSpecKind" NOT NULL,

    CONSTRAINT "LocationSpecBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationSpecsLighting" (
    "specBlockId" TEXT NOT NULL,
    "vegetationLamps" JSONB,
    "bloomLamps" JSONB,

    CONSTRAINT "LocationSpecsLighting_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "LocationSpecsEnclosure" (
    "specBlockId" TEXT NOT NULL,
    "productId" TEXT,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "LocationSpecsEnclosure_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "LocationSpecsSpace" (
    "specBlockId" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "LocationSpecsSpace_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "LocationSpecsArea" (
    "specBlockId" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "LocationSpecsArea_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "_DiaryLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Location_userId_idx" ON "Location"("userId");

-- CreateIndex
CREATE INDEX "Location_userId_status_idx" ON "Location"("userId", "status");

-- CreateIndex
CREATE INDEX "LocationSpecBlock_locationId_idx" ON "LocationSpecBlock"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationSpecBlock_locationId_position_key" ON "LocationSpecBlock"("locationId", "position");

-- CreateIndex
CREATE INDEX "LocationSpecsEnclosure_productId_idx" ON "LocationSpecsEnclosure"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "_DiaryLocations_AB_unique" ON "_DiaryLocations"("A", "B");

-- CreateIndex
CREATE INDEX "_DiaryLocations_B_index" ON "_DiaryLocations"("B");

-- CreateIndex
CREATE INDEX "Plant_locationId_idx" ON "Plant"("locationId");

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecBlock" ADD CONSTRAINT "LocationSpecBlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecsLighting" ADD CONSTRAINT "LocationSpecsLighting_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecsEnclosure" ADD CONSTRAINT "LocationSpecsEnclosure_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecsEnclosure" ADD CONSTRAINT "LocationSpecsEnclosure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecsSpace" ADD CONSTRAINT "LocationSpecsSpace_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSpecsArea" ADD CONSTRAINT "LocationSpecsArea_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiaryLocations" ADD CONSTRAINT "_DiaryLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Diary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiaryLocations" ADD CONSTRAINT "_DiaryLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
