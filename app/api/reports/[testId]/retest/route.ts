import { NextResponse } from 'next/server';
import { requireIngestToken } from '@/lib/auth';
import { reportsRepo } from '@/lib/repository';
import { apiPayloadSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Atualiza um relatório existente com dados de um reteste pós-reparo.
 * O cliente envia o mesmo formato do POST /api/reports, mas com
 * <c>report_type = 'retest'</c>. Esta rota grava o resultado por cima do
 * relatório anterior, preservando o histórico em <c>retest_history</c>.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const unauthorized = requireIngestToken(req);
  if (unauthorized) return unauthorized;

  const { testId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = apiPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await reportsRepo.applyRetest(testId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, test_id: updated.test_id, retest_count: ((updated as unknown) as { retest_count?: number }).retest_count ?? 1 },
      { status: 200 },
    );
  } catch (err) {
    console.error('[reports.retest.POST]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
