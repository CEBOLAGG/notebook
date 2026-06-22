import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { panelAuthEnabled, hasValidPanelSession } from '@/lib/panel-auth';

/**
 * Quando o login do painel está LIGADO (PANEL_AUTH_ENABLED=true), as PÁGINAS do
 * painel exigem sessão. Ficam sempre liberados:
 *  - /login e /api/login (o próprio login)
 *  - /api/version (auto-updater do app)
 *  - /api/reports/* (ingestão/reteste do app — protegidos por Bearer na rota)
 *  - /api/inspecao/* e /inspecao/* (fluxo do celular do técnico, sem login)
 * Quando DESLIGADO, o middleware é um passa-direto.
 */
const PUBLIC_PREFIXES = [
  '/login',
  '/api/login',
  '/api/version',
  '/api/reports',
  '/api/inspecao',
  '/inspecao',
];

export async function middleware(req: NextRequest) {
  if (!panelAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (await hasValidPanelSession(req)) return NextResponse.next();

  // APIs protegidas → 401; páginas → redireciona para o login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Não roda em assets estáticos do Next nem no favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
