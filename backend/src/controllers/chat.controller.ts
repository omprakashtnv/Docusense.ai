import type { NextFunction, Request, Response } from 'express';

import {
  answerQuestion,
  deleteChatSession,
  getChatSession,
  listChatSessions,
} from '../services/chat.service.js';

export async function createChatAnswer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json(await answerQuestion(request.body));
  } catch (error) {
    next(error);
  }
}

export async function getChatSessions(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ sessions: await listChatSessions() });
  } catch (error) {
    next(error);
  }
}

export async function getChatSessionById(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ session: await getChatSession(request.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function removeChatSession(
  request: Request<{ id: string }>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteChatSession(request.params.id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
