export interface ChatCitation {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  pageNumber: number | null;
  sourceText: string;
}

export interface ChatMessage {
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
  messages: ChatMessage[];
}

export interface ChatAnswer {
  sessionId: string;
  answer: string;
  sufficientEvidence: boolean;
  citations: ChatCitation[];
}
