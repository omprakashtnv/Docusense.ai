import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { Icon } from './ui/Icon';

interface UploadDropzoneProps {
  disabled: boolean;
  progress: number;
  onFileSelected: (file: File) => void;
}

export function UploadDropzone({ disabled, progress, onFileSelected }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFirstFile = (files: FileList | null) => {
    const file = files?.item(0);
    if (file) onFileSelected(file);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    selectFirstFile(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!disabled) selectFirstFile(event.dataTransfer.files);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border-2 border-dashed p-7 text-center transition sm:p-9 ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40'
      } ${disabled ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDrop={handleDrop}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInput}
        disabled={disabled}
      />

      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
        <Icon name="upload" className="size-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">
        {disabled ? 'Extracting document text…' : 'Drop a document here or browse'}
      </p>
      <p className="mt-1.5 text-xs text-slate-500">PDF or DOCX · Maximum 10 MB</p>

      {disabled && (
        <div className="mx-auto mt-6 max-w-sm" aria-label={`Upload ${progress}% complete`}>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${Math.max(progress, 6)}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-medium text-indigo-700">
            {progress < 100 ? `${progress}% uploaded` : 'Upload complete · processing text'}
          </p>
        </div>
      )}
    </div>
  );
}
