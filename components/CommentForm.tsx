'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  testId: string;
  testKey: string;
  /** Quando true, o textarea começa expandido (modo "abrir caixa de comentário"). */
  open?: boolean;
  placeholder?: string;
  compact?: boolean;
}

export function CommentForm({
  testId,
  testKey,
  open = false,
  placeholder = 'Descreva o ocorrido (motivo de não testar, defeito observado, etc.)',
  compact = false,
}: Props) {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(open);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(
        `/api/reports/${encodeURIComponent(testId)}/comments`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ test_key: testKey, author, text }),
        },
      );
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(
          body?.issues?.formErrors?.join(', ') ||
            body?.error ||
            `HTTP ${r.status}`,
        );
      }
      setText('');
      router.refresh();
      if (!open) setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!showForm && !open) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        + Adicionar comentário
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? 'mt-2 space-y-2' : 'space-y-3'}>
      <div className={compact ? 'flex gap-2' : 'grid gap-3 sm:grid-cols-[200px_1fr]'}>
        <input
          required
          maxLength={100}
          placeholder="Seu nome ou matrícula"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="input"
        />
        <textarea
          required
          maxLength={2000}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="textarea"
          rows={compact ? 2 : 3}
        />
      </div>
      {error ? <div className="text-xs text-bad">{error}</div> : null}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Enviando…' : 'Salvar comentário'}
        </button>
        {!open ? (
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn-ghost"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
