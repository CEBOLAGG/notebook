import { NextResponse } from 'next/server';

/**
 * Autenticação simples por bearer token compartilhado.
 * O app desktop já envia "Authorization: Bearer <token>" do config.json.
 */
export function requireIngestToken(req: Request): NextResponse | null {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'INGEST_TOKEN não configurado no servidor' },
      { status: 500 },
    );
  }
  const auth = req.headers.get('authorization') ?? '';
  const provided = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
