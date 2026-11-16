ALTER TABLE "ChatMessage"
ADD COLUMN "citations" JSONB,
ADD COLUMN "sufficientEvidence" BOOLEAN;
