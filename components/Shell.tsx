import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface ShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ title, subtitle, actions, children }: ShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/80 backdrop-blur dark:border-ink-700 dark:bg-ink-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-mono text-sm font-bold tracking-tight text-white">
              NC
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">NotebookCheck</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">
                Painel de relatórios
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              Dashboard
            </Link>
            <Link
              href="/reports"
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              Relatórios
            </Link>
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink-900 dark:text-white">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
