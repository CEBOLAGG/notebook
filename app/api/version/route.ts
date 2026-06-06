import { NextResponse } from 'next/server';
import { requireIngestToken } from '@/lib/auth';
import { versionRepo } from '@/lib/version-manifest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/version — manifesto de versão do app (público, leitura).
 * O auto-updater do desktop lê daqui. Se o banco falhar ou ainda não houver
 * versão publicada, devolve 404 para o app cair no fallback (version.json).
 */
export async function GET() {
  try {
    const manifest = await versionRepo.get();
    if (!manifest) {
      return NextResponse.json({ error: 'not_published' }, { status: 404 });
    }
    return NextResponse.json(manifest, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (err) {
    console.error('[version.GET]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/version — publica uma nova versão (protegido por bearer token).
 * Chamado pelo scripts/publish.ps1 após criar o GitHub Release.
 * Body: { version, url, sha256, changelog[], date? }
 */
export async function POST(req: Request) {
  const unauthorized = requireIngestToken(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const version = typeof b.version === 'string' ? b.version.trim() : '';
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  const sha256 = typeof b.sha256 === 'string' ? b.sha256.trim() : '';
  const changelog = Array.isArray(b.changelog)
    ? b.changelog.filter((x): x is string => typeof x === 'string')
    : [];
  const date = typeof b.date === 'string' ? b.date : null;

  if (!version || !url) {
    return NextResponse.json(
      { error: 'validation_error', message: 'version e url são obrigatórios' },
      { status: 400 },
    );
  }

  try {
    const manifest = await versionRepo.publish({ version, url, sha256, changelog, date });
    return NextResponse.json({ ok: true, manifest }, { status: 201 });
  } catch (err) {
    console.error('[version.POST]', err);
    return NextResponse.json(
      { error: 'storage_error', message: (err as Error).message },
      { status: 500 },
    );
  }
}
