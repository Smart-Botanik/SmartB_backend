-- AlterTable
ALTER TABLE "Location" ADD COLUMN "current" JSONB;

-- CreateTable
CREATE TABLE "LocationProjectionCheckpoint" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationProjectionCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationSnapshot" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "asOfEventId" TEXT,
    "asOfTimestamp" TIMESTAMP(3) NOT NULL,
    "projectorVersion" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationProjectionCheckpoint_eventId_key" ON "LocationProjectionCheckpoint"("eventId");

-- CreateIndex
CREATE INDEX "LocationProjectionCheckpoint_locationId_createdAt_idx" ON "LocationProjectionCheckpoint"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "LocationSnapshot_locationId_asOfTimestamp_idx" ON "LocationSnapshot"("locationId", "asOfTimestamp");
