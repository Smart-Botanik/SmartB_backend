-- CreateTable
CREATE TABLE "CropGuideTelegramPublication" (
    "id" TEXT NOT NULL,
    "cropGuideId" TEXT NOT NULL,
    "channelId" TEXT,
    "botId" TEXT,
    "channelName" TEXT,
    "botName" TEXT,
    "telegramMessageId" TEXT NOT NULL,
    "telegramPostUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropGuideTelegramPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CropGuideTelegramPublication_cropGuideId_publishedAt_idx" ON "CropGuideTelegramPublication"("cropGuideId", "publishedAt");

-- CreateIndex
CREATE INDEX "CropGuideTelegramPublication_channelId_idx" ON "CropGuideTelegramPublication"("channelId");

-- AddForeignKey
ALTER TABLE "CropGuideTelegramPublication" ADD CONSTRAINT "CropGuideTelegramPublication_cropGuideId_fkey" FOREIGN KEY ("cropGuideId") REFERENCES "CropGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropGuideTelegramPublication" ADD CONSTRAINT "CropGuideTelegramPublication_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TelegramChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one row per guide that already has telegramPublishedAt
INSERT INTO "CropGuideTelegramPublication" (
    "id",
    "cropGuideId",
    "channelId",
    "botId",
    "channelName",
    "botName",
    "telegramMessageId",
    "telegramPostUrl",
    "publishedAt",
    "createdAt"
)
SELECT
    'legacy_' || g."id",
    g."id",
    dc."id",
    dc."botId",
    dc."name",
    db."name",
    COALESCE(g."telegramMessageId", 'unknown'),
    g."telegramPostUrl",
    COALESCE(g."telegramPublishedAt", g."updatedAt"),
    COALESCE(g."telegramPublishedAt", g."updatedAt")
FROM "CropGuide" g
LEFT JOIN LATERAL (
    SELECT c."id", c."botId", c."name"
    FROM "TelegramChannel" c
    WHERE c."isDefault" = true AND c."isActive" = true
    ORDER BY c."updatedAt" DESC
    LIMIT 1
) dc ON true
LEFT JOIN "TelegramBot" db ON db."id" = dc."botId"
WHERE g."telegramPublishedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CropGuideTelegramPublication" p WHERE p."cropGuideId" = g."id"
  );
