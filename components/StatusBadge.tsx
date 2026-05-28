import { classificationTone, statusToTone } from '@/lib/format';

interface BadgeProps {
  text: string;
  tone?: 'ok' | 'warn' | 'bad' | 'mute';
}

const toneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  mute: 'badge-mute',
};

export function Badge({ text, tone = 'mute' }: BadgeProps) {
  return <span className={toneClass[tone]}>{text}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge text={status} tone={statusToTone(status)} />;
}

export function ClassificationBadge({ value }: { value: string }) {
  return <Badge text={value} tone={classificationTone(value)} />;
}
