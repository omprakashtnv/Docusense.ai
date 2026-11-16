import type { Request, Response } from 'express';

import { env } from '../config/env.js';

export function getPublicMeta(_request: Request, response: Response): void {
  response.status(200).json({
    application: {
      name: 'DocuSense AI',
      version: process.env.npm_package_version ?? '0.1.0',
    },
    ai: {
      provider: 'Google Gemini',
      embeddingModel: env.geminiEmbeddingModel,
      embeddingDimensions: env.geminiEmbeddingDimensions,
      generationModel: env.geminiGenerationModel,
    },
  });
}
