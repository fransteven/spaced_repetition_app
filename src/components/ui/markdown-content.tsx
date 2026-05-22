'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
  /**
   * 'sm'  → used for the question (front) — slightly smaller text
   * 'md'  → used for the answer  (back)  — default readable size
   */
  size?: 'sm' | 'md';
}

export function MarkdownContent({
  content,
  className,
  size = 'md',
}: MarkdownContentProps): React.JSX.Element {
  const base = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div
      className={cn(
        'markdown-body w-full text-left',
        base,
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /* ── Headings ─────────────────────────────────────── */
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-2xl font-bold text-on-surface leading-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-2 text-xl font-semibold text-on-surface leading-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-on-surface first:mt-0">
              {children}
            </h3>
          ),

          /* ── Paragraph ────────────────────────────────────── */
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-on-surface last:mb-0">
              {children}
            </p>
          ),

          /* ── Inline code ──────────────────────────────────── */
          code: ({ children, className: codeClass }) => {
            const isBlock = codeClass?.startsWith('language-');
            if (isBlock) {
              return (
                <code className="block w-full overflow-x-auto rounded-lg bg-surface-container-high px-4 py-3 font-mono text-sm text-on-surface leading-relaxed">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded px-1.5 py-0.5 bg-surface-container-high font-mono text-sm text-primary">
                {children}
              </code>
            );
          },

          /* ── Code block wrapper ───────────────────────────── */
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg bg-surface-container-high p-0">
              {children}
            </pre>
          ),

          /* ── Blockquote ───────────────────────────────────── */
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-primary/40 pl-4 italic text-on-surface-variant">
              {children}
            </blockquote>
          ),

          /* ── Lists ────────────────────────────────────────── */
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1 pl-5 list-disc text-on-surface marker:text-primary/60">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 space-y-1 pl-5 list-decimal text-on-surface marker:text-primary/60">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          /* ── Horizontal rule ──────────────────────────────── */
          hr: () => (
            <hr className="my-4 border-outline-variant/20" />
          ),

          /* ── Bold / Italic / Strikethrough ────────────────── */
          strong: ({ children }) => (
            <strong className="font-bold text-on-surface">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-on-surface-variant">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through opacity-60">{children}</del>
          ),

          /* ── Table (GFM) ──────────────────────────────────── */
          table: ({ children }) => (
            <div className="mb-3 w-full overflow-x-auto rounded-lg border border-outline-variant/15">
              <table className="w-full text-sm text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-outline-variant/10">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-on-surface">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
