import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { env } from '../config/env.js';

export interface TextChunkInput {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  tokenCount: number;
}

interface PageSection {
  pageNumber: number | null;
  content: string;
}

function extractPageSections(text: string): PageSection[] {
  const marker = /^\[Page (\d+)\]\s*$/gim;
  const matches = [...text.matchAll(marker)];

  if (matches.length === 0) {
    return [{ pageNumber: null, content: text }];
  }

  const sections: PageSection[] = [];
  const firstMarkerIndex = matches[0]?.index ?? 0;
  const leadingText = text.slice(0, firstMarkerIndex).trim();
  if (leadingText) sections.push({ pageNumber: null, content: leadingText });

  for (const [index, match] of matches.entries()) {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? text.length;
    const content = text.slice(contentStart, contentEnd).trim();

    if (content) {
      sections.push({ pageNumber: Number(match[1]), content });
    }
  }

  return sections;
}

function estimateTokenCount(text: string): number {
  // A lightweight estimate avoids another paid provider request solely for metadata.
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function chunkDocumentText(text: string): Promise<TextChunkInput[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: env.chunkSize,
    chunkOverlap: env.chunkOverlap,
    keepSeparator: true,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });
  const chunks: TextChunkInput[] = [];

  for (const section of extractPageSections(text)) {
    const splitContent = await splitter.splitText(section.content);

    for (const content of splitContent) {
      const normalizedContent = content.trim();
      if (!normalizedContent) continue;

      chunks.push({
        chunkIndex: chunks.length,
        content: normalizedContent,
        pageNumber: section.pageNumber,
        tokenCount: estimateTokenCount(normalizedContent),
      });
    }
  }

  return chunks;
}
