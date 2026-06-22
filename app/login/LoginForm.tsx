'use client';

import { useState } from 'react';

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      // Recarrega no destino — o cookie já está setado.
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="panel-password" className="label">Senha</label>
        <div className="mt-1 flex gap-2">
          <input
            id="panel-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="btn-outline shrink-0"
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>
      {error ? (
        <div role="alert" className="text-[13px] text-bad">{error}</div>
      ) : null}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
