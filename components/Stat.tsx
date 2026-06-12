import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'mute' | 'brand';
}

const valueClass: Record<NonNullable<StatProps['tone']>, string> = {
  ok: 'text-ok dark:text-green-400',
  warn: 'text-warn dark:text-amber-400',
  bad: 'text-bad dark:text-red-400',
  mute: 'text-ink-800 dark:text-ink-100',
  brand: 'text-brand-700 dark:text-brand-400',
};

const barClass: Record<NonNullable<StatProps['tone']>, string> = {
  ok: 'bg-ok dark:bg-green-400',
  warn: 'bg-warn dark:bg-amber-400',
  bad: 'bg-bad dark:bg-red-400',
  mute: 'bg-ink-300 dark:bg-ink-600',
  brand: 'bg-brand-600 dark:bg-brand-400',
};

/** KPI card denso com barra de tom à esquerda e número tabular (mono). */
export function Stat({ label, value, hint, tone = 'mute' }: StatProps) {
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${barClass[tone]}`} aria-hidden />
      <div className="label">{label}</div>
      <div className={`data-value mt-2 text-3xl font-semibold ${valueClass[tone]}`}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</div>
      ) : null}
    </div>
  );
}
