import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { connectDatabase, disconnectDatabase, prisma } from '../database/prisma.js';
import { EMBEDDING_DIMENSIONS, setDocumentChunkEmbedding } from '../database/vector.js';
import { answerQuestion } from '../services/chat.service.js';
import type { EmbeddingProvider } from '../services/gemini-embedding.service.js';
import type {
  GroundedAnswerGenerator,
  GroundedGenerationInput,
  GroundedGenerationResult,
} from '../services/gemini-generation.service.js';

const EVALUATION_MODEL = 'synthetic-evaluation-embedding-001';

function normalizedVector(dimensions: number[]): number[] {
  const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  for (const dimension of dimensions) values[dimension] = 1;
  const magnitude = Math.sqrt(dimensions.length);
  return values.map((value) => value / magnitude);
}

function concepts(text: string): number[] {
  const value = text.toLowerCase();
  const dimensions = new Set<number>();
  if (/invoice|bill/.test(value)) dimensions.add(0);
  if (/total|amount|sum|owed|due|pay/.test(value)) dimensions.add(1);
  if (/date|created|issued/.test(value)) dimensions.add(2);
  if (/vendor|seller|northstar/.test(value)) dimensions.add(3);
  if (/contract|agreement/.test(value)) dimensions.add(4);
  if (/terminat|cancel|notice/.test(value)) dimensions.add(5);
  if (/governing|jurisdiction|law|california/.test(value)) dimensions.add(6);
  if (/remote|home/.test(value)) dimensions.add(7);
  if (/days|week|frequency|two/.test(value)) dimensions.add(8);
  if (/approval|manager/.test(value)) dimensions.add(9);
  if (/parking|allowance/.test(value)) dimensions.add(20);
  return [...dimensions];
}

function embed(text: string): number[] {
  const dimensions = concepts(text);
  return normalizedVector(dimensions.length > 0 ? dimensions : [30]);
}

class EvaluationEmbeddingProvider implements EmbeddingProvider {
  readonly model = EVALUATION_MODEL;
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(embed);
  }

  async embedQuery(text: string): Promise<number[]> {
    return embed(text);
  }
}

class EvaluationAnswerGenerator implements GroundedAnswerGenerator {
  readonly model = 'synthetic-evaluation-generation';

  async generateGroundedAnswer(input: GroundedGenerationInput): Promise<GroundedGenerationResult> {
    const question = input.question.toLowerCase();
    if (/total|sum|owed/.test(question)) {
      return {
        answer: 'The invoice total is USD 1,250.50.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/invoice.*date|date.*invoice|bill.*created/.test(question)) {
      return {
        answer: 'The invoice date is 15 January 2026.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/vendor|seller/.test(question)) {
      return {
        answer: 'The vendor is Northstar Supplies.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/terminat|cancel|notice/.test(question)) {
      return {
        answer: 'The agreement requires 30 days written notice for termination.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/governing|jurisdiction|law/.test(question)) {
      return {
        answer: 'The contract is governed by California law.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/approval|approve|manager/.test(question)) {
      return {
        answer: 'Remote work requires manager approval.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    if (/remote.*days|days.*remote|work from home/.test(question)) {
      return {
        answer: 'Employees may work remotely two days per week.',
        sourceReferences: [1],
        sufficientEvidence: true,
      };
    }
    return {
      answer: 'The context is insufficient.',
      sourceReferences: [],
      sufficientEvidence: false,
    };
  }
}

interface EvaluationCase {
  id: string;
  question: string;
  expectedDocument: 'invoice' | 'contract' | 'policy' | null;
  expectedAnswer: string;
  expectedEvidence: string | null;
  paraphrase: boolean;
}

const cases: EvaluationCase[] = [
  {
    id: 'invoice-total-exact',
    question: 'What is the invoice total amount?',
    expectedDocument: 'invoice',
    expectedAnswer: 'USD 1,250.50',
    expectedEvidence: 'USD 1,250.50',
    paraphrase: false,
  },
  {
    id: 'invoice-total-paraphrase',
    question: 'How much is owed on the bill?',
    expectedDocument: 'invoice',
    expectedAnswer: 'USD 1,250.50',
    expectedEvidence: 'USD 1,250.50',
    paraphrase: true,
  },
  {
    id: 'invoice-date',
    question: 'What date was the invoice issued?',
    expectedDocument: 'invoice',
    expectedAnswer: '15 January 2026',
    expectedEvidence: '15 January 2026',
    paraphrase: false,
  },
  {
    id: 'invoice-vendor',
    question: 'Who is the seller on the invoice?',
    expectedDocument: 'invoice',
    expectedAnswer: 'Northstar Supplies',
    expectedEvidence: 'Northstar Supplies',
    paraphrase: true,
  },
  {
    id: 'contract-termination',
    question: 'What is the contract termination notice?',
    expectedDocument: 'contract',
    expectedAnswer: '30 days written notice',
    expectedEvidence: '30 days written notice',
    paraphrase: false,
  },
  {
    id: 'contract-cancel-paraphrase',
    question: 'How can either party cancel the agreement?',
    expectedDocument: 'contract',
    expectedAnswer: '30 days written notice',
    expectedEvidence: '30 days written notice',
    paraphrase: true,
  },
  {
    id: 'contract-law',
    question: 'Which law governs the contract?',
    expectedDocument: 'contract',
    expectedAnswer: 'California law',
    expectedEvidence: 'California law',
    paraphrase: false,
  },
  {
    id: 'remote-days',
    question: 'How many days per week may employees work remotely?',
    expectedDocument: 'policy',
    expectedAnswer: 'two days per week',
    expectedEvidence: 'two days per week',
    paraphrase: false,
  },
  {
    id: 'remote-approval',
    question: 'Who must approve work from home?',
    expectedDocument: 'policy',
    expectedAnswer: 'manager approval',
    expectedEvidence: 'manager approval',
    paraphrase: true,
  },
  {
    id: 'unavailable-parking',
    question: 'What parking allowance is provided?',
    expectedDocument: null,
    expectedAnswer: 'could not find enough evidence',
    expectedEvidence: null,
    paraphrase: false,
  },
];

async function runEvaluation(): Promise<void> {
  const documentIds = { invoice: randomUUID(), contract: randomUUID(), policy: randomUUID() };
  const sessionIds: string[] = [];
  const documents = [
    {
      key: 'invoice' as const,
      id: documentIds.invoice,
      name: 'synthetic-invoice.pdf',
      type: 'INVOICE',
      content:
        'Invoice INV-2026-10. Vendor: Northstar Supplies. Invoice date: 15 January 2026. Total amount due: USD 1,250.50.',
    },
    {
      key: 'contract' as const,
      id: documentIds.contract,
      name: 'synthetic-contract.pdf',
      type: 'CONTRACT',
      content:
        'This agreement may be terminated by either party with 30 days written notice. The contract is governed by California law.',
    },
    {
      key: 'policy' as const,
      id: documentIds.policy,
      name: 'synthetic-remote-policy.pdf',
      type: 'GENERAL',
      content:
        'Employees may work remotely two days per week. Remote work requires manager approval.',
    },
  ];
  const provider = new EvaluationEmbeddingProvider();
  const generator = new EvaluationAnswerGenerator();

  await connectDatabase();
  try {
    for (const document of documents) {
      const chunkId = randomUUID();
      await prisma.document.create({
        data: {
          id: document.id,
          originalName: document.name,
          storedName: `rag-evaluation-${document.id}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 256n,
          filePath: `/tmp/rag-evaluation-${document.id}.pdf`,
          extractedText: document.content,
          cleanedText: document.content,
          documentType: document.type,
          processingStatus: 'COMPLETED',
          indexingStatus: 'INDEXED',
          indexedAt: new Date(),
          chunkCount: 1,
          embeddingModel: EVALUATION_MODEL,
          chunks: {
            create: {
              id: chunkId,
              content: document.content,
              chunkIndex: 0,
              pageNumber: 1,
              tokenCount: Math.ceil(document.content.length / 4),
            },
          },
        },
      });
      await setDocumentChunkEmbedding(chunkId, embed(document.content));
    }

    const results = [];
    for (const evaluationCase of cases) {
      const answer = await answerQuestion(
        { question: evaluationCase.question, topK: 3 },
        { answerGenerator: generator, searchDependencies: { embeddingProvider: provider } },
      );
      sessionIds.push(answer.sessionId);
      const expectedDocumentId = evaluationCase.expectedDocument
        ? documentIds[evaluationCase.expectedDocument]
        : null;
      const retrievalRelevant = expectedDocumentId
        ? answer.citations[0]?.documentId === expectedDocumentId
        : answer.citations.length === 0;
      const answerSupported = answer.answer
        .toLowerCase()
        .includes(evaluationCase.expectedAnswer.toLowerCase());
      const citationCorrect = evaluationCase.expectedEvidence
        ? answer.citations.some((citation) =>
            citation.sourceText
              .toLowerCase()
              .includes(evaluationCase.expectedEvidence!.toLowerCase()),
          )
        : answer.citations.length === 0;
      const refusalCorrect =
        expectedDocumentId !== null ||
        (!answer.sufficientEvidence && answer.citations.length === 0);
      results.push({
        id: evaluationCase.id,
        paraphrase: evaluationCase.paraphrase,
        retrievalRelevant,
        answerSupported,
        citationCorrect,
        refusalCorrect,
        passed: retrievalRelevant && answerSupported && citationCorrect && refusalCorrect,
      });
    }

    const summary = {
      dataset: 'synthetic, non-confidential',
      mockGemini: true,
      totalCases: results.length,
      passedCases: results.filter(({ passed }) => passed).length,
      retrievalRelevant: results.filter((result) => result.retrievalRelevant).length,
      answersSupported: results.filter((result) => result.answerSupported).length,
      citationsCorrect: results.filter((result) => result.citationCorrect).length,
      refusalsCorrect: results.filter((result) => result.refusalCorrect).length,
      paraphraseCases: results.filter(({ paraphrase }) => paraphrase).length,
      results,
    };
    console.log(JSON.stringify(summary, null, 2));
    assert.equal(summary.passedCases, cases.length);
  } finally {
    await prisma.chatSession.deleteMany({ where: { id: { in: sessionIds } } });
    await prisma.document.deleteMany({ where: { id: { in: Object.values(documentIds) } } });
    await disconnectDatabase();
  }
}

runEvaluation().catch((error: unknown) => {
  console.error('RAG evaluation failed.', error);
  process.exitCode = 1;
});
