import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { ClassificationBadge } from '@/components/StatusBadge';
import { reportsRepo } from '@/lib/repository';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ q?: string; classification?: string; type?: string }>;
}

export default async function ReportsListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const items = await reportsRepo
    .list({
      search: sp.q,
      classification: sp.classification,
      reportType:
        sp.type === 'full_checklist' || sp.type === 'retest'
          ? sp.type
          : undefined,
      limit: 200,
    })
    .catch(() => []);

  return (
    <Shell
      title="Relatórios"
      subtitle="Filtre por código NTB, modelo, técnico ou localização"
    >
      <form
        method="get"
        className="card mb-6 flex flex-wrap items-end gap-3 p-4"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="label">Buscar</label>
          <input
            name="q"
            placeholder="NTB, serial, modelo, localização…"
            defaultValue={sp.q ?? ''}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Resultado</label>
          <select
            name="classification"
            defaultValue={sp.classification ?? ''}
            className="select mt-1 min-w-[180px]"
          >
            <option value="">Todos</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Aprovado com ressalvas">Com ressalvas</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            name="type"
            defaultValue={sp.type ?? ''}
            className="select mt-1 min-w-[160px]"
          >
            <option value="">Todos</option>
            <option value="full_checklist">Checklist</option>
            <option value="retest">Reteste</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
      </form>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Nenhum relatório encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">NTB</th>
                <th className="px-5 py-3">Equipamento</th>
                <th className="px-5 py-3">Localização</th>
                <th className="px-5 py-3">Técnico</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Quando</th>
                <th className="px-5 py-3">Resultado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((r) => (
                <tr key={r.test_id} className="hover:bg-ink-50">
                  <td className="px-5 py-3 font-mono text-xs text-ink-900">
                    {r.ntb_code || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink-900">
                      {[r.manufacturer, r.model].filter(Boolean).join(' ') ||
                        '—'}
                    </div>
                    <div className="text-xs text-ink-500">
                      {r.serial ?? 'sem serial'}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {r.location || '—'}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {r.technician_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {r.report_type === 'retest' ? 'Reteste' : 'Checklist'}
                  </td>
                  <td className="px-5 py-3 text-ink-700">
                    {formatDate(r.tested_at)}
                  </td>
                  <td className="px-5 py-3">
                    <ClassificationBadge value={r.final_classification} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/reports/${r.test_id}`}
                      className="text-brand-600 hover:underline"
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
    </Shell>
  );
}
