-- Replace PENDING with UPLOADED without losing existing document records.
CREATE TYPE "ProcessingStatus_new" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Document" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "Document"
ALTER COLUMN "processingStatus" TYPE "ProcessingStatus_new"
USING (
  CASE
    WHEN "processingStatus"::text = 'PENDING' THEN 'UPLOADED'
    ELSE "processingStatus"::text
  END
)::"ProcessingStatus_new";

ALTER TYPE "ProcessingStatus" RENAME TO "ProcessingStatus_old";
ALTER TYPE "ProcessingStatus_new" RENAME TO "ProcessingStatus";
DROP TYPE "ProcessingStatus_old";

ALTER TABLE "Document" ALTER COLUMN "processingStatus" SET DEFAULT 'UPLOADED';
