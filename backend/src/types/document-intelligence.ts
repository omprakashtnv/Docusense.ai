export const documentCategories = [
  'INVOICE',
  'CONTRACT',
  'IDENTITY_DOCUMENT',
  'RESUME',
  'GENERAL',
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export interface ClassificationResult {
  documentType: DocumentCategory;
  confidence: number;
  matchedSignals: string[];
}

export type StructuredDocumentData = Record<string, string | number | null> & {
  type: DocumentCategory;
};
