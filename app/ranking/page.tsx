import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { getDb } from '@/lib/mongo';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ by?: string; cpu?: string; gpu?: string }>;
}

interface MachineRow {
  test_id: string;
  tested_at: string;
  cpu: string;
  gpu: string;
  manufacturer: string;
  model: string;
  ntb_code: string;
  final_score: number;
  cpu_single_thread: number;
  cpu_multi_thread: number;
  cpu_efficiency: number;
  cpu_threads: number;
  gpu_graphics: number;
  gpu_compute: number;
  gpu_bandwidth: number;
  disk_score: number;
  disk_read_mb_s: number;
  disk_write_mb_s: number;
  vram_ok: boolean;
  vram_allocated_mb: number;
}

interface Group {
  key: string;
  count: number;
  best: number;
  avg: number;
  worst: number;
  machines: MachineRow[];
}

async function loadGroups(by: string, cpu?: string, gpu?: string): Promise<Group[]> {
  try {
    const db = await getDb();
    const col = db.collection('reports');
    const filter: Record<string, unknown> = { 'stress.final_score': { $gt: 0 } };
    if (cpu) filter['machine.cpu'] = { $regex: cpu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (gpu) filter['stress.gpu_name'] = { $regex: gpu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const docs = await col
      .find(filter, {
        projection: {
          test_id: 1,
          tested_at: 1,
          'machine.cpu': 1,
          'machine.manufacturer': 1,
          'machine.model': 1,
          'machine.ntb_code': 1,
          stress: 1,
        },
      })
      .sort({ 'stress.final_score': -1 })
      .limit(500)
      .toArray();

    const items: MachineRow[] = docs.map((d) => {
      const s = (d.stress ?? {}) as Record<string, number | string | boolean | null | undefined>;
      const m = (d.machine ?? {}) as Record<string, string | undefined>;
      return {
        test_id: d.test_id as string,
        tested_at: d.tested_at as string,
        cpu: m.cpu ?? '',
        gpu: (s.gpu_name as string) ?? '',
        manufacturer: m.manufacturer ?? '',
        model: m.model ?? '',
        ntb_code: m.ntb_code ?? '',
        final_score: (s.final_score as number) ?? 0,
        cpu_single_thread: (s.cpu_single_thread as number) ?? 0,
        cpu_multi_thread: (s.cpu_multi_thread as number) ?? 0,
        cpu_efficiency: (s.cpu_efficiency as number) ?? 0,
        cpu_threads: (s.cpu_threads as number) ?? 0,
        gpu_graphics: (s.gpu_graphics as number) ?? 0,
        gpu_compute: (s.gpu_compute as number) ?? 0,
        gpu_bandwidth: (s.gpu_bandwidth as number) ?? 0,
        disk_score: (s.disk_score as number) ?? 0,
        disk_read_mb_s: (s.disk_read_mb_s as number) ?? 0,
        disk_write_mb_s: (s.disk_write_mb_s as number) ?? 0,
        vram_ok: (s.vram_ok as boolean) ?? true,
        vram_allocated_mb: (s.vram_allocated_mb as number) ?? 0,
      };
    });

    const buckets = new Map<string, MachineRow[]>();
    for (const item of items) {
      const key =
        by === 'cpu' ? item.cpu :
        by === 'gpu' ? item.gpu :
        `${item.cpu} • ${item.gpu}`;
      const k = key.trim() || '—';
      const arr = buckets.get(k) ?? [];
      arr.push(item);
      buckets.set(k, arr);
    }
    return Array.from(buckets.entries()).map(([key, list]) => {
      const sorted = list.sort((a, b) => b.final_score - a.final_score);
      const avg = Math.round(sorted.reduce((acc, x) => acc + x.final_score, 0) / sorted.length);
      return {
        key,
        count: sorted.length,
        best: sorted[0]?.final_score ?? 0,
        avg,
        worst: sorted[sorted.length - 1]?.final_score ?? 0,
        machines: sorted,
      };
    }).sort((a, b) => b.best - a.best);
  } catch {
    return [];
  }
}

export default async function RankingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const by = (sp.by ?? 'combo').toLowerCase();
  const groups = await loadGroups(by, sp.cpu, sp.gpu);

  return (
    <Shell
      title="Ranking de desempenho"
      subtitle="Compare máquinas com mesmas specs (CPU/GPU) pelos resultados do benchmark suite"
    >
      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Agrupar por</label>
          <select name="by" defaultValue={by} className="select mt-1 min-w-[160px]">
            <option value="combo">CPU + GPU</option>
            <option value="cpu">Só CPU</option>
            <option value="gpu">Só GPU</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">Filtrar CPU</label>
          <input name="cpu" placeholder="Ex.: i7-1165G7" defaultValue={sp.cpu ?? ''} className="input mt-1"/>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">Filtrar GPU</label>
          <input name="gpu" placeholder="Ex.: RTX 3060" defaultValue={sp.gpu ?? ''} className="input mt-1"/>
        </div>
        <button type="submit" className="btn-primary">Aplicar</button>
      </form>

      {groups.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500 dark:text-ink-400">
          Nenhum relatório com benchmark ainda. Rode um checklist no modo Detalhado.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 dark:border-ink-700">
                <div>
                  <h2 className="text-base font-semibold text-ink-900 dark:text-white">{g.key}</h2>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {g.count} máquina(s) testada(s)
                  </p>
                </div>
                <div className="flex gap-6 text-right">
                  <Stat label="Melhor" value={g.best} tone="ok"/>
                  <Stat label="Média" value={g.avg} tone="brand"/>
                  <Stat label="Pior" value={g.worst} tone={g.worst < 400 ? 'bad' : 'mute'}/>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/35 text-left font-mono text-[11px] uppercase tracking-wider text-ink-500 dark:bg-white/5 dark:text-ink-400">
                    <tr>
                      <th className="px-4 py-3">Pos.</th>
                      <th className="px-4 py-3">NTB</th>
                      <th className="px-4 py-3">Equipamento</th>
                      <th className="px-4 py-3">Final</th>
                      <th className="px-4 py-3">CPU ST/MT</th>
                      <th className="px-4 py-3">GPU (G/C/B)</th>
                      <th className="px-4 py-3">Disco</th>
                      <th className="px-4 py-3">VRAM</th>
                      <th className="px-4 py-3">Quando</th>
                      <th className="px-4 py-3"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200/50 dark:divide-white/10">
                    {g.machines.map((m, i) => (
                      <tr key={m.test_id} className="hover:bg-white/45 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-semibold text-ink-900 dark:text-white">#{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{m.ntb_code || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink-900 dark:text-white">
                            {[m.manufacturer, m.model].filter(Boolean).join(' ') || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{m.final_score}</td>
                        <td className="px-4 py-3 text-ink-700 dark:text-ink-200">
                          {m.cpu_single_thread}
                          <span className="mx-1 text-ink-300">/</span>
                          {m.cpu_multi_thread}
                          <div className="text-xs text-ink-400">
                            {m.cpu_threads}T • efic {m.cpu_efficiency}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-700 dark:text-ink-200">
                          {m.gpu_graphics}
                          <span className="mx-1 text-ink-300">/</span>
                          {m.gpu_compute}
                          <span className="mx-1 text-ink-300">/</span>
                          {m.gpu_bandwidth}
                        </td>
                        <td className="px-4 py-3 text-ink-700 dark:text-ink-200">
                          {m.disk_score}
                          <div className="text-xs text-ink-400">
                            ↓ {m.disk_read_mb_s.toFixed(0)} • ↑ {m.disk_write_mb_s.toFixed(0)} MB/s
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-700 dark:text-ink-200">
                          {m.vram_ok ? (
                            <span className="text-ok dark:text-green-400">{m.vram_allocated_mb} MB OK</span>
                          ) : (
                            <span className="text-bad dark:text-red-400">corrompida</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-700 dark:text-ink-200">{formatDate(m.tested_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/reports/${m.test_id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'bad' | 'mute' | 'brand' }) {
  const cls = {
    ok: 'text-ok dark:text-green-400',
    warn: 'text-warn dark:text-amber-400',
    bad: 'text-bad dark:text-red-400',
    mute: 'text-ink-700 dark:text-ink-200',
    brand: 'text-brand-600 dark:text-brand-400',
  }[tone];
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</div>
      <div className={`text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
