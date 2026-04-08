-- AlterTable
ALTER TABLE "ActionPathRegistry" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ActionPathRegistry_groupId_position_idx" ON "ActionPathRegistry"("groupId", "position");

-- AddForeignKey
ALTER TABLE "ActionPathRegistry" ADD CONSTRAINT "ActionPathRegistry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ActionPathRegistryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
