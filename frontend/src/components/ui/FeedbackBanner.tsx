import { Icon } from './Icon';

export interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export function FeedbackBanner({ message }: { message: FeedbackMessage }) {
  const error = message.type === 'error';
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        error
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <Icon name={error ? 'alert' : 'check'} className="mt-0.5 size-4 shrink-0" />
      <p>{message.text}</p>
    </div>
  );
}
