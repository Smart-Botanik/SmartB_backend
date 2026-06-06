-- CreateEnum
CREATE TYPE "CultivationUnitStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "CultivationUnitPlacementRole" AS ENUM ('primary', 'member', 'shared');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "parentLocationId" TEXT;

-- AlterTable
ALTER TABLE "Plant" ADD COLUMN "cultivationUnitId" TEXT;
ALTER TABLE "Plant" ADD COLUMN "cultivationUnitNudgeDismissed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CultivationUnit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CultivationUnitStatus" NOT NULL DEFAULT 'active',
    "current" JSONB,
    "type" "LocationType",
    "subType" "LocationSubType",
    "capacity" INTEGER,
    "occupiedSlots" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CultivationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultivationUnitPlacement" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "cultivationUnitId" TEXT NOT NULL,
    "role" "CultivationUnitPlacementRole" NOT NULL DEFAULT 'member',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CultivationUnitPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultivationUnitSpecBlock" (
    "id" TEXT NOT NULL,
    "cultivationUnitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "LocationSpecKind" NOT NULL,

    CONSTRAINT "CultivationUnitSpecBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CultivationUnitSpecsLighting" (
    "specBlockId" TEXT NOT NULL,
    "vegetationLamps" JSONB,
    "bloomLamps" JSONB,

    CONSTRAINT "CultivationUnitSpecsLighting_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "CultivationUnitSpecsEnclosure" (
    "specBlockId" TEXT NOT NULL,
    "productId" TEXT,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "CultivationUnitSpecsEnclosure_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "CultivationUnitSpecsSpace" (
    "specBlockId" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "CultivationUnitSpecsSpace_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "CultivationUnitSpecsArea" (
    "specBlockId" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,

    CONSTRAINT "CultivationUnitSpecsArea_pkey" PRIMARY KEY ("specBlockId")
);

-- CreateTable
CREATE TABLE "_DiaryCultivationUnits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Location_parentLocationId_idx" ON "Location"("parentLocationId");

-- CreateIndex
CREATE INDEX "Plant_cultivationUnitId_idx" ON "Plant"("cultivationUnitId");

-- CreateIndex
CREATE INDEX "CultivationUnit_userId_idx" ON "CultivationUnit"("userId");
CREATE INDEX "CultivationUnit_userId_status_idx" ON "CultivationUnit"("userId", "status");
CREATE INDEX "CultivationUnit_primaryLocationId_idx" ON "CultivationUnit"("primaryLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CultivationUnitPlacement_locationId_cultivationUnitId_key" ON "CultivationUnitPlacement"("locationId", "cultivationUnitId");
CREATE INDEX "CultivationUnitPlacement_cultivationUnitId_idx" ON "CultivationUnitPlacement"("cultivationUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "CultivationUnitSpecBlock_cultivationUnitId_position_key" ON "CultivationUnitSpecBlock"("cultivationUnitId", "position");
CREATE INDEX "CultivationUnitSpecBlock_cultivationUnitId_idx" ON "CultivationUnitSpecBlock"("cultivationUnitId");

-- CreateIndex
CREATE INDEX "CultivationUnitSpecsEnclosure_productId_idx" ON "CultivationUnitSpecsEnclosure"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "_DiaryCultivationUnits_AB_unique" ON "_DiaryCultivationUnits"("A", "B");
CREATE INDEX "_DiaryCultivationUnits_B_index" ON "_DiaryCultivationUnits"("B");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_parentLocationId_fkey" FOREIGN KEY ("parentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_cultivationUnitId_fkey" FOREIGN KEY ("cultivationUnitId") REFERENCES "CultivationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnit" ADD CONSTRAINT "CultivationUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnit" ADD CONSTRAINT "CultivationUnit_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitPlacement" ADD CONSTRAINT "CultivationUnitPlacement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitPlacement" ADD CONSTRAINT "CultivationUnitPlacement_cultivationUnitId_fkey" FOREIGN KEY ("cultivationUnitId") REFERENCES "CultivationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitSpecBlock" ADD CONSTRAINT "CultivationUnitSpecBlock_cultivationUnitId_fkey" FOREIGN KEY ("cultivationUnitId") REFERENCES "CultivationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitSpecsLighting" ADD CONSTRAINT "CultivationUnitSpecsLighting_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "CultivationUnitSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitSpecsEnclosure" ADD CONSTRAINT "CultivationUnitSpecsEnclosure_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "CultivationUnitSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitSpecsSpace" ADD CONSTRAINT "CultivationUnitSpecsSpace_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "CultivationUnitSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CultivationUnitSpecsArea" ADD CONSTRAINT "CultivationUnitSpecsArea_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "CultivationUnitSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiaryCultivationUnits" ADD CONSTRAINT "_DiaryCultivationUnits_A_fkey" FOREIGN KEY ("A") REFERENCES "CultivationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiaryCultivationUnits" ADD CONSTRAINT "_DiaryCultivationUnits_B_fkey" FOREIGN KEY ("B") REFERENCES "Diary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
