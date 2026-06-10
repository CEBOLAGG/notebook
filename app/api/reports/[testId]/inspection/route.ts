import { NextResponse } from 'next/server';
import { reportsRepo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Edição da avaliação da inspeção física pelo técnico no site: atualiza apenas
 * status (ok/problema) e nota de cada foto, por item_key, sem reenviar as
 * imagens. Corpo: { evals: [{ item_key, status, note }] }.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  let body: { evals?: { item_key?: string; status?: string | null; note?: string | null }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const evals = (body.evals ?? [])
    .filter((e) => e && typeof e.item_key === 'string' && e.item_key.trim().length > 0)
    .map((e) => ({ item_key: e.item_key as string, status: e.status ?? null, note: e.note ?? null }));

  if (evals.length === 0) {
    return NextResponse.json({ error: 'nada para atualizar' }, { status: 400 });
  }

  try {
    const updated = await reportsRepo.updateInspectionEval(testId, evals);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const { _id, ...rest } = updated as unknown as { _id?: unknown } & Record<string, unknown>;
    void _id;
    return NextResponse.json({ ok: true, report: rest });
  } catch (err) {
    console.error('[reports.inspection.PATCH]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
