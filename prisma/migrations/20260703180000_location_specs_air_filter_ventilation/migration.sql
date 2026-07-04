-- AlterEnum
ALTER TYPE "LocationSpecKind" ADD VALUE 'air_filter';
ALTER TYPE "LocationSpecKind" ADD VALUE 'ventilation';

-- CreateTable
CREATE TABLE "LocationSpecsAirFilter" (
    "specBlockId" TEXT NOT NULL,
    "filters" JSONB,

    CONSTRAINT "LocationSpecsAirFilter_pkey" PRIMARY KEY ("specBlockId")
);

CREATE TABLE "LocationSpecsVentilation" (
    "specBlockId" TEXT NOT NULL,
    "fans" JSONB,

    CONSTRAINT "LocationSpecsVentilation_pkey" PRIMARY KEY ("specBlockId")
);

-- AddForeignKey
ALTER TABLE "LocationSpecsAirFilter" ADD CONSTRAINT "LocationSpecsAirFilter_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationSpecsVentilation" ADD CONSTRAINT "LocationSpecsVentilation_specBlockId_fkey" FOREIGN KEY ("specBlockId") REFERENCES "LocationSpecBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
