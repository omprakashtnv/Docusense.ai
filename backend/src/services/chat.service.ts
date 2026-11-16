import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ChatRole } from '../generated/prisma/enums.js';
import type {
  ChatAnswerResponse,
  ChatCitation,
  ChatMessageResponse,
  ChatRequest,
  ChatSessionDetail,
  ChatSessionSummary,
} from '../types/chat.js';
import type { SemanticSearchResult } from '../types/search.js';
import { HttpError } from '../utils/http-error.js';
import {
  GeminiGenerationConfigurationError,
  GeminiGenerationError,
  GeminiGenerationService,
  type ConversationHistoryItem,
  type GroundedAnswerGenerator,
} from './gemini-generation.service.js';
import { semanticSearch, type SemanticSearchDependencies } from './semantic-search.service.js';

const MAX_QUESTION_LENGTH = 2_000;
const MAX_CHAT_DOCUMENTS = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NO_EVIDENCE_ANSWER =
  'I could not find enough evidence in the indexed documents to answer that question.';

export interface RagDependencies {
  answerGenerator?: GroundedAnswerGenerator;
  searchDependencies?: SemanticSearchDependencies;
}

interface NormalizedChatRequest {
  question: string;
  sessionId: string | null;
  topK: number;
  documentIds: string[] | null;
}

interface PreparedSource {
  result: SemanticSearchResult;
  sourceText: string;
}

function normalizeChatRequest(input: unknown): NormalizedChatRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'A JSON request body is required.');
  }

  const request = input as Partial<ChatRequest> & Record<string, unknown>;
  if (typeof request.question !== 'string' || !request.question.trim()) {
    throw new HttpError(400, 'Question must be a non-empty string.');
  }
  const question = request.question.trim();
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new HttpError(400, `Question must not exceed ${MAX_QUESTION_LENGTH} characters.`);
  }

  let sessionId: string | null = null;
  if (request.sessionId !== undefined && request.sessionId !== null) {
    if (typeof request.sessionId !== 'string' || !request.sessionId.trim()) {
      throw new HttpError(400, 'sessionId must be null or a non-empty string.');
    }
    sessionId = request.sessionId.trim();
  }

  const topK = request.topK ?? env.searchDefaultTopK;
  if (!Number.isInteger(topK) || topK < 1 || topK > env.searchMaxTopK) {
    throw new HttpError(400, `topK must be an integer between 1 and ${env.searchMaxTopK}.`);
  }

  let documentIds: string[] | null = null;
  if (request.documentIds !== undefined) {
    if (!Array.isArray(request.documentIds)) {
      throw new HttpError(400, 'documentIds must be an array of document IDs.');
    }
    if (request.documentIds.length > MAX_CHAT_DOCUMENTS) {
      throw new HttpError(400, `A chat can use at most ${MAX_CHAT_DOCUMENTS} documents.`);
    }
    if (
      request.documentIds.some(
        (documentId) => typeof documentId !== 'string' || !UUID_PATTERN.test(documentId),
      )
    ) {
      throw new HttpError(400, 'Each documentIds value must be a valid document ID.');
    }
    documentIds = [...new Set(request.documentIds)];
  }

  return { question, sessionId, topK, documentIds };
}

function prepareContext(results: SemanticSearchResult[]): PreparedSource[] {
  const sources: PreparedSource[] = [];
  const seenContent = new Set<string>();
  let usedCharacters = 0;

  for (const result of results) {
    const deduplicationKey = result.content.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!deduplicationKey || seenContent.has(deduplicationKey)) continue;

    const metadataLength = 240;
    const remaining = env.ragMaxContextCharacters - usedCharacters - metadataLength;
    if (remaining <= 0) break;

    const sourceText = result.content.slice(0, remaining).trim();
    if (!sourceText) break;

    sources.push({ result, sourceText });
    seenContent.add(deduplicationKey);
    usedCharacters += sourceText.length + metadataLength;
  }

  return sources;
}

function formatContext(sources: PreparedSource[]): string {
  return sources
    .map(
      ({ result, sourceText }, index) =>
        `SOURCE ${index + 1}\nDocument ID: ${result.documentId}\nDocument name: ${result.documentName}\nChunk ID: ${result.chunkId}\nChunk index: ${result.chunkIndex}\nPage: ${result.pageNumber ?? 'unknown'}\n<document_content>\n${sourceText}\n</document_content>`,
    )
    .join('\n\n');
}

function toCitation(source: PreparedSource): ChatCitation {
  return {
    documentId: source.result.documentId,
    documentName: source.result.documentName,
    chunkId: source.result.chunkId,
    chunkIndex: source.result.chunkIndex,
    pageNumber: source.result.pageNumber,
    sourceText: source.sourceText,
  };
}

function isChatCitation(value: unknown): value is ChatCitation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const citation = value as Record<string, unknown>;
  return (
    typeof citation.documentId === 'string' &&
    typeof citation.documentName === 'string' &&
    typeof citation.chunkId === 'string' &&
    Number.isInteger(citation.chunkIndex) &&
    (citation.pageNumber === null || Number.isInteger(citation.pageNumber)) &&
    typeof citation.sourceText === 'string'
  );
}

function parseStoredCitations(value: unknown): ChatCitation[] {
  return Array.isArray(value) ? value.filter(isChatCitation) : [];
}

function toMessageResponse(message: {
  id: string;
  role: ChatRole;
  content: string;
  citations: unknown;
  sufficientEvidence: boolean | null;
  createdAt: Date;
}): ChatMessageResponse {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: parseStoredCitations(message.citations),
    sufficientEvidence: message.sufficientEvidence,
    createdAt: message.createdAt.toISOString(),
  };
}

function makeSessionTitle(question: string): string {
  return question.length <= 80 ? question : `${question.slice(0, 77).trimEnd()}…`;
}

export async function answerQuestion(
  input: unknown,
  dependencies: RagDependencies = {},
): Promise<ChatAnswerResponse> {
  const request = normalizeChatRequest(input);
  const existingSession = request.sessionId
    ? await prisma.chatSession.findUnique({
        where: { id: request.sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: env.ragHistoryMessageLimit,
            select: { role: true, content: true },
          },
        },
      })
    : null;

  if (request.sessionId && !existingSession) throw new HttpError(404, 'Chat session not found.');

  // An omitted filter continues the saved conversation context. An empty array means all
  // indexed documents, while a non-empty array scopes retrieval to those exact files.
  const documentIds = request.documentIds ?? existingSession?.documentIds ?? [];
  if (documentIds.length > 0) {
    const indexedDocumentCount = await prisma.document.count({
      where: { id: { in: documentIds }, indexingStatus: 'INDEXED' },
    });
    if (indexedDocumentCount !== documentIds.length) {
      throw new HttpError(400, 'Every selected document must exist and be successfully indexed.');
    }
  }

  const search = await semanticSearch(
    { query: request.question, topK: request.topK, documentIds },
    dependencies.searchDependencies,
  );
  const sources = prepareContext(search.results);
  const history: ConversationHistoryItem[] = (existingSession?.messages ?? [])
    .reverse()
    .map((message) => ({ role: message.role, content: message.content }));

  let answer = NO_EVIDENCE_ANSWER;
  let sufficientEvidence = false;
  let citations: ChatCitation[] = [];

  if (sources.length > 0) {
    let generation;
    try {
      const generator = dependencies.answerGenerator ?? new GeminiGenerationService();
      generation = await generator.generateGroundedAnswer({
        question: request.question,
        context: formatContext(sources),
        history,
      });
    } catch (error) {
      if (error instanceof GeminiGenerationConfigurationError) {
        throw new HttpError(503, error.message);
      }
      if (error instanceof GeminiGenerationError) throw new HttpError(502, error.message);
      throw new HttpError(502, 'Gemini could not generate a grounded answer. Try again later.');
    }

    const references = [
      ...new Set(
        generation.sourceReferences.filter(
          (reference) =>
            Number.isInteger(reference) && reference >= 1 && reference <= sources.length,
        ),
      ),
    ];
    citations = references.map((reference) => toCitation(sources[reference - 1]!));
    sufficientEvidence = generation.sufficientEvidence && citations.length > 0;
    answer = sufficientEvidence ? generation.answer : NO_EVIDENCE_ANSWER;
  }

  try {
    const sessionId = await prisma.$transaction(async (transaction) => {
      const session = existingSession
        ? existingSession
        : await transaction.chatSession.create({
            data: { title: makeSessionTitle(request.question), documentIds },
          });

      if (existingSession && request.documentIds !== null) {
        await transaction.chatSession.update({
          where: { id: session.id },
          data: { documentIds },
        });
      }

      await transaction.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'USER',
          content: request.question,
        },
      });
      await transaction.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: answer,
          citations: citations as unknown as Prisma.InputJsonValue,
          sufficientEvidence,
        },
      });
      await transaction.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      return session.id;
    });

    return { sessionId, answer, sufficientEvidence, citations };
  } catch {
    throw new HttpError(500, 'The chat response could not be saved.');
  }
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    documentIds: session.documentIds,
    messageCount: session._count.messages,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }));
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) throw new HttpError(404, 'Chat session not found.');

  return {
    id: session.id,
    title: session.title,
    documentIds: session.documentIds,
    messageCount: session.messages.length,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.map(toMessageResponse),
  };
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const deleted = await prisma.chatSession.deleteMany({ where: { id: sessionId } });
  if (deleted.count === 0) throw new HttpError(404, 'Chat session not found.');
}
