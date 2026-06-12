import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLink } from './NavLink';
import { ThemeToggle } from './ThemeToggle';

interface ShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * App-shell de ferramenta interna: sidebar fixa à esquerda no desktop
 * (vira barra superior no mobile), cabeçalho de página fino e conteúdo
 * denso — o painel também funciona como controle de estoque.
 */
export function Shell({ title, subtitle, actions, children }: ShellProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      {/* Sidebar (desktop) / topbar (mobile) — barra de vidro */}
      <aside className="glass-bar z-20 flex flex-col border-b-0 !border-l-0 !border-t-0 lg:sticky lg:top-0 lg:h-dvh lg:!border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 pb-2 pt-3 lg:pb-4 lg:pt-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-ink-900 transition-colors hover:opacity-80 dark:text-white"
          >
            <span className="chroma grid h-8 w-8 place-items-center rounded-lg bg-ink-900/90 font-mono text-[13px] font-semibold text-white shadow-sm dark:bg-brand-600/90">
              N
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">Notelet</div>
              <div className="text-[11px] text-ink-500 dark:text-ink-400">Estoque &amp; relatórios</div>
            </div>
          </Link>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav
          aria-label="Navegação principal"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0 lg:pt-1"
        >
          <NavLink href="/" icon="grid">Visão geral</NavLink>
          <NavLink href="/reports" icon="list">Relatórios</NavLink>
          <NavLink href="/ranking" icon="chart">Ranking</NavLink>
          <NavLink href="/changelog" icon="bell">Novidades</NavLink>
        </nav>

        <div className="mt-auto hidden items-center justify-between border-t border-white/40 px-4 py-3 dark:border-white/10 lg:flex">
          <span className="text-[11px] text-ink-400 dark:text-ink-500">Notelet</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Área de conteúdo */}
      <div className="min-w-0">
        <header className="glass-bar !border-l-0 !border-r-0 !border-t-0 border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
