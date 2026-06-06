import { inspectionsRepo } from '@/lib/inspections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Serve a foto de um item como JPEG, para o preview na página mobile. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; key: string }> },
) {
  const { slug, key } = await params;
  const doc = await inspectionsRepo.get(slug);
  const photo = doc?.photos.find((p) => p.item_key === key);
  if (!photo) {
    return new Response('não encontrado', { status: 404 });
  }
  const bytes = Buffer.from(photo.image_base64, 'base64');
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
    },
  });
}
