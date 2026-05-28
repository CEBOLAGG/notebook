import Link from 'next/link';
import type { ReactNode } from 'react';

interface ShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ title, subtitle, actions, children }: ShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink-900 hover:text-brand-600"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M2 20h20" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">NotebookCheck</div>
              <div className="text-xs text-ink-500">Relatórios técnicos</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className="btn-ghost">
              Dashboard
            </Link>
            <Link href="/reports" className="btn-ghost">
              Relatórios
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
