import dotenv from 'dotenv';

dotenv.config();

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 4000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function requireValue(name: string, value: string | undefined): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`${name} is required.`);
  }

  return normalizedValue;
}

function parsePositiveInteger(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function parseNonNegativeInteger(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return parsed;
}

function parseEmbeddingDimensions(value: string | undefined): number {
  const dimensions = parsePositiveInteger('GEMINI_EMBEDDING_DIMENSIONS', value, 1536);

  if (dimensions !== 1536) {
    throw new Error(
      'GEMINI_EMBEDDING_DIMENSIONS must remain 1536 to match DocumentChunk.embedding vector(1536).',
    );
  }

  return dimensions;
}

function parseNumberInRange(
  name: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }

  return parsed;
}

function parseBoolean(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either true or false.`);
}

function parseCorsOrigins(value: string | undefined, nodeEnv: string): string[] {
  const origins = (value ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (origins.length === 0) throw new Error('CORS_ORIGIN must contain at least one origin.');
  if (origins.includes('*')) {
    throw new Error('CORS_ORIGIN cannot use a wildcard. List explicit frontend origins.');
  }
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGIN contains an invalid URL: ${origin}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`CORS_ORIGIN must use http or https: ${origin}`);
    }
  }
  if (
    nodeEnv === 'production' &&
    origins.some((origin) => origin.includes('localhost') || origin.includes('127.0.0.1'))
  ) {
    throw new Error('Production CORS_ORIGIN cannot point to localhost.');
  }

  return [...new Set(origins)];
}

const chunkSize = parsePositiveInteger('CHUNK_SIZE', process.env.CHUNK_SIZE, 1000);
const chunkOverlap = parseNonNegativeInteger('CHUNK_OVERLAP', process.env.CHUNK_OVERLAP, 150);
const searchMaxTopK = parsePositiveInteger('SEARCH_MAX_TOP_K', process.env.SEARCH_MAX_TOP_K, 20);
const searchDefaultTopK = parsePositiveInteger(
  'SEARCH_DEFAULT_TOP_K',
  process.env.SEARCH_DEFAULT_TOP_K,
  5,
);
const nodeEnv = process.env.NODE_ENV ?? 'development';
const uploadDirectory = process.env.UPLOAD_DIR?.trim() || 'uploads';
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN, nodeEnv);
const demoAccessKey = process.env.DEMO_ACCESS_KEY?.trim();

if (chunkOverlap >= chunkSize) {
  throw new Error('CHUNK_OVERLAP must be smaller than CHUNK_SIZE.');
}

if (searchDefaultTopK > searchMaxTopK) {
  throw new Error('SEARCH_DEFAULT_TOP_K must not exceed SEARCH_MAX_TOP_K.');
}

if (nodeEnv === 'production' && !process.env.UPLOAD_DIR?.trim()) {
  throw new Error(
    'UPLOAD_DIR is required in production and must point to a persistent mounted directory.',
  );
}

if (nodeEnv === 'production' && !demoAccessKey) {
  throw new Error('DEMO_ACCESS_KEY is required in production.');
}

export const env = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT),
  corsOrigins,
  trustProxy: parseBoolean('TRUST_PROXY', process.env.TRUST_PROXY, false),
  databaseUrl: requireValue('DATABASE_URL', process.env.DATABASE_URL),
  demoAccessKey,
  uploadDirectory,
  rateLimitWindowMs: parsePositiveInteger(
    'RATE_LIMIT_WINDOW_MS',
    process.env.RATE_LIMIT_WINDOW_MS,
    60_000,
  ),
  rateLimitMax: parsePositiveInteger('RATE_LIMIT_MAX', process.env.RATE_LIMIT_MAX, 120),
  uploadRateLimitMax: parsePositiveInteger(
    'UPLOAD_RATE_LIMIT_MAX',
    process.env.UPLOAD_RATE_LIMIT_MAX,
    10,
  ),
  aiRateLimitMax: parsePositiveInteger('AI_RATE_LIMIT_MAX', process.env.AI_RATE_LIMIT_MAX, 30),
  ocrLanguage: process.env.OCR_LANGUAGE?.trim() || 'eng',
  ocrLanguagePath: process.env.OCR_LANG_PATH?.trim() || undefined,
  ocrMaxPages: parsePositiveInteger('OCR_MAX_PAGES', process.env.OCR_MAX_PAGES, 25),
  chunkSize,
  chunkOverlap,
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001',
  geminiEmbeddingDimensions: parseEmbeddingDimensions(process.env.GEMINI_EMBEDDING_DIMENSIONS),
  geminiGenerationModel: process.env.GEMINI_GENERATION_MODEL?.trim() || 'gemini-3.8-flash',
  geminiGenerationMaxTokens: parsePositiveInteger(
    'GEMINI_GENERATION_MAX_TOKENS',
    process.env.GEMINI_GENERATION_MAX_TOKENS,
    1024,
  ),
  ragMaxContextCharacters: parsePositiveInteger(
    'RAG_MAX_CONTEXT_CHARACTERS',
    process.env.RAG_MAX_CONTEXT_CHARACTERS,
    12_000,
  ),
  ragHistoryMessageLimit: parsePositiveInteger(
    'RAG_HISTORY_MESSAGE_LIMIT',
    process.env.RAG_HISTORY_MESSAGE_LIMIT,
    8,
  ),
  searchDefaultTopK,
  searchMaxTopK,
  searchMinSimilarity: parseNumberInRange(
    'SEARCH_MIN_SIMILARITY',
    process.env.SEARCH_MIN_SIMILARITY,
    0.25,
    -1,
    1,
  ),
});
