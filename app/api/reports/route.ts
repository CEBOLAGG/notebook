import { NextResponse } from 'next/server';
import { requireIngestToken } from '@/lib/auth';
import { reportsRepo } from '@/lib/repository';
import { apiPayloadSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const unauthorized = requireIngestToken(req);
  if (unauthorized) return unauthorized;

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
    await reportsRepo.ensureIndexes();
    const doc = await reportsRepo.upsertFromPayload(parsed.data);
    return NextResponse.json(
      { ok: true, test_id: doc.test_id, received_at: doc.received_at },
      { status: 201 },
    );
  } catch (err) {
    console.error('[reports.POST]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  // Listagem usada pela UI; não exige bearer (controle por DASHBOARD_TOKEN se quiser).
  const url = new URL(req.url);
  const search = url.searchParams.get('q') ?? undefined;
  const classification = url.searchParams.get('classification') ?? undefined;
  const reportType = url.searchParams.get('type') as
    | 'full_checklist'
    | 'retest'
    | null;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 500) : undefined;

  try {
    const items = await reportsRepo.list({
      search,
      classification: classification || undefined,
      reportType: reportType ?? undefined,
      limit,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[reports.GET]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
