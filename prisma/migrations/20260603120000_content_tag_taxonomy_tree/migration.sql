-- CreateEnum
CREATE TYPE "ContentTagStatus" AS ENUM ('ACTIVE', 'DEPRECATED');

-- AlterTable
ALTER TABLE "ContentTag" ADD COLUMN "parentId" TEXT,
ADD COLUMN "cropKind" "CropKind",
ADD COLUMN "variantAxis" TEXT,
ADD COLUMN "status" "ContentTagStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "ContentTag_parentId_idx" ON "ContentTag"("parentId");
CREATE INDEX "ContentTag_cropKind_idx" ON "ContentTag"("cropKind");
CREATE INDEX "ContentTag_status_idx" ON "ContentTag"("status");

-- AddForeignKey
ALTER TABLE "ContentTag" ADD CONSTRAINT "ContentTag_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
