export interface ChatCitation {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  pageNumber: number | null;
  sourceText: string;
}

export interface ChatRequest {
  question: string;
  sessionId?: string | null;
  topK?: number;
  documentIds?: string[];
}

export interface ChatAnswerResponse {
  sessionId: string;
  answer: string;
  sufficientEvidence: boolean;
  citations: ChatCitation[];
}

export interface ChatMessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations: ChatCitation[];
  sufficientEvidence: boolean | null;
  createdAt: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  documentIds: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  messages: ChatMessageResponse[];
}
