import { NextResponse } from 'next/server';
import { inspectionsRepo } from '@/lib/inspections';
import { findInspectionItem } from '@/lib/inspection-items';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Recebe uma foto de inspeção do celular e salva no MongoDB, vinculada ao
 * slug (e, por consequência, ao serial da máquina registrado na sessão).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: { item_key?: string; image?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const itemKey = (body.item_key ?? '').trim();
  let image = body.image ?? '';
  const def = findInspectionItem(itemKey);
  if (!def || !image) {
    return NextResponse.json({ error: 'item ou imagem inválidos' }, { status: 400 });
  }

  // Remove o prefixo data URI, se vier.
  const comma = image.indexOf(',');
  if (image.startsWith('data:') && comma > 0) image = image.slice(comma + 1);

  // Limite defensivo de tamanho (~4 MB base64 ≈ 3 MB de imagem).
  if (image.length > 6_000_000) {
    return NextResponse.json({ error: 'imagem muito grande' }, { status: 413 });
  }

  try {
    const doc = await inspectionsRepo.putPhoto(slug, {
      item_key: itemKey,
      label: def.label,
      image_base64: image,
      note: body.note ?? null,
      captured_at: new Date().toISOString(),
    });
    if (!doc) {
      return NextResponse.json({ error: 'sessão não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, done: doc.photos.length });
  } catch (err) {
    console.error('[inspecao.upload]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
