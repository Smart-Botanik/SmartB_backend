-- AlterTable
ALTER TABLE "Plant" ADD COLUMN     "current" JSONB;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "actionPath" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetType" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPathRegistry" (
    "id" TEXT NOT NULL,
    "actionPath" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "targetType" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "conditions" JSONB,
    "autoTagRules" JSONB,
    "schema" JSONB,
    "tagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPathRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPathRegistryGroup" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPathRegistryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_targetType_targetId_timestamp_idx" ON "Event"("targetType", "targetId", "timestamp");

-- CreateIndex
CREATE INDEX "Event_actionPath_idx" ON "Event"("actionPath");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE INDEX "Tag_targetType_idx" ON "Tag"("targetType");

-- CreateIndex
CREATE INDEX "Tag_label_idx" ON "Tag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPathRegistry_actionPath_key" ON "ActionPathRegistry"("actionPath");

-- CreateIndex
CREATE INDEX "ActionPathRegistry_targetType_idx" ON "ActionPathRegistry"("targetType");

-- CreateIndex
CREATE INDEX "ActionPathRegistry_tagId_idx" ON "ActionPathRegistry"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ActionPathRegistryGroup_path_key" ON "ActionPathRegistryGroup"("path");

-- CreateIndex
CREATE INDEX "ActionPathRegistryGroup_path_idx" ON "ActionPathRegistryGroup"("path");

-- AddForeignKey
ALTER TABLE "ActionPathRegistry" ADD CONSTRAINT "ActionPathRegistry_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
