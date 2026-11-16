import { useEffect, useState } from 'react';

import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import { getPublicMeta } from '../services/meta.api';
import type { PublicMeta } from '../types/meta';

export function SettingsPage() {
  const [meta, setMeta] = useState<PublicMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicMeta()
      .then((value) => {
        if (!cancelled) setMeta(value);
      })
      .catch((loadError: unknown) => {
        if (!cancelled)
          setError(
            loadError instanceof Error ? loadError.message : 'Could not load application settings.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Safe, read-only information about this DocuSense AI workspace."
      />
      <Card className="max-w-3xl overflow-hidden">
        {!meta && !error ? (
          <LoadingState label="Loading application information…" />
        ) : error ? (
          <div className="p-6 text-sm text-rose-700" role="alert">
            {error}
          </div>
        ) : (
          meta && (
            <>
              <div className="flex items-center gap-4 border-b border-slate-200 p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Icon name="settings" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">{meta.application.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Application version {meta.application.version}
                  </p>
                </div>
              </div>
              <dl className="divide-y divide-slate-100 px-6">
                {[
                  ['AI provider', meta.ai.provider],
                  ['Generation model', meta.ai.generationModel],
                  ['Embedding model', meta.ai.embeddingModel],
                  ['Embedding dimensions', meta.ai.embeddingDimensions.toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr]">
                    <dt className="text-sm font-medium text-slate-500">{label}</dt>
                    <dd className="text-sm font-semibold break-words text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )
        )}
      </Card>
      <div className="max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        This page intentionally exposes model names and public application metadata only. API keys,
        database credentials, and internal paths remain server-side.
      </div>
    </div>
  );
}
