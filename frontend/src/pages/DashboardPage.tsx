import { Card } from '../components/ui/Card';
import { Icon, type IconName } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { UploadDropzone } from '../components/UploadDropzone';
import type { Page } from '../hooks/useNavigation';
import type { DocumentSummary } from '../types/document';
import { getDocumentStats } from '../utils/documents';
import { fileTypeLabel, formatDate } from '../utils/format';

export function DashboardPage({
  documents,
  loading,
  uploading,
  uploadProgress,
  onUpload,
  onNavigate,
  onOpenDocument,
}: {
  documents: DocumentSummary[];
  loading: boolean;
  uploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  onNavigate: (page: Exclude<Page, 'document-detail'>) => void;
  onOpenDocument: (id: string) => void;
}) {
  const documentStats = getDocumentStats(documents);
  const stats: Array<{ label: string; value: number; icon: IconName; tone: string }> = [
    {
      label: 'Total documents',
      value: documentStats.total,
      icon: 'documents',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Processed',
      value: documentStats.processed,
      icon: 'check',
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Indexed',
      value: documentStats.indexed,
      icon: 'database',
      tone: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Needs attention',
      value: documentStats.failed,
      icon: 'alert',
      tone: 'bg-rose-50 text-rose-700',
    },
  ];

  const typeCounts = documents.reduce<Record<string, number>>((counts, document) => {
    const type = (document.documentType ?? 'UNCLASSIFIED').replaceAll('_', ' ');
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const recent = documents.slice(0, 5);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace overview"
        title="Good to see you"
        description="Track document processing, indexing, and recent activity from one place."
        action={
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Icon name="sparkles" className="size-4" /> Ask your documents
          </button>
        }
      />

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Document statistics"
      >
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                  {loading ? '—' : stat.value}
                </p>
              </div>
              <div className={`flex size-10 items-center justify-center rounded-lg ${stat.tone}`}>
                <Icon name={stat.icon} className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-950">Recent documents</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Latest uploads and their current state
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Upload your first document to see activity here.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDocument(document.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">
                      {fileTypeLabel(document.mimeType)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {document.originalName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {formatDate(document.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={document.processingStatus} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Document types</h2>
          <p className="mt-1 text-xs text-slate-500">Classification across your library</p>
          <div className="mt-5 space-y-4">
            {typeEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No classified documents yet.
              </p>
            ) : (
              typeEntries.map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{type}</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(count / documents.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Quick upload</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add a PDF or DOCX and start processing immediately.
            </p>
          </div>
          <UploadDropzone
            disabled={uploading}
            progress={uploadProgress}
            onFileSelected={onUpload}
          />
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">Recent processing activity</h2>
          <p className="mt-1 text-xs text-slate-500">Derived from document updates</p>
          <ul className="mt-5 space-y-4">
            {recent.slice(0, 4).map((document) => (
              <li key={document.id} className="flex gap-3">
                <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icon name="clock" className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {document.originalName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Processing {document.processingStatus.toLowerCase()} ·{' '}
                    {formatDate(document.updatedAt)}
                  </p>
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="py-8 text-center text-sm text-slate-500">No activity yet.</li>
            )}
          </ul>
        </Card>
      </section>
    </div>
  );
}
