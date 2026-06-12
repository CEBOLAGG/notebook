'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';

type Status = 'ok' | 'problema' | null;

interface ItemState {
  key: string;
  label: string;
  instruction: string;
  optional?: boolean;
  done: boolean;
  status: Status;
  note: string | null;
}

interface StateResp {
  found: boolean;
  serial: string;
  machine: string;
  /** total/done contam só as fotos principais; defeitos são opcionais. */
  total: number;
  done: number;
  defects?: number;
  items: ItemState[];
}

export default function InspecaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serial?: string; machine?: string }>;
}) {
  const { slug } = use(params);
  const sp = use(searchParams);

  const [state, setState] = useState<StateResp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Rascunho local de avaliação por item (status + nota) ainda não enviado.
  const [draft, setDraft] = useState<Record<string, { status: Status; note: string }>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (sp.serial) qs.set('serial', sp.serial);
      if (sp.machine) qs.set('machine', sp.machine);
      const r = await fetch(`/api/inspecao/${slug}?${qs.toString()}`, { cache: 'no-store' });
      const data: StateResp = await r.json();
      setState(data);
      setError(null);
      // Semeia o rascunho com o que já está salvo (sem sobrescrever edição em curso).
      setDraft((prev) => {
        const next = { ...prev };
        for (const it of data.items ?? []) {
          if (next[it.key] === undefined && it.done) {
            next[it.key] = { status: it.status, note: it.note ?? '' };
          }
        }
        return next;
      });
    } catch {
      setError('Sem conexão. Verifique a internet do celular.');
    }
  }, [slug, sp.serial, sp.machine]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  // Envia a foto (e a avaliação atual, se já escolhida).
  async function uploadPhoto(key: string, file: File | undefined) {
    if (!file) return;
    setBusy(key);
    try {
      const dataUrl = await resizeToJpeg(file, 1280, 0.7);
      const d = draft[key] ?? { status: null, note: '' };
      const r = await fetch(`/api/inspecao/${slug}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, image: dataUrl, status: d.status, note: d.note }),
      });
      if (!r.ok) throw new Error('falha no upload');
      await load();
    } catch {
      setError('Não foi possível enviar a foto. Tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  // Salva só a avaliação (status + nota) de um item que já tem foto.
  async function saveEvaluation(key: string) {
    const d = draft[key] ?? { status: null, note: '' };
    setBusy(key);
    try {
      const r = await fetch(`/api/inspecao/${slug}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, status: d.status, note: d.note }),
      });
      if (!r.ok) throw new Error('falha ao salvar');
      await load();
    } catch {
      setError('Não foi possível salvar a avaliação. Tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  function setDraftStatus(key: string, status: Status) {
    setDraft((p) => ({ ...p, [key]: { status, note: p[key]?.note ?? '' } }));
  }
  function setDraftNote(key: string, note: string) {
    setDraft((p) => ({ ...p, [key]: { status: p[key]?.status ?? null, note } }));
  }

  if (!state) {
    return (
      <main style={S.page}>
        <div style={{ padding: 24, textAlign: 'center', color: '#9aa3b2' }}>
          {error ?? 'Carregando…'}
        </div>
      </main>
    );
  }

  const evaluated = state.items.filter((i) => i.done && i.status).length;
  // Slots de defeito são DINÂMICOS: só aparecem os já enviados + um botão
  // "adicionar" que usa o próximo slot livre (até 5).
  const visibleItems = state.items.filter((i) => !i.optional || i.done);
  const nextDefect = state.items.find((i) => i.optional && !i.done);

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Inspeção física</h1>
        <div style={S.sub}>
          {(state.machine || 'Equipamento')} • Serial {state.serial || '—'}
        </div>
        <div style={S.prog}>
          {state.done} de {state.total} fotos principais
          {(state.defects ?? 0) > 0 ? ` • ${state.defects} defeito(s)` : ''} • {evaluated} avaliadas
        </div>
        <div style={{ fontSize: 11, color: '#9aa3b2', marginTop: 4 }}>
          Todas as fotos são opcionais — envie as que fizerem sentido.
        </div>
        {error ? <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>{error}</div> : null}
      </header>

      <div style={S.list}>
        {visibleItems.map((it) => {
          const d = draft[it.key] ?? { status: it.status, note: it.note ?? '' };
          const isBusy = busy === it.key;
          // Há mudança de avaliação ainda não salva?
          const dirty = it.done && (d.status !== it.status || (d.note ?? '') !== (it.note ?? ''));
          return (
            <div key={it.key} style={{ ...S.card, ...(it.done ? cardTone(it.status) : {}) }}>
              <div style={S.row}>
                <div style={{ ...S.ck, ...(it.done ? S.ckOn : {}) }}>{it.done ? '✓' : ''}</div>
                <div style={S.lbl}>
                  {it.label}
                  {it.optional ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#9aa3b2', marginLeft: 6,
                                   border: '1px solid #3a4150', borderRadius: 999, padding: '1px 7px' }}>
                      opcional
                    </span>
                  ) : null}
                </div>
                {it.done && it.status ? (
                  <span style={{ ...S.tag, ...(it.status === 'ok' ? S.tagOk : S.tagBad) }}>
                    {it.status === 'ok' ? 'OK' : 'Problema'}
                  </span>
                ) : null}
              </div>
              <div style={S.ins}>{it.instruction}</div>

              {it.done ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/inspecao/${slug}/photo/${it.key}?t=${Date.now()}`}
                  alt={it.label}
                  style={S.thumb}
                />
              ) : null}

              <input
                ref={(el) => { fileInputs.current[it.key] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => uploadPhoto(it.key, e.target.files?.[0])}
              />

              <button
                style={{ ...S.btn, ...(it.done ? S.btnRe : {}) }}
                disabled={isBusy}
                onClick={() => fileInputs.current[it.key]?.click()}
              >
                {isBusy ? 'Enviando…' : it.done ? 'Tirar outra foto' : '📷 Tirar foto'}
              </button>

              {/* Avaliação aparece depois da foto. */}
              {it.done ? (
                <div style={S.eval}>
                  <div style={S.evalTitle}>Este item está OK ou tem problema?</div>
                  <div style={S.statusRow}>
                    <button
                      onClick={() => setDraftStatus(it.key, 'ok')}
                      style={{ ...S.statusBtn, ...(d.status === 'ok' ? S.statusOkOn : {}) }}
                    >
                      ✓ OK
                    </button>
                    <button
                      onClick={() => setDraftStatus(it.key, 'problema')}
                      style={{ ...S.statusBtn, ...(d.status === 'problema' ? S.statusBadOn : {}) }}
                    >
                      ⚠ Com problema
                    </button>
                  </div>
                  <textarea
                    value={d.note}
                    onChange={(e) => setDraftNote(it.key, e.target.value)}
                    placeholder={d.status === 'problema'
                      ? 'Descreva o problema (obrigatório)'
                      : 'Comentário (opcional)'}
                    rows={2}
                    style={S.note}
                  />
                  <button
                    onClick={() => saveEvaluation(it.key)}
                    disabled={isBusy || !dirty || (d.status === 'problema' && !d.note.trim())}
                    style={{ ...S.saveBtn, ...((!dirty || (d.status === 'problema' && !d.note.trim())) ? S.saveOff : {}) }}
                  >
                    {isBusy ? 'Salvando…' : dirty ? 'Salvar avaliação' : 'Avaliação salva ✓'}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Card "adicionar defeito": aparece enquanto houver slot livre (até 5). */}
        {nextDefect ? (
          <div style={{ ...S.card, borderStyle: 'dashed' }}>
            <div style={S.lbl}>📌 Encontrou um defeito?</div>
            <div style={S.ins}>
              Tire uma foto de cada defeito (risco, trinca, mancha, tecla...). Opcional — adicione quantas precisar (até 5).
            </div>
            <input
              ref={(el) => { fileInputs.current[nextDefect.key] = el; }}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => uploadPhoto(nextDefect.key, e.target.files?.[0])}
            />
            <button
              style={{ ...S.btn, background: '#262c38', color: '#cdd4e0' }}
              disabled={busy === nextDefect.key}
              onClick={() => fileInputs.current[nextDefect.key]?.click()}
            >
              {busy === nextDefect.key ? 'Enviando…' : '➕ Adicionar foto de defeito'}
            </button>
          </div>
        ) : null}
      </div>

      <footer style={S.footer}>
        As fotos e avaliações são salvas no relatório deste equipamento (serial {state.serial || '—'}).
      </footer>
    </main>
  );
}

function cardTone(status: Status): React.CSSProperties {
  if (status === 'problema') return { borderColor: '#b3502f' };
  if (status === 'ok') return { borderColor: '#2f7d4f' };
  return { borderColor: '#7d6a2f' }; // foto sem avaliação ainda
}

/** Redimensiona a imagem no celular antes de enviar (economiza dados/memória). */
function resizeToJpeg(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > max || height > max) {
          const s = Math.min(max / width, max / height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const cv = document.createElement('canvas');
        cv.width = width;
        cv.height = height;
        const ctx = cv.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f1115', color: '#e7eaf0', paddingBottom: 40,
          fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' },
  header: { position: 'sticky', top: 0, background: '#161a21', padding: '16px 18px',
            borderBottom: '1px solid #262c38', zIndex: 10 },
  h1: { fontSize: 18, margin: '0 0 4px' },
  sub: { fontSize: 12, color: '#9aa3b2' },
  prog: { fontSize: 13, color: '#6ea8fe', marginTop: 6, fontWeight: 600 },
  list: { padding: 14, display: 'flex', flexDirection: 'column', gap: 14 },
  card: { background: '#161a21', border: '1px solid #262c38', borderRadius: 14, padding: 14 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  ck: { width: 26, height: 26, borderRadius: '50%', border: '2px solid #3a4150', flex: '0 0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#0f1115' },
  ckOn: { background: '#34c759', borderColor: '#34c759' },
  lbl: { fontSize: 15, fontWeight: 600, flex: 1 },
  tag: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 },
  tagOk: { background: 'rgba(52,199,89,0.18)', color: '#5bd47a' },
  tagBad: { background: 'rgba(255,107,107,0.18)', color: '#ff8a8a' },
  ins: { fontSize: 12.5, color: '#9aa3b2', margin: '8px 0 12px', lineHeight: 1.45 },
  thumb: { width: '100%', borderRadius: 10, margin: '8px 0', display: 'block' },
  btn: { width: '100%', border: 0, borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600,
         background: '#3b82f6', color: '#fff', cursor: 'pointer' },
  btnRe: { background: '#262c38', color: '#cdd4e0' },
  eval: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #262c38' },
  evalTitle: { fontSize: 13, fontWeight: 600, marginBottom: 8 },
  statusRow: { display: 'flex', gap: 8, marginBottom: 8 },
  statusBtn: { flex: 1, border: '1px solid #3a4150', borderRadius: 10, padding: 11, fontSize: 14,
               fontWeight: 600, background: '#0f1115', color: '#cdd4e0', cursor: 'pointer' },
  statusOkOn: { background: '#1f7a44', borderColor: '#34c759', color: '#fff' },
  statusBadOn: { background: '#9b3b22', borderColor: '#ff6b6b', color: '#fff' },
  note: { width: '100%', boxSizing: 'border-box', background: '#0f1115', color: '#e7eaf0',
          border: '1px solid #3a4150', borderRadius: 10, padding: 10, fontSize: 14, resize: 'vertical' },
  saveBtn: { width: '100%', marginTop: 8, border: 0, borderRadius: 10, padding: 12, fontSize: 14,
             fontWeight: 600, background: '#3b82f6', color: '#fff', cursor: 'pointer' },
  saveOff: { background: '#262c38', color: '#7b8494', cursor: 'default' },
  footer: { textAlign: 'center', fontSize: 11, color: '#6b7384', padding: 20 },
};
