-- Rename Brand.summarize to Brand.description
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Brand'
      AND column_name = 'summarize'
  ) THEN
    ALTER TABLE "Brand" RENAME COLUMN "summarize" TO "description";
  END IF;
END $$;