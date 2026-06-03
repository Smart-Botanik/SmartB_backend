-- CreateTable
CREATE TABLE "TaxonomyScope" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyScope_pkey" PRIMARY KEY ("key")
);

-- Seed default scopes
INSERT INTO "TaxonomyScope" ("key", "label", "description", "sortOrder", "updatedAt")
VALUES
  ('crop', 'Культуры', 'Иерархия культур и подтипов для продуктов и пикеров', 10, CURRENT_TIMESTAMP),
  ('guides', 'Рубрики гайдов', 'Рубрики и темы для статей и CropGuide', 20, CURRENT_TIMESTAMP);

-- CreateEnum
CREATE TYPE "TaxonomyGroupDeleteStrategy" AS ENUM ('REASSIGN', 'CASCADE', 'PROMOTE_TO_ROOT');

-- AlterTable
ALTER TABLE "TaxonomyTag" ADD COLUMN "scopeKey" TEXT;

-- Backfill scopeKey from key prefix / namespace
UPDATE "TaxonomyTag"
SET "scopeKey" = 'crop'
WHERE "key" LIKE 'crop.%'
   OR "namespace" IN ('CROP', 'CROP_VARIANT');

UPDATE "TaxonomyTag"
SET "scopeKey" = 'guides'
WHERE "scopeKey" IS NULL
  AND (
    "key" LIKE 'topic.%'
    OR "key" LIKE 'guides.%'
    OR "namespace" IN ('TOPIC', 'PRODUCT_USE')
  );

UPDATE "TaxonomyTag"
SET "scopeKey" = 'crop'
WHERE "scopeKey" IS NULL;

ALTER TABLE "TaxonomyTag" ALTER COLUMN "scopeKey" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TaxonomyTag" ADD CONSTRAINT "TaxonomyTag_scopeKey_fkey"
  FOREIGN KEY ("scopeKey") REFERENCES "TaxonomyScope"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TaxonomyTag_scopeKey_idx" ON "TaxonomyTag"("scopeKey");
