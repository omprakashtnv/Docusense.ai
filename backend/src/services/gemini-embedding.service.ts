import { GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';

const EMBEDDING_BATCH_SIZE = 16;
const MAX_ATTEMPTS = 3;

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export class EmbeddingConfigurationError extends Error {
  constructor() {
    super('Gemini embeddings are not configured. Set GEMINI_API_KEY on the backend.');
    this.name = 'EmbeddingConfigurationError';
  }
}

export class EmbeddingGenerationError extends Error {
  constructor(message = 'Gemini could not generate document embeddings. Try again later.') {
    super(message);
    this.name = 'EmbeddingGenerationError';
  }
}

function normalizeEmbedding(values: number[], dimensions: number): number[] {
  if (values.length !== dimensions) {
    throw new EmbeddingGenerationError(
      `Gemini returned ${values.length} dimensions; ${dimensions} were required.`,
    );
  }

  if (values.some((value) => !Number.isFinite(value))) {
    throw new EmbeddingGenerationError('Gemini returned an invalid embedding value.');
  }

  // gemini-embedding-001 requires manual normalization when using fewer than 3072 dimensions.
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new EmbeddingGenerationError('Gemini returned an empty embedding vector.');
  }

  return values.map((value) => value / magnitude);
}

function isRetryableProviderError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: number | string; message?: string };
  const status = Number(candidate.status ?? candidate.code);
  const message = candidate.message?.toUpperCase() ?? '';

  return (
    status === 429 ||
    status >= 500 ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('UNAVAILABLE') ||
    message.includes('RATE LIMIT') ||
    message.includes('TIMEOUT')
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class GeminiEmbeddingService implements EmbeddingProvider {
  readonly model = env.geminiEmbeddingModel;
  readonly dimensions = env.geminiEmbeddingDimensions;
  private readonly client: GoogleGenAI;

  constructor(apiKey = env.geminiApiKey) {
    if (!apiKey) throw new EmbeddingConfigurationError();
    this.client = new GoogleGenAI({ apiKey });
  }

  private async embedBatch(
    texts: string[],
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<number[][]> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.client.models.embedContent({
          model: this.model,
          contents: texts,
          config: {
            outputDimensionality: this.dimensions,
            taskType,
            abortSignal: AbortSignal.timeout(30_000),
          },
        });
        const embeddings = response.embeddings ?? [];

        if (embeddings.length !== texts.length) {
          throw new EmbeddingGenerationError(
            `Gemini returned ${embeddings.length} embeddings for ${texts.length} chunks.`,
          );
        }

        return embeddings.map((embedding) =>
          normalizeEmbedding(embedding.values ?? [], this.dimensions),
        );
      } catch (error) {
        if (error instanceof EmbeddingGenerationError) throw error;
        if (!isRetryableProviderError(error) || attempt === MAX_ATTEMPTS) {
          throw new EmbeddingGenerationError();
        }

        await wait(500 * 2 ** (attempt - 1));
      }
    }

    throw new EmbeddingGenerationError();
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const embeddings: number[][] = [];

    for (let offset = 0; offset < texts.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      embeddings.push(...(await this.embedBatch(batch, 'RETRIEVAL_DOCUMENT')));
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.embedBatch([text], 'RETRIEVAL_QUERY');
    const embedding = embeddings[0];

    if (!embedding) {
      throw new EmbeddingGenerationError('Gemini did not return a query embedding.');
    }

    return embedding;
  }
}
