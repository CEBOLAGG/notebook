import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Stat } from '@/components/Stat';
import { ClassificationBadge } from '@/components/StatusBadge';
import { reportsRepo } from '@/lib/repository';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  let stats = { total: 0, approved: 0, warnings: 0, rejected: 0, last7Days: 0 };
  let recent: Awaited<ReturnType<typeof reportsRepo.list>> = [];
  let dbError: string | null = null;

  try {
    [stats, recent] = await Promise.all([
      reportsRepo.stats(),
      reportsRepo.list({ limit: 8 }),
    ]);
  } catch (err) {
    dbError = (err as Error).message;
  }

  return (
    <Shell
      title="Visão geral"
      subtitle="Acompanhe os checklists técnicos enviados pelo aplicativo"
      actions={
        <Link href="/reports" className="btn-primary">
          Ver todos os relatórios
        </Link>
      }
    >
      {dbError ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <strong>Banco indisponível:</strong> {dbError}. Configure{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">MONGODB_URI</code> na
          Vercel.
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={stats.total} tone="brand" />
        <Stat label="Aprovados" value={stats.approved} tone="ok" />
        <Stat label="Com ressalvas" value={stats.warnings} tone="warn" />
        <Stat label="Reprovados" value={stats.rejected} tone="bad" />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Últimos relatórios</h2>
          <span className="text-xs text-ink-500">
            {stats.last7Days} nos últimos 7 dias
          </span>
        </div>

        {recent.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-500 dark:text-ink-400">
            Nenhum relatório recebido ainda. Configure o app desktop para
            apontar para esta URL e o primeiro envio aparece aqui.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                <tr>
                  <th className="px-5 py-3">NTB</th>
                  <th className="px-5 py-3">Equipamento</th>
                  <th className="px-5 py-3">Localização</th>
                  <th className="px-5 py-3">Técnico</th>
                  <th className="px-5 py-3">Quando</th>
                  <th className="px-5 py-3">Resultado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-700">
                {recent.map((r) => (
                  <tr key={r.test_id} className="hover:bg-ink-50 dark:hover:bg-ink-700/40">
                    <td className="px-5 py-3 font-mono text-xs text-ink-900 dark:text-white">
                      {r.ntb_code || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink-900 dark:text-white">
                        {[r.manufacturer, r.model].filter(Boolean).join(' ') ||
                          '—'}
                      </div>
                      <div className="text-xs text-ink-500 dark:text-ink-400">
                        {r.serial ?? 'sem serial'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-700 dark:text-ink-200">
                      {r.location || '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-700 dark:text-ink-200">
                      {r.technician_name || '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-700 dark:text-ink-200">
                      {formatDate(r.tested_at)}
                    </td>
                    <td className="px-5 py-3">
                      <ClassificationBadge value={r.final_classification} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/reports/${r.test_id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}
