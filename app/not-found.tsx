import Link from 'next/link';
import { Shell } from '@/components/Shell';

export default function NotFound() {
  return (
    <Shell title="Não encontrado" subtitle="A página ou relatório solicitado não existe">
      <div className="card p-10 text-center">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Verifique o link ou volte para a lista de relatórios.
        </p>
        <Link href="/reports" className="btn-primary mt-4 inline-flex">
          Ver relatórios
        </Link>
      </div>
    </Shell>
  );
}
