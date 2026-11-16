export class InvalidExtractedTextError extends Error {
  constructor() {
    super('No meaningful text could be extracted from the document.');
    this.name = 'InvalidExtractedTextError';
  }
}

function removeControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      if (character === '\n' || character === '\t') return true;
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && !(codePoint >= 127 && codePoint <= 159);
    })
    .join('');
}

export function getTextMetrics(text: string): { meaningfulCharacters: number; words: number } {
  return {
    meaningfulCharacters: text.match(/[\p{L}\p{N}]/gu)?.length ?? 0,
    words: text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0,
  };
}

export function shouldUseOcr(text: string): boolean {
  const textWithoutPageMarkers = text.replace(/^\[Page \d+\]\s*$/gim, '');
  const { meaningfulCharacters, words } = getTextMetrics(textWithoutPageMarkers);
  return meaningfulCharacters < 40 && words < 8;
}

export function cleanExtractedText(text: string): string {
  if (typeof text !== 'string') {
    throw new InvalidExtractedTextError();
  }

  const normalized = removeControlCharacters(
    text
      .normalize('NFKC')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u00a0\u2007\u202f]/g, ' '),
  );

  const cleaned = normalized
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, '\n\n')
    .trim();

  if (getTextMetrics(cleaned).meaningfulCharacters < 2) {
    throw new InvalidExtractedTextError();
  }

  return cleaned;
}
