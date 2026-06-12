'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Botão "Remover" da lista de relatórios. Pede confirmação (a remoção é
 * definitiva — o painel também funciona como estoque) e recarrega a lista.
 */
export function DeleteReportButton({ testId, label }: { testId: string; label?: string }) {
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
      router.refresh();
    } catch {
      window.alert('Não foi possível remover. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      title="Remover relatório definitivamente"
    >
      {busy ? 'Removendo…' : 'Remover'}
    </button>
  );
}
