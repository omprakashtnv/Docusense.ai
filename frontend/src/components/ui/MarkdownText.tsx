import type { ReactNode } from 'react';

function inlineMarkdown(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-indigo-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

export function MarkdownText({ content }: { content: string }) {
  const blocks = content.split('```');
  return (
    <div className="space-y-2 text-sm leading-7">
      {blocks.map((block, blockIndex) =>
        blockIndex % 2 === 1 ? (
          <pre
            key={blockIndex}
            className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"
          >
            <code>{block.replace(/^\w+\n/, '')}</code>
          </pre>
        ) : (
          block.split('\n').map((line, lineIndex) => {
            const key = `${blockIndex}-${lineIndex}`;
            if (!line.trim()) return <div key={key} className="h-1" />;
            if (line.startsWith('### '))
              return (
                <h4 key={key} className="pt-2 font-semibold text-slate-950">
                  {inlineMarkdown(line.slice(4))}
                </h4>
              );
            if (line.startsWith('## '))
              return (
                <h3 key={key} className="pt-2 text-base font-semibold text-slate-950">
                  {inlineMarkdown(line.slice(3))}
                </h3>
              );
            if (line.startsWith('# '))
              return (
                <h2 key={key} className="pt-2 text-lg font-semibold text-slate-950">
                  {inlineMarkdown(line.slice(2))}
                </h2>
              );
            if (/^[-*] /.test(line))
              return (
                <div key={key} className="flex gap-2 pl-1">
                  <span className="text-indigo-600">•</span>
                  <p>{inlineMarkdown(line.slice(2))}</p>
                </div>
              );
            if (/^\d+\. /.test(line)) {
              const match = line.match(/^(\d+)\. (.*)$/);
              return (
                <div key={key} className="flex gap-2 pl-1">
                  <span className="font-medium text-indigo-700">{match?.[1]}.</span>
                  <p>{inlineMarkdown(match?.[2] ?? line)}</p>
                </div>
              );
            }
            if (line.startsWith('> '))
              return (
                <blockquote key={key} className="border-l-2 border-indigo-300 pl-3 text-slate-600">
                  {inlineMarkdown(line.slice(2))}
                </blockquote>
              );
            return <p key={key}>{inlineMarkdown(line)}</p>;
          })
        ),
      )}
    </div>
  );
}
