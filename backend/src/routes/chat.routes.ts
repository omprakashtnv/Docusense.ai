import { Router } from 'express';

import {
  createChatAnswer,
  getChatSessionById,
  getChatSessions,
  removeChatSession,
} from '../controllers/chat.controller.js';
import { validateUuidParam } from '../middleware/validate-uuid-param.js';
import { aiRateLimit } from '../middleware/rate-limits.js';

export const chatRouter = Router();

chatRouter.post('/', aiRateLimit, createChatAnswer);
chatRouter.get('/sessions', getChatSessions);
chatRouter.use('/sessions/:id', validateUuidParam('id'));
chatRouter.get('/sessions/:id', getChatSessionById);
chatRouter.delete('/sessions/:id', removeChatSession);
