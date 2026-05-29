import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint de ranking. Suporta dois agrupamentos:
 *   ?by=cpu  → agrupa por machine.cpu (string textual)
 *   ?by=gpu  → agrupa por stress.gpu_name
 *   ?by=combo → agrupa por (cpu, gpu)
 *
 * Filtros opcionais:
 *   ?cpu=<substring>
 *   ?gpu=<substring>
 *
 * Retorna até 100 entradas, sempre com final_score + métricas de stress
 * decompostas, ordenado por final_score desc.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const by = (url.searchParams.get('by') ?? 'combo').toLowerCase();
  const cpu = url.searchParams.get('cpu');
  const gpu = url.searchParams.get('gpu');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);

  try {
    const db = await getDb();
    const col = db.collection('reports');

    // Só relatórios que tem stress preenchido (Detalhado)
    const filter: Record<string, unknown> = { 'stress.final_score': { $gt: 0 } };
    if (cpu && cpu.trim()) {
      filter['machine.cpu'] = { $regex: escapeRegex(cpu.trim()), $options: 'i' };
    }
    if (gpu && gpu.trim()) {
      filter['stress.gpu_name'] = { $regex: escapeRegex(gpu.trim()), $options: 'i' };
    }

    const docs = await col
      .find(filter, {
        projection: {
          test_id: 1,
          tested_at: 1,
          'machine.cpu': 1,
          'machine.manufacturer': 1,
          'machine.model': 1,
          'machine.ntb_code': 1,
          'machine.serial': 1,
          stress: 1,
        },
      })
      .sort({ 'stress.final_score': -1 })
      .limit(limit)
      .toArray();

    const items = docs.map((d) => ({
      test_id: d.test_id,
      tested_at: d.tested_at,
      cpu: d.machine?.cpu ?? '',
      gpu: d.stress?.gpu_name ?? '',
      manufacturer: d.machine?.manufacturer ?? '',
      model: d.machine?.model ?? '',
      ntb_code: d.machine?.ntb_code ?? '',
      serial: d.machine?.serial ?? '',
      final_score: d.stress?.final_score ?? 0,
      cpu_score: d.stress?.cpu_score ?? 0,
      disk_score: d.stress?.disk_score ?? 0,
      disk_read_mb_s: d.stress?.disk_read_mb_s ?? 0,
      disk_write_mb_s: d.stress?.disk_write_mb_s ?? 0,
      gpu_score: d.stress?.gpu_score ?? 0,
    }));

    // Agrupa quando solicitado
    if (by === 'cpu' || by === 'gpu' || by === 'combo') {
      const buckets = new Map<string, typeof items>();
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
      const groups = Array.from(buckets.entries()).map(([key, list]) => {
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
      return NextResponse.json({ by, groups });
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[ranking.GET]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
