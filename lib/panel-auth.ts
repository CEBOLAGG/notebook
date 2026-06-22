import { NextResponse } from 'next/server';

/**
 * Login SIMPLES do painel — desligado por padrão. Para ligar, defina na Vercel:
 *   PANEL_AUTH_ENABLED = true
 *   PANEL_PASSWORD     = <senha do painel>
 *
 * Enquanto desligado, nada muda: páginas e rotas funcionam como hoje.
 * Quando ligado: as PÁGINAS exigem login (middleware) e as rotas de MUTAÇÃO
 * exigem sessão do painel (cookie) OU o token de ingestão do app (Bearer).
 */
export const PANEL_COOKIE = 'notelet_panel';

export function panelAuthEnabled(): boolean {
  return process.env.PANEL_AUTH_ENABLED === 'true' && !!process.env.PANEL_PASSWORD;
}

/** Token derivado da senha (sha256 hex) — a senha nunca vai no cookie. */
export async function panelToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`notelet:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function expectedToken(): Promise<string | null> {
  const pw = process.env.PANEL_PASSWORD;
  return pw ? panelToken(pw) : null;
}

export async function hasValidPanelSession(req: Request): Promise<boolean> {
  const expected = await expectedToken();
  if (!expected) return false;
  const cookie = readCookie(req, PANEL_COOKIE);
  return !!cookie && timingSafeEqual(cookie, expected);
}

/**
 * Guard para rotas de mutação. Auth DESLIGADA → não bloqueia (libera).
 * LIGADA → exige sessão do painel (cookie) OU o Bearer de ingestão.
 * Retorna 401 quando bloqueia, ou null quando libera.
 */
export async function requirePanelOrIngest(req: Request): Promise<NextResponse | null> {
  if (!panelAuthEnabled()) return null;
  if (await hasValidPanelSession(req)) return null;
  const bearer = readBearer(req);
  if (bearer && process.env.INGEST_TOKEN && timingSafeEqual(bearer, process.env.INGEST_TOKEN)) {
    return null;
  }
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function readBearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
