'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';

interface ItemState {
  key: string;
  label: string;
  instruction: string;
  done: boolean;
}

interface StateResp {
  found: boolean;
  serial: string;
  machine: string;
  total: number;
  done: number;
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
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (sp.serial) qs.set('serial', sp.serial);
      if (sp.machine) qs.set('machine', sp.machine);
      const r = await fetch(`/api/inspecao/${slug}?${qs.toString()}`, { cache: 'no-store' });
      const data = await r.json();
      setState(data);
      setError(null);
    } catch {
      setError('Sem conexão. Verifique a internet do celular.');
    }
  }, [slug, sp.serial, sp.machine]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function upload(key: string, file: File | undefined) {
    if (!file) return;
    setBusy(key);
    try {
      const dataUrl = await resizeToJpeg(file, 1280, 0.7);
      const r = await fetch(`/api/inspecao/${slug}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_key: key, image: dataUrl }),
      });
      if (!r.ok) throw new Error('falha no upload');
      await load();
    } catch {
      setError('Não foi possível enviar a foto. Tente de novo.');
    } finally {
      setBusy(null);
    }
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

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Inspeção física</h1>
        <div style={S.sub}>
          {(state.machine || 'Equipamento')} • Serial {state.serial || '—'}
        </div>
        <div style={S.prog}>{state.done} de {state.total} fotos</div>
        {error ? <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>{error}</div> : null}
      </header>

      <div style={S.list}>
        {state.items.map((it) => (
          <div key={it.key} style={{ ...S.card, ...(it.done ? S.cardDone : {}) }}>
            <div style={S.row}>
              <div style={{ ...S.ck, ...(it.done ? S.ckOn : {}) }}>{it.done ? '✓' : ''}</div>
              <div style={S.lbl}>{it.label}</div>
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
              onChange={(e) => upload(it.key, e.target.files?.[0])}
            />
            <button
              style={{ ...S.btn, ...(it.done ? S.btnRe : {}) }}
              disabled={busy === it.key}
              onClick={() => fileInputs.current[it.key]?.click()}
            >
              {busy === it.key ? 'Enviando…' : it.done ? 'Tirar outra foto' : '📷 Tirar foto'}
            </button>
          </div>
        ))}
      </div>

      <footer style={S.footer}>
        As fotos são salvas no relatório deste equipamento (serial {state.serial || '—'}).
      </footer>
    </main>
  );
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
  cardDone: { borderColor: '#2f7d4f' },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  ck: { width: 26, height: 26, borderRadius: '50%', border: '2px solid #3a4150', flex: '0 0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#0f1115' },
  ckOn: { background: '#34c759', borderColor: '#34c759' },
  lbl: { fontSize: 15, fontWeight: 600 },
  ins: { fontSize: 12.5, color: '#9aa3b2', margin: '8px 0 12px', lineHeight: 1.45 },
  thumb: { width: '100%', borderRadius: 10, margin: '8px 0', display: 'block' },
  btn: { width: '100%', border: 0, borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600,
         background: '#3b82f6', color: '#fff', cursor: 'pointer' },
  btnRe: { background: '#262c38', color: '#cdd4e0' },
  footer: { textAlign: 'center', fontSize: 11, color: '#6b7384', padding: 20 },
};
