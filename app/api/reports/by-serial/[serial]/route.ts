import { NextResponse } from 'next/server';
import { reportsRepo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Busca o relatório mais recente para um serial específico. Usado pelo
 * fluxo de reteste pós-reparo no app desktop, para que ao iniciar o reteste
 * a aplicação encontre o histórico anterior do equipamento.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ serial: string }> },
) {
  const { serial } = await params;
  const decoded = decodeURIComponent(serial ?? '');
  if (!decoded || !decoded.trim()) {
    return NextResponse.json({ error: 'serial vazio' }, { status: 400 });
  }

  const doc = await reportsRepo.findLatestBySerial(decoded);
  if (!doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { _id, ...rest } = doc as unknown as { _id?: unknown } & Record<string, unknown>;
  void _id;
  return NextResponse.json(rest);
}
