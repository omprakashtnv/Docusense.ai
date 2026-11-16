import type { ClassificationResult, DocumentCategory } from '../types/document-intelligence.js';

interface WeightedSignal {
  label: string;
  pattern: RegExp;
  weight: number;
}

const rules: Record<Exclude<DocumentCategory, 'GENERAL'>, WeightedSignal[]> = {
  INVOICE: [
    { label: 'invoice', pattern: /\binvoice\b/i, weight: 3 },
    { label: 'invoice number', pattern: /\binvoice\s*(?:number|no\.?|#)/i, weight: 2 },
    { label: 'bill to', pattern: /\bbill\s+to\b/i, weight: 2 },
    { label: 'subtotal', pattern: /\bsubtotal\b/i, weight: 2 },
    { label: 'tax', pattern: /\b(?:tax|vat|gst)\b/i, weight: 1 },
    { label: 'amount due', pattern: /\b(?:amount|balance)\s+due\b/i, weight: 2 },
  ],
  CONTRACT: [
    { label: 'agreement', pattern: /\b(?:agreement|contract)\b/i, weight: 3 },
    { label: 'parties', pattern: /\b(?:party|parties)\b/i, weight: 1 },
    { label: 'terms', pattern: /\bterms\s+(?:and|of)\b/i, weight: 2 },
    { label: 'governing law', pattern: /\bgoverning\s+law\b/i, weight: 2 },
    { label: 'effective date', pattern: /\beffective\s+date\b/i, weight: 2 },
    { label: 'signature', pattern: /\b(?:signed|signature)\b/i, weight: 1 },
  ],
  IDENTITY_DOCUMENT: [
    { label: 'passport', pattern: /\bpassport\b/i, weight: 3 },
    { label: 'driver license', pattern: /\bdriv(?:er|ing)(?:'s)?\s+licen[cs]e\b/i, weight: 3 },
    {
      label: 'national identity',
      pattern: /\b(?:national|identity)\s+(?:id|card|document)\b/i,
      weight: 3,
    },
    { label: 'aadhaar', pattern: /\baadhaar\b/i, weight: 3 },
    { label: 'date of birth', pattern: /\bdate\s+of\s+birth\b/i, weight: 2 },
    { label: 'nationality', pattern: /\bnationality\b/i, weight: 1 },
  ],
  RESUME: [
    { label: 'resume', pattern: /\b(?:resume|résumé|curriculum\s+vitae)\b/i, weight: 3 },
    { label: 'work experience', pattern: /\b(?:work|professional)\s+experience\b/i, weight: 2 },
    { label: 'education', pattern: /\beducation\b/i, weight: 1 },
    { label: 'skills', pattern: /\b(?:technical\s+)?skills\b/i, weight: 1 },
    { label: 'employment', pattern: /\bemployment(?:\s+history)?\b/i, weight: 2 },
    { label: 'professional summary', pattern: /\bprofessional\s+summary\b/i, weight: 2 },
  ],
};

export function classifyDocument(text: string): ClassificationResult {
  const candidates = Object.entries(rules).map(([documentType, signals]) => {
    const matchedSignals = signals.filter(({ pattern }) => pattern.test(text));
    const score = matchedSignals.reduce((total, signal) => total + signal.weight, 0);
    const maximum = signals.reduce((total, signal) => total + signal.weight, 0);

    return {
      documentType: documentType as Exclude<DocumentCategory, 'GENERAL'>,
      score,
      confidence: maximum === 0 ? 0 : score / maximum,
      matchedSignals: matchedSignals.map(({ label }) => label),
    };
  });

  const best = candidates.sort((left, right) => right.score - left.score)[0];

  if (!best || best.score < 4) {
    return { documentType: 'GENERAL', confidence: 1, matchedSignals: [] };
  }

  return {
    documentType: best.documentType,
    confidence: Number(best.confidence.toFixed(2)),
    matchedSignals: best.matchedSignals,
  };
}
