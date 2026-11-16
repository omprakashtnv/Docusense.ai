import type { Request, Response } from 'express';

import { getDatabaseHealthStatus, getHealthStatus } from '../services/health.service.js';

export function getHealth(_request: Request, response: Response): void {
  response.status(200).json(getHealthStatus());
}

export async function getDatabaseHealth(_request: Request, response: Response): Promise<void> {
  const health = await getDatabaseHealthStatus();
  response.status(health.status === 'ok' ? 200 : 503).json(health);
}
