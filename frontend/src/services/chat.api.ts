import { apiRequest } from './api-client';
import type { ChatAnswer, ChatSessionDetail, ChatSessionSummary } from '../types/chat';

export async function askQuestion(
  question: string,
  sessionId: string | null,
  documentIds: string[],
): Promise<ChatAnswer> {
  return apiRequest<ChatAnswer>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId, documentIds }),
  });
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const response = await apiRequest<{ sessions: ChatSessionSummary[] }>('/chat/sessions');
  return response.sessions;
}

export async function getChatSession(id: string): Promise<ChatSessionDetail> {
  const response = await apiRequest<{ session: ChatSessionDetail }>(`/chat/sessions/${id}`);
  return response.session;
}

export async function deleteChatSession(id: string): Promise<void> {
  await apiRequest<null>(`/chat/sessions/${id}`, { method: 'DELETE' });
}
