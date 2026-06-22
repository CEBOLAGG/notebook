import { NextResponse } from 'next/server';
import { PANEL_COOKIE, panelAuthEnabled, panelToken } from '@/lib/panel-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Login do painel: valida a senha e grava o cookie de sessão. */
export async function POST(req: Request) {
  if (!panelAuthEnabled()) {
    return NextResponse.json({ error: 'Login do painel está desativado.' }, { status: 404 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const pw = (body.password ?? '').trim();
  if (!pw || pw !== process.env.PANEL_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PANEL_COOKIE, await panelToken(pw), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}

/** Logout: limpa o cookie de sessão. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PANEL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
