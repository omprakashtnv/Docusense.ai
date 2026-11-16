import { checkDatabaseConnection } from '../database/prisma.js';
import type { DatabaseHealthStatus, HealthStatus } from '../types/health.js';

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    service: 'docusense-ai-api',
    timestamp: new Date().toISOString(),
  };
}

export async function getDatabaseHealthStatus(): Promise<DatabaseHealthStatus> {
  const connected = await checkDatabaseConnection();

  return {
    status: connected ? 'ok' : 'error',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
}
