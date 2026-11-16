import { useMemo, useState, type FormEvent } from 'react';

import { searchDocuments } from '../services/search.api';
import type { DocumentSummary } from '../types/document';
import type { SemanticSearchResponse } from '../types/search';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Icon } from './ui/Icon';
import { PageHeader } from './ui/PageHeader';

function similarityLabel(value: number): string {
  return `${(Math.min(1, Math.max(0, value)) * 100).toFixed(1)}%`;
}

export function SemanticSearchPanel({ documents }: { documents: DocumentSummary[] }) {
  const indexedDocuments = useMemo(
    () => documents.filter((document) => document.indexingStatus === 'INDEXED'),
    [documents],
  );
  const [query, setQuery] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [response, setResponse] = useState<SemanticSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError('Enter a question or phrase to search for.');
      setResponse(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResponse(
        await searchDocuments({ query: normalizedQuery, ...(documentId ? { documentId } : {}) }),
      );
    } catch (searchError) {
      setResponse(null);
      setError(searchError instanceof Error ? searchError.message : 'Semantic search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vector retrieval"
        title="Semantic Search"
        description="Find passages by meaning across indexed documents, even when the wording differs."
      />
      <Card className="p-5 sm:p-6">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="semantic-query" className="text-sm font-semibold text-slate-800">
            Search your document knowledge
          </label>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_17rem_auto]">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="semantic-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What is the invoice total?"
                maxLength={2000}
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pr-4 pl-10 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <select
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              aria-label="Limit search to one document"
            >
              <option value="">All indexed documents</option>
              {indexedDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.originalName}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={loading || indexedDocuments.length === 0}
              icon={<Icon name="search" className="size-4" />}
            >
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Returns up to five passages above the configured similarity threshold.
          </p>
          {indexedDocuments.length === 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Index at least one completed document before searching.
            </p>
          )}
          {error && (
            <p
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      </Card>
      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <Card className="flex items-center justify-center gap-3 py-14 text-sm text-slate-500">
            <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            Comparing indexed passages…
          </Card>
        )}
        {!loading && response && response.results.length === 0 && (
          <Card>
            <EmptyState
              title="No relevant passages found"
              description="Try broader wording or search across all indexed documents."
            />
          </Card>
        )}
        {!loading && response && response.results.length > 0 && (
          <section aria-labelledby="search-results-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 id="search-results-heading" className="font-semibold text-slate-950">
                  Relevant passages
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {response.results.length} result{response.results.length === 1 ? '' : 's'} for “
                  {response.query}”
                </p>
              </div>
              <p className="text-xs text-slate-500">Highest similarity first</p>
            </div>
            <ol className="grid gap-4 xl:grid-cols-2">
              {response.results.map((result, index) => (
                <li key={result.chunkId}>
                  <Card className="h-full p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {result.documentName}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          Result {index + 1} · Chunk {result.chunkIndex + 1}
                          {result.pageNumber ? ` · Page ${result.pageNumber}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20">
                        {similarityLabel(result.similarity)} match
                      </span>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {result.content}
                    </p>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
