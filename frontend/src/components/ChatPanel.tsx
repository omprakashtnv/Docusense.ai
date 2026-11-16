import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import {
  askQuestion,
  deleteChatSession,
  getChatSession,
  listChatSessions,
} from '../services/chat.api';
import type { DocumentIndexingResult, DocumentSummary } from '../types/document';
import type { ChatMessage, ChatSessionSummary } from '../types/chat';
import { formatDate } from '../utils/format';
import { ChatDocumentContext } from './ChatDocumentContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Icon } from './ui/Icon';
import { MarkdownText } from './ui/MarkdownText';
import { PageHeader } from './ui/PageHeader';

interface ChatPanelProps {
  documents: DocumentSummary[];
  uploading: boolean;
  uploadProgress: number;
  indexingId: string | null;
  onUploadAndIndex: (file: File) => Promise<string | null>;
  onIndexDocument: (
    document: Pick<DocumentSummary, 'id' | 'originalName'>,
  ) => Promise<DocumentIndexingResult | null>;
  onOpenDocument: (documentId: string) => void;
}

function MessageBubble({
  message,
  onOpenDocument,
}: {
  message: ChatMessage;
  onOpenDocument: (documentId: string) => void;
}) {
  const assistant = message.role === 'ASSISTANT';
  return (
    <li className={`flex gap-3 ${assistant ? 'justify-start' : 'justify-end'}`}>
      {assistant && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Icon name="sparkles" className="size-4" />
        </div>
      )}
      <article
        className={`max-w-3xl rounded-2xl px-4 py-3 sm:px-5 ${assistant ? 'border border-slate-200 bg-white text-slate-700 shadow-sm' : 'bg-indigo-600 text-white'}`}
      >
        {assistant ? (
          <MarkdownText content={message.content} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
        )}
        {assistant && message.citations.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="text-[11px] font-semibold tracking-wide text-indigo-700 uppercase">
              {message.citations.length} source{message.citations.length === 1 ? '' : 's'}
            </p>
            <div className="mt-2 space-y-2">
              {message.citations.map((citation) => (
                <details
                  key={`${citation.chunkId}-${citation.chunkIndex}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                    {citation.documentName}
                    {citation.pageNumber ? ` · Page ${citation.pageNumber}` : ''}
                    {` · Chunk ${citation.chunkIndex + 1}`}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap border-t border-slate-200 pt-2 text-xs leading-6 text-slate-600">
                    {citation.sourceText}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(citation.documentId)}
                    className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    Open document
                  </button>
                </details>
              ))}
            </div>
          </div>
        )}
      </article>
    </li>
  );
}

export function ChatPanel({
  documents,
  uploading,
  uploadProgress,
  indexingId,
  onUploadAndIndex,
  onIndexDocument,
  onOpenDocument,
}: ChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [showDocumentContext, setShowDocumentContext] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatSessionSummary | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshSessions = async () => {
    try {
      setSessions(await listChatSessions());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load chat sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void listChatSessions()
      .then((result) => {
        if (!cancelled) setSessions(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Could not load chat sessions.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingQuestion]);

  const newChat = () => {
    setSessionId(null);
    setMessages([]);
    setQuestion('');
    setSelectedDocumentIds([]);
    setShowDocumentContext(false);
    setError(null);
  };

  const loadSession = async (id: string) => {
    setSessionId(id);
    setLoadingMessages(true);
    setError(null);
    try {
      const session = await getChatSession(id);
      setMessages(session.messages);
      setSelectedDocumentIds(session.documentIds);
      setShowDocumentContext(false);
    } catch (loadError) {
      setMessages([]);
      setError(loadError instanceof Error ? loadError.message : 'Could not load this chat.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = question.trim();
    if (!normalized) {
      setError('Enter a question about your indexed documents.');
      return;
    }
    setSending(true);
    setError(null);
    setPendingQuestion(normalized);
    setQuestion('');
    try {
      const answer = await askQuestion(normalized, sessionId, selectedDocumentIds);
      setSessionId(answer.sessionId);
      setMessages((await getChatSession(answer.sessionId)).messages);
      await refreshSessions();
    } catch (sendError) {
      setQuestion(normalized);
      setError(
        sendError instanceof Error ? sendError.message : 'The question could not be answered.',
      );
    } finally {
      setPendingQuestion(null);
      setSending(false);
    }
  };

  const selectedDocuments = selectedDocumentIds.map((id) =>
    documents.find((document) => document.id === id),
  );

  const suggestedQuestions = [
    'Summarize the key points in this document.',
    'What important dates and amounts are mentioned?',
    'What actions or obligations should I know about?',
  ];

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deleteChatSession(pendingDelete.id);
      if (sessionId === pendingDelete.id) newChat();
      setPendingDelete(null);
      await refreshSessions();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'The chat could not be deleted.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Grounded Q&A"
        title="AI Chat"
        description="Ask questions across indexed documents and inspect the exact sources behind every grounded answer."
        action={
          <Button onClick={newChat} icon={<Icon name="plus" className="size-4" />}>
            New conversation
          </Button>
        }
      />
      <div className="grid min-h-[42rem] gap-5 xl:grid-cols-[18rem_1fr]">
        <Card className="max-h-64 overflow-hidden xl:max-h-[42rem]">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Conversation history
            </p>
          </div>
          <div className="max-h-[36rem] space-y-1 overflow-y-auto p-2">
            {loadingSessions && (
              <p className="px-3 py-5 text-xs text-slate-500">Loading conversations…</p>
            )}
            {!loadingSessions && sessions.length === 0 && (
              <p className="px-3 py-5 text-xs leading-5 text-slate-500">
                No saved conversations yet.
              </p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-start rounded-lg ${sessionId === session.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <button
                  type="button"
                  onClick={() => void loadSession(session.id)}
                  className="min-w-0 flex-1 px-3 py-3 text-left"
                >
                  <span
                    className={`block truncate text-xs font-semibold ${sessionId === session.id ? 'text-indigo-800' : 'text-slate-800'}`}
                  >
                    {session.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {session.messageCount} messages · {formatDate(session.updatedAt, false)}
                  </span>
                  <span className="mt-1 block text-[10px] font-medium text-slate-400">
                    {session.documentIds.length === 0
                      ? 'All indexed documents'
                      : `${session.documentIds.length} selected document${session.documentIds.length === 1 ? '' : 's'}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(session)}
                  className="m-1 rounded-md p-2 text-slate-400 opacity-100 hover:bg-rose-50 hover:text-rose-700 xl:opacity-0 xl:group-hover:opacity-100"
                  aria-label={`Delete ${session.title}`}
                >
                  <Icon name="trash" className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[42rem] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {sessionId
                  ? (sessions.find((session) => session.id === sessionId)?.title ?? 'Conversation')
                  : 'New conversation'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {selectedDocumentIds.length === 0
                  ? 'Using all indexed documents'
                  : `Using ${selectedDocumentIds.length} selected document${selectedDocumentIds.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDocumentContext((visible) => !visible)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                  showDocumentContext
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                aria-expanded={showDocumentContext}
              >
                <Icon name="file" className="size-3.5" />
                Add or choose files
              </button>
              <span className="hidden items-center gap-1.5 text-[11px] font-medium text-emerald-700 sm:flex">
                <span className="size-2 rounded-full bg-emerald-500" />
                Grounded
              </span>
            </div>
          </div>
          {showDocumentContext && (
            <ChatDocumentContext
              documents={documents}
              selectedDocumentIds={selectedDocumentIds}
              uploading={uploading}
              uploadProgress={uploadProgress}
              indexingId={indexingId}
              onSelectedDocumentIdsChange={setSelectedDocumentIds}
              onUploadAndIndex={onUploadAndIndex}
              onIndexDocument={onIndexDocument}
              onClose={() => setShowDocumentContext(false)}
            />
          )}
          {selectedDocumentIds.length > 0 && !showDocumentContext && (
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-5 py-2.5">
              {selectedDocuments.map((document, index) => (
                <span
                  key={selectedDocumentIds[index]}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-medium text-indigo-800"
                >
                  <Icon name="file" className="size-3" />
                  <span className="max-w-40 truncate">
                    {document?.originalName ?? 'Unavailable document'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDocumentIds((current) =>
                        current.filter((id) => id !== selectedDocumentIds[index]),
                      )
                    }
                    className="rounded p-0.5 hover:bg-indigo-100"
                    aria-label={`Remove ${document?.originalName ?? 'document'} from context`}
                  >
                    <Icon name="close" className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
            {loadingMessages ? (
              <p className="py-16 text-center text-sm text-slate-500">Loading conversation…</p>
            ) : messages.length === 0 && !pendingQuestion ? (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Icon name="sparkles" />
                </div>
                <p className="mt-4 font-semibold text-slate-900">
                  Ask a question about your documents
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Add or choose files, then ask for a summary, comparison, amount, date, or specific
                  fact.
                </p>
                <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuestion(suggestion)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs leading-5 text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-800"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="space-y-5">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onOpenDocument={onOpenDocument}
                  />
                ))}
                {pendingQuestion && (
                  <>
                    <li className="flex justify-end">
                      <div className="max-w-3xl rounded-2xl bg-indigo-600 px-5 py-3 text-sm leading-7 text-white">
                        {pendingQuestion}
                      </div>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Icon name="sparkles" className="size-4" />
                      </div>
                      <div
                        className="flex gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                        aria-label="Gemini is generating an answer"
                      >
                        <span className="size-1.5 animate-pulse rounded-full bg-slate-400" />
                        <span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </div>
                    </li>
                  </>
                )}
              </ol>
            )}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="border-t border-slate-200 bg-white p-4 sm:p-5"
          >
            {error && (
              <p
                className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="flex items-end gap-3 rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <button
                type="button"
                onClick={() => setShowDocumentContext((visible) => !visible)}
                disabled={sending}
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-50 ${
                  selectedDocumentIds.length > 0
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
                aria-label="Attach or select documents"
                title="Attach or select documents"
              >
                <Icon name="plus" className="size-4" />
              </button>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your indexed documents…"
                maxLength={2000}
                rows={2}
                disabled={sending}
                className="min-h-12 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="Question"
              />
              <button
                type="submit"
                disabled={sending || !question.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                aria-label="Send question"
              >
                <Icon name="send" className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Enter to send · Shift + Enter for a new line · Answers include source citations
            </p>
          </form>
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete conversation?"
        description={`“${pendingDelete?.title ?? ''}” and its messages will be permanently removed.`}
        confirmLabel="Delete conversation"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
