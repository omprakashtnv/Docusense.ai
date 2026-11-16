import { apiRequest } from './api-client';
import type { PublicMeta } from '../types/meta';

export function getPublicMeta(): Promise<PublicMeta> {
  return apiRequest<PublicMeta>('/meta');
}
