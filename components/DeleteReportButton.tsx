'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Botão "Remover" de relatório. Pede confirmação (a remoção é definitiva — o
 * painel também funciona como estoque). Na lista recarrega a página; dentro do
 * relatório (com `redirectTo`) volta para a lista após remover.
 */
export function DeleteReportButton({
  testId,
  label,
  redirectTo,
  variant = 'link',
}: {
  testId: string;
  label?: string;
  /** Para onde navegar após remover (ex.: '/reports'). Sem isso, faz refresh. */
  redirectTo?: string;
  /** 'link' = texto discreto (lista); 'button' = botão do cabeçalho. */
  variant?: 'link' | 'button';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const name = label || testId.slice(0, 8);
    if (!window.confirm(`Remover o relatório ${name}?\n\nIsso apaga o registro definitivamente (fotos e comentários inclusos).`)) {
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/reports/${encodeURIComponent(testId)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      window.alert('Não foi possível remover. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  const className = variant === 'button'
    ? 'btn-outline text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10'
    : 'text-red-600 hover:underline disabled:opacity-50 dark:text-red-400';

  return (
    <button
      onClick={remove}
      disabled={busy}
      className={className}
      title="Remover relatório definitivamente"
    >
      {busy ? 'Removendo…' : variant === 'button' ? '🗑 Remover' : 'Remover'}
    </button>
  );
}
