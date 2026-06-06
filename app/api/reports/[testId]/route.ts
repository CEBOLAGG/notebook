import { NextResponse } from 'next/server';
import { reportsRepo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  const doc = await reportsRepo.getById(testId);
  if (!doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Strip o _id do mongo para evitar problemas de serialização.
  const { _id, ...rest } = doc as unknown as { _id?: unknown } & Record<string, unknown>;
  void _id;
  return NextResponse.json(rest);
}

/**
 * Edição manual do relatório pelo técnico no site. Recebe um objeto parcial
 * (campos a alterar) e aplica via $set. Ex.: { "machine.ntb_code": "NTB-9",
 * "final_classification": "Aprovado", "general_notes": "..." }.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }

  try {
    const updated = await reportsRepo.updateFields(testId, patch);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const { _id, ...rest } = updated as unknown as { _id?: unknown } & Record<string, unknown>;
    void _id;
    return NextResponse.json({ ok: true, report: rest });
  } catch (err) {
    console.error('[reports.PATCH]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
