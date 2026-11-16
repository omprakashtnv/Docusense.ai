import { Router } from 'express';

import {
  getDocumentById,
  getDocumentChunks,
  getDocumentIntelligenceById,
  getDocuments,
  indexDocumentById,
  removeDocument,
  uploadDocument,
} from '../controllers/document.controller.js';
import { uploadSingleDocument } from '../middleware/document-upload.js';
import { uploadRateLimit } from '../middleware/rate-limits.js';
import { validateUuidParam } from '../middleware/validate-uuid-param.js';

export const documentRouter = Router();

documentRouter.post('/upload', uploadRateLimit, uploadSingleDocument, uploadDocument);
documentRouter.get('/', getDocuments);
documentRouter.use('/:id', validateUuidParam('id'));
documentRouter.post('/:id/index', indexDocumentById);
documentRouter.get('/:id/chunks', getDocumentChunks);
documentRouter.get('/:id/intelligence', getDocumentIntelligenceById);
documentRouter.get('/:id', getDocumentById);
documentRouter.delete('/:id', removeDocument);
