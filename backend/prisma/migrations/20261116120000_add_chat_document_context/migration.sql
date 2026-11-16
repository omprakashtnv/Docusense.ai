-- Persist the document scope chosen for each conversation. An empty array keeps the
-- existing behavior of searching all successfully indexed documents.
ALTER TABLE "ChatSession"
ADD COLUMN "documentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
