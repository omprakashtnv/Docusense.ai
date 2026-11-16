import type { DocumentCategory, StructuredDocumentData } from '../types/document-intelligence.js';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledValue(text: string, labels: string[]): string | null {
  const lines = text.split('\n');
  const labelPattern = labels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`^\\s*(?:${labelPattern})\\s*[:#-]?\\s*(.*?)\\s*$`, 'i');

  for (const [index, line] of lines.entries()) {
    const match = line.match(pattern);
    if (!match) continue;

    const sameLineValue = match[1]?.trim();
    if (sameLineValue) return sameLineValue;

    const nextValue = lines.slice(index + 1).find((candidate) => candidate.trim());
    if (nextValue) return nextValue.trim();
  }

  return null;
}

function extractAmount(
  text: string,
  labels: string[],
): { amount: number | null; source: string | null } {
  const value = extractLabeledValue(text, labels);
  if (!value) return { amount: null, source: null };

  const match = value.match(
    /(?:USD|EUR|GBP|INR|CAD|AUD|[$€£₹])?\s*\(?(-?[\d,]+(?:\.\d{1,2})?)\)?/i,
  );
  if (!match?.[1]) return { amount: null, source: value };

  const amount = Number(match[1].replaceAll(',', ''));
  return { amount: Number.isFinite(amount) ? amount : null, source: value };
}

function detectCurrency(text: string): string | null {
  const isoCode = text.match(/\b(USD|EUR|GBP|INR|CAD|AUD)\b/i)?.[1];
  if (isoCode) return isoCode.toUpperCase();
  if (text.includes('₹')) return 'INR';
  if (text.includes('€')) return 'EUR';
  if (text.includes('£')) return 'GBP';
  if (text.includes('$')) return 'USD';
  return null;
}

function extractInvoice(text: string): StructuredDocumentData {
  const subtotal = extractAmount(text, ['subtotal']);
  const tax = extractAmount(text, ['tax', 'tax amount', 'vat', 'gst']);
  const total = extractAmount(text, ['total', 'total amount', 'amount due', 'balance due']);
  const currencySource = [subtotal.source, tax.source, total.source, text]
    .filter(Boolean)
    .join(' ');

  return {
    type: 'INVOICE',
    invoiceNumber: extractLabeledValue(text, [
      'invoice number',
      'invoice no.',
      'invoice no',
      'invoice #',
    ]),
    invoiceDate: extractLabeledValue(text, ['invoice date', 'date']),
    vendorName: extractLabeledValue(text, ['vendor', 'seller', 'from']),
    customerName: extractLabeledValue(text, ['customer', 'bill to', 'billed to']),
    subtotal: subtotal.amount,
    taxAmount: tax.amount,
    totalAmount: total.amount,
    currency: detectCurrency(currencySource),
  };
}

function extractResume(text: string): StructuredDocumentData {
  return {
    type: 'RESUME',
    name: extractLabeledValue(text, ['name', 'candidate']),
    email: text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0] ?? null,
    phone:
      text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}/)?.[0] ??
      null,
  };
}

function extractContract(text: string): StructuredDocumentData {
  const parties = text.match(/\bbetween\s+(.+?)\s+and\s+(.+?)(?:\.|,|\n|$)/i);

  return {
    type: 'CONTRACT',
    effectiveDate: extractLabeledValue(text, ['effective date', 'commencement date']),
    firstParty: parties?.[1]?.trim() ?? null,
    secondParty: parties?.[2]?.trim() ?? null,
  };
}

function extractIdentityDocument(text: string): StructuredDocumentData {
  return {
    type: 'IDENTITY_DOCUMENT',
    fullName: extractLabeledValue(text, ['full name', 'name']),
    documentNumber: extractLabeledValue(text, [
      'document number',
      'passport number',
      'passport no.',
      'id number',
      'license number',
    ]),
    dateOfBirth: extractLabeledValue(text, ['date of birth', 'dob']),
    nationality: extractLabeledValue(text, ['nationality']),
  };
}

export function extractStructuredData(
  documentType: DocumentCategory,
  text: string,
): StructuredDocumentData {
  switch (documentType) {
    case 'INVOICE':
      return extractInvoice(text);
    case 'RESUME':
      return extractResume(text);
    case 'CONTRACT':
      return extractContract(text);
    case 'IDENTITY_DOCUMENT':
      return extractIdentityDocument(text);
    case 'GENERAL':
      return { type: 'GENERAL' };
  }
}
