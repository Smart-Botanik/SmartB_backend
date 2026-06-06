-- BK-MS-REFDATA-3: Brand / Product live in reference_data_db (reference-data-service).

ALTER TABLE "LocationSpecsEnclosure" DROP CONSTRAINT IF EXISTS "LocationSpecsEnclosure_productId_fkey";

DROP TABLE IF EXISTS "_ProductTaxonomyTags";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "Brand";

DROP TYPE IF EXISTS "BrandCategory";
