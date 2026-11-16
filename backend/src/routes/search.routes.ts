import { Router } from 'express';

import { searchDocuments } from '../controllers/search.controller.js';

export const searchRouter = Router();

searchRouter.post('/', searchDocuments);
