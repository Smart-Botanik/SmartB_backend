-- CreateTable
CREATE TABLE "TelegramBot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenEncrypted" TEXT NOT NULL,
    "username" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramBot_isActive_idx" ON "TelegramBot"("isActive");

CREATE INDEX "TelegramChannel_botId_idx" ON "TelegramChannel"("botId");
CREATE INDEX "TelegramChannel_isActive_idx" ON "TelegramChannel"("isActive");
CREATE INDEX "TelegramChannel_isDefault_idx" ON "TelegramChannel"("isDefault");

CREATE UNIQUE INDEX "TelegramChannel_botId_chatId_key" ON "TelegramChannel"("botId", "chatId");

-- At most one default channel (app may also enforce before insert).
CREATE UNIQUE INDEX "TelegramChannel_single_default_idx" ON "TelegramChannel" ((1)) WHERE "isDefault" = true;

-- AddForeignKey
ALTER TABLE "TelegramChannel" ADD CONSTRAINT "TelegramChannel_botId_fkey" FOREIGN KEY ("botId") REFERENCES "TelegramBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
