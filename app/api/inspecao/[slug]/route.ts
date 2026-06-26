import { NextResponse } from 'next/server';
import { inspectionsRepo } from '@/lib/inspections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Estado da inspeção (itens + quais já têm foto). Usado pela página mobile.
 * Aceita ?serial= e ?machine= para registrar a sessão na primeira abertura
 * (o app passa esses dados na URL do QR).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const serial = url.searchParams.get('serial') ?? '';
  const machine = url.searchParams.get('machine') ?? '';
  const kind = url.searchParams.get('kind') === 'desktop' ? 'desktop' : 'notebook';

  try {
    await inspectionsRepo.ensureIndexes();
    // Garante a sessão (cria se for o primeiro acesso, com serial/machine/kind da URL).
    if (serial || machine) {
      await inspectionsRepo.ensure(slug, serial, machine, kind);
    }
    const state = await inspectionsRepo.state(slug);
    return NextResponse.json(state);
  } catch (err) {
    console.error('[inspecao.GET]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
