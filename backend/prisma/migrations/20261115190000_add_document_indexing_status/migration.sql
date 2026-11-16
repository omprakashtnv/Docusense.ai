CREATE TYPE "IndexingStatus" AS ENUM ('NOT_INDEXED', 'INDEXING', 'INDEXED', 'FAILED');

ALTER TABLE "Document"
ADD COLUMN "indexingStatus" "IndexingStatus" NOT NULL DEFAULT 'NOT_INDEXED',
ADD COLUMN "indexingError" TEXT,
ADD COLUMN "indexedAt" TIMESTAMP(3),
ADD COLUMN "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "embeddingModel" TEXT;

CREATE INDEX "Document_indexingStatus_idx" ON "Document"("indexingStatus");
