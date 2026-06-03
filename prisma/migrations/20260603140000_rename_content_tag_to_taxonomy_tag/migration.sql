-- Rename enums
ALTER TYPE "ContentTagNamespace" RENAME TO "TaxonomyTagNamespace";
ALTER TYPE "ContentTagStatus" RENAME TO "TaxonomyTagStatus";

-- Rename main table
ALTER TABLE "ContentTag" RENAME TO "TaxonomyTag";

-- Rename implicit M2M tables
ALTER TABLE "_GuideLabels" RENAME TO "_GuideTaxonomyTags";
ALTER TABLE "_ProductLabels" RENAME TO "_ProductTaxonomyTags";

-- Rename FK on TaxonomyTag tree (constraint names may vary; Prisma default pattern)
ALTER TABLE "TaxonomyTag" RENAME CONSTRAINT "ContentTag_pkey" TO "TaxonomyTag_pkey";
ALTER TABLE "TaxonomyTag" RENAME CONSTRAINT "ContentTag_parentId_fkey" TO "TaxonomyTag_parentId_fkey";

-- Rename indexes on TaxonomyTag
ALTER INDEX "ContentTag_key_key" RENAME TO "TaxonomyTag_key_key";
ALTER INDEX "ContentTag_namespace_idx" RENAME TO "TaxonomyTag_namespace_idx";
ALTER INDEX "ContentTag_key_idx" RENAME TO "TaxonomyTag_key_idx";
ALTER INDEX "ContentTag_parentId_idx" RENAME TO "TaxonomyTag_parentId_idx";
ALTER INDEX "ContentTag_cropKind_idx" RENAME TO "TaxonomyTag_cropKind_idx";
ALTER INDEX "ContentTag_status_idx" RENAME TO "TaxonomyTag_status_idx";

-- M2M unique indexes
ALTER INDEX "_GuideLabels_AB_unique" RENAME TO "_GuideTaxonomyTags_AB_unique";
ALTER INDEX "_GuideLabels_B_index" RENAME TO "_GuideTaxonomyTags_B_index";
ALTER INDEX "_ProductLabels_AB_unique" RENAME TO "_ProductTaxonomyTags_AB_unique";
ALTER INDEX "_ProductLabels_B_index" RENAME TO "_ProductTaxonomyTags_B_index";

-- M2M FK constraints
ALTER TABLE "_GuideTaxonomyTags" RENAME CONSTRAINT "_GuideLabels_A_fkey" TO "_GuideTaxonomyTags_A_fkey";
ALTER TABLE "_GuideTaxonomyTags" RENAME CONSTRAINT "_GuideLabels_B_fkey" TO "_GuideTaxonomyTags_B_fkey";
ALTER TABLE "_ProductTaxonomyTags" RENAME CONSTRAINT "_ProductLabels_A_fkey" TO "_ProductTaxonomyTags_A_fkey";
ALTER TABLE "_ProductTaxonomyTags" RENAME CONSTRAINT "_ProductLabels_B_fkey" TO "_ProductTaxonomyTags_B_fkey";
