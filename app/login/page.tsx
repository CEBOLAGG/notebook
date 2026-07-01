import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/') ? sp.next : '/';

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Notelet" className="h-6 w-auto" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-ink-900 dark:text-white">Notelet</div>
            <div className="text-[11px] text-ink-500 dark:text-ink-400">Estoque &amp; relatórios</div>
          </div>
        </div>
        <h1 className="mb-1 text-lg font-semibold tracking-tight text-ink-900 dark:text-white">Entrar no painel</h1>
        <p className="mb-5 text-[13px] text-ink-500 dark:text-ink-400">
          Acesso restrito. Informe a senha do painel para continuar.
        </p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
