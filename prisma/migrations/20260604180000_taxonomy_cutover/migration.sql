-- BK-MS-TAX-3: TaxonomyScope / TaxonomyTag live in taxonomy-service; monolith keeps guide links by tag id.

CREATE TABLE IF NOT EXISTS "CropGuideTaxonomyTag" (
  "cropGuideId" TEXT NOT NULL,
  "taxonomyTagId" TEXT NOT NULL,
  CONSTRAINT "CropGuideTaxonomyTag_pkey" PRIMARY KEY ("cropGuideId", "taxonomyTagId")
);

INSERT INTO "CropGuideTaxonomyTag" ("cropGuideId", "taxonomyTagId")
SELECT "A", "B" FROM "_GuideTaxonomyTags"
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS "_GuideTaxonomyTags";
DROP TABLE IF EXISTS "TaxonomyTag";
DROP TABLE IF EXISTS "TaxonomyScope";

DROP TYPE IF EXISTS "TaxonomyTagNamespace";
DROP TYPE IF EXISTS "TaxonomyTagStatus";

ALTER TABLE "CropGuideTaxonomyTag"
  ADD CONSTRAINT "CropGuideTaxonomyTag_cropGuideId_fkey"
  FOREIGN KEY ("cropGuideId") REFERENCES "CropGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CropGuideTaxonomyTag_taxonomyTagId_idx"
  ON "CropGuideTaxonomyTag"("taxonomyTagId");
