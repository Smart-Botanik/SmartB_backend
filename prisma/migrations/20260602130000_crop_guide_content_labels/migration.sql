-- CreateTable
CREATE TABLE "_GuideLabels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GuideLabels_AB_unique" ON "_GuideLabels"("A", "B");

-- CreateIndex
CREATE INDEX "_GuideLabels_B_index" ON "_GuideLabels"("B");

-- AddForeignKey
ALTER TABLE "_GuideLabels" ADD CONSTRAINT "_GuideLabels_A_fkey" FOREIGN KEY ("A") REFERENCES "ContentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GuideLabels" ADD CONSTRAINT "_GuideLabels_B_fkey" FOREIGN KEY ("B") REFERENCES "CropGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
