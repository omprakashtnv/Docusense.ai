import { apiRequest } from './api-client';
import type { SemanticSearchRequest, SemanticSearchResponse } from '../types/search';

export async function searchDocuments(
  request: SemanticSearchRequest,
): Promise<SemanticSearchResponse> {
  return apiRequest<SemanticSearchResponse>('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}
