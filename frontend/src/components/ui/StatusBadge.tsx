import type { IndexingStatus, ProcessingStatus } from '../../types/document';

type Status = ProcessingStatus | IndexingStatus;

const styles: Record<Status, string> = {
  UPLOADED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  PROCESSING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  NOT_INDEXED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  INDEXING: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  INDEXED: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
