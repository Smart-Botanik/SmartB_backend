-- BK-MS-CONTENT cutover: drop content/telegram tables from monolith DB.
-- Data must already be exported to content_db (npm run db:export-content).
-- Do NOT drop ContentFacet* tables.

DROP TABLE IF EXISTS "CropGuideTelegramPublication";
DROP TABLE IF EXISTS "TelegramChannel";
DROP TABLE IF EXISTS "TelegramBot";
DROP TABLE IF EXISTS "CropGuideTaxonomyTag";
DROP TABLE IF EXISTS "CropGuide";
DROP TABLE IF EXISTS "SitePage";
