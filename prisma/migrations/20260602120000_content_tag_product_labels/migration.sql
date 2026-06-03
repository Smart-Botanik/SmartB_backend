-- CreateEnum
CREATE TYPE "ContentTagNamespace" AS ENUM ('CROP', 'CROP_VARIANT', 'TOPIC', 'PRODUCT_USE');

-- CreateTable
CREATE TABLE "ContentTag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" "ContentTagNamespace" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentTag_key_key" ON "ContentTag"("key");

-- CreateIndex
CREATE INDEX "ContentTag_namespace_idx" ON "ContentTag"("namespace");

-- CreateIndex
CREATE INDEX "ContentTag_key_idx" ON "ContentTag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductLabels_AB_unique" ON "_ProductLabels"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductLabels_B_index" ON "_ProductLabels"("B");

-- AddForeignKey
ALTER TABLE "_ProductLabels" ADD CONSTRAINT "_ProductLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "ContentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductLabels" ADD CONSTRAINT "_ProductLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
