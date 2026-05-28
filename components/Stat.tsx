import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'mute' | 'brand';
}

const toneClass: Record<NonNullable<StatProps['tone']>, string> = {
  ok: 'text-ok dark:text-green-400',
  warn: 'text-warn dark:text-amber-400',
  bad: 'text-bad dark:text-red-400',
  mute: 'text-ink-700 dark:text-ink-200',
  brand: 'text-brand-600 dark:text-brand-400',
};

export function Stat({ label, value, hint, tone = 'mute' }: StatProps) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneClass[tone]}`}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</div>
      ) : null}
    </div>
  );
}
