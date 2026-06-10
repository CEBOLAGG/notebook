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

  let body: {
    item_key?: string;
    image?: string;
    note?: string | null;
    status?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const itemKey = (body.item_key ?? '').trim();
  let image = body.image ?? '';
  const def = findInspectionItem(itemKey);
  if (!def) {
    return NextResponse.json({ error: 'item inválido' }, { status: 400 });
  }

  // Normaliza o status para o conjunto permitido.
  const rawStatus = (body.status ?? '').toString().toLowerCase();
  const status: 'ok' | 'problema' | null =
    rawStatus === 'ok' ? 'ok' : rawStatus === 'problema' ? 'problema' : null;
  const note = body.note ?? null;

  try {
    // Sem imagem nova ⇒ atualização só da avaliação (status + nota) de um item
    // que já tem foto. Usado quando o técnico só ajusta a avaliação no celular.
    if (!image) {
      const doc = await inspectionsRepo.updatePhotoMeta(slug, itemKey, { status, note });
      if (!doc) {
        return NextResponse.json({ error: 'foto ainda não enviada para este item' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, done: doc.photos.length });
    }

    // Remove o prefixo data URI, se vier.
    const comma = image.indexOf(',');
    if (image.startsWith('data:') && comma > 0) image = image.slice(comma + 1);

    // Limite defensivo de tamanho (~4 MB base64 ≈ 3 MB de imagem).
    if (image.length > 6_000_000) {
      return NextResponse.json({ error: 'imagem muito grande' }, { status: 413 });
    }

    const doc = await inspectionsRepo.putPhoto(slug, {
      item_key: itemKey,
      label: def.label,
      image_base64: image,
      note,
      status,
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
