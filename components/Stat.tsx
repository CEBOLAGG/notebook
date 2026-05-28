import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'mute' | 'brand';
}

const toneClass: Record<NonNullable<StatProps['tone']>, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  mute: 'text-ink-700',
  brand: 'text-brand-600',
};

export function Stat({ label, value, hint, tone = 'mute' }: StatProps) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneClass[tone]}`}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
    </div>
  );
}
