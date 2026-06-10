'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportDoc } from '@/lib/types';

const CLASSIFICATIONS = ['Aprovado', 'Aprovado com ressalvas', 'Reprovado'];
const TEST_STATUSES = ['OK', 'Atenção', 'Falha', 'Não testado', 'Não aplicável'];
const MANUAL_STATUSES = ['OK', 'Com defeito', 'Não testado', 'Observação'];
const INSPECTION_STATUSES: { value: '' | 'ok' | 'problema'; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'problema', label: 'Com problema' },
  { value: '', label: 'Sem avaliação' },
];

type Section = 'ident' | 'tests' | 'manual' | 'inspection';

interface InspectionEdit {
  item_key: string;
  label: string;
  image_base64?: string;
  status: '' | 'ok' | 'problema';
  note: string;
}

/**
 * Editor completo do relatório para os técnicos manipularem o estoque no site.
 * Organizado em abas: identificação, testes, inspeção manual e inspeção física
 * (foto + status + comentário). Os campos gerais e os testes/manual são salvos
 * via PATCH /api/reports/:id; a avaliação das fotos via PATCH .../inspection.
 */
export function ReportEditor({ report }: { report: ReportDoc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>('ident');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const m = report.machine;
  const [ntb, setNtb] = useState(m.ntb_code ?? '');
  const [location, setLocation] = useState(m.location ?? '');
  const [technician, setTechnician] = useState(report.technician_name ?? '');
  const [assetTag, setAssetTag] = useState(report.asset_tag ?? '');
  const [manufacturer, setManufacturer] = useState(m.manufacturer ?? '');
  const [model, setModel] = useState(m.model ?? '');
  const [serial, setSerial] = useState(m.serial ?? '');
  const [cpu, setCpu] = useState(m.cpu ?? '');
  const [classification, setClassification] = useState(report.final_classification ?? '');
  const [notes, setNotes] = useState(report.general_notes ?? '');

  const [tests, setTests] = useState(() =>
    Object.entries(report.tests ?? {}).map(([key, t]) => ({ key, status: t.status, details: t.details })),
  );
  const [manual, setManual] = useState(() =>
    Object.entries(report.manual_checklist ?? {}).map(([key, item]) => ({ key, status: item.status, notes: item.notes })),
  );
  const [inspection, setInspection] = useState<InspectionEdit[]>(() =>
    (report.inspection_photos ?? []).map((p) => ({
      item_key: p.item_key,
      label: p.label,
      image_base64: p.image_base64,
      status: (p.status as '' | 'ok' | 'problema') ?? '',
      note: p.note ?? '',
    })),
  );

  const tabs = useMemo(() => {
    const t: { id: Section; label: string; show: boolean }[] = [
      { id: 'ident', label: 'Identificação', show: true },
      { id: 'tests', label: `Testes (${tests.length})`, show: tests.length > 0 },
      { id: 'manual', label: `Inspeção manual (${manual.length})`, show: manual.length > 0 },
      { id: 'inspection', label: `Fotos (${inspection.length})`, show: inspection.length > 0 },
    ];
    return t.filter((x) => x.show);
  }, [tests.length, manual.length, inspection.length]);

  async function save() {
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const patch: Record<string, unknown> = {
        'machine.ntb_code': ntb,
        'machine.location': location,
        'machine.manufacturer': manufacturer,
        'machine.model': model,
        'machine.serial': serial,
        'machine.cpu': cpu,
        technician_name: technician,
        asset_tag: assetTag,
        final_classification: classification,
        general_notes: notes,
      };
      const testsObj: Record<string, unknown> = {};
      for (const t of tests) {
        const original = report.tests?.[t.key];
        testsObj[t.key] = {
          status: t.status,
          details: t.details,
          executed_at: original?.executed_at ?? new Date().toISOString(),
        };
      }
      patch['tests'] = testsObj;

      const manualObj: Record<string, unknown> = {};
      for (const item of manual) {
        manualObj[item.key] = { status: item.status, notes: item.notes };
      }
      patch['manual_checklist'] = manualObj;

      const r = await fetch(`/api/reports/${encodeURIComponent(report.test_id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `HTTP ${r.status}`);
      }

      // Avaliação das fotos (status + nota) via endpoint dedicado (sem imagens).
      if (inspection.length > 0) {
        const evals = inspection.map((i) => ({
          item_key: i.item_key,
          status: i.status || null,
          note: i.note,
        }));
        const ri = await fetch(`/api/reports/${encodeURIComponent(report.test_id)}/inspection`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ evals }),
        });
        if (!ri.ok) {
          const body = await ri.json().catch(() => ({}));
          throw new Error(body?.message || body?.error || `HTTP ${ri.status}`);
        }
      }

      setOk(true);
      router.refresh();
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        ✏️ Editar relatório
      </button>
    );
  }

  return (
    <div className="card mt-4 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Editar relatório</h2>
        <button onClick={() => setOpen(false)} className="btn-ghost">Fechar</button>
      </div>

      {/* Abas */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-ink-200 dark:border-ink-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`-mb-px rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              section === t.id
                ? 'border-b-2 border-brand-600 text-brand-600 dark:text-brand-400'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'ident' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EditField label="Código NTB" value={ntb} onChange={setNtb} />
            <EditField label="Localização" value={location} onChange={setLocation} />
            <EditField label="Técnico" value={technician} onChange={setTechnician} />
            <EditField label="Etiqueta de patrimônio" value={assetTag} onChange={setAssetTag} />
            <EditField label="Fabricante" value={manufacturer} onChange={setManufacturer} />
            <EditField label="Modelo" value={model} onChange={setModel} />
            <EditField label="Serial" value={serial} onChange={setSerial} />
            <EditField label="CPU" value={cpu} onChange={setCpu} />
            <div>
              <label className="label">Classificação final</label>
              <select className="select mt-1 w-full" value={classification} onChange={(e) => setClassification(e.target.value)}>
                {!CLASSIFICATIONS.includes(classification) ? <option value={classification}>{classification || '—'}</option> : null}
                {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Observações gerais</label>
            <textarea className="textarea mt-1 w-full" rows={3} maxLength={2000}
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </>
      ) : null}

      {section === 'tests' ? (
        <div className="space-y-2">
          {tests.map((t, i) => (
            <div key={t.key} className="grid items-center gap-2 sm:grid-cols-[160px_160px_1fr]">
              <span className="text-sm text-ink-700 dark:text-ink-200">{t.key}</span>
              <select className="select" value={t.status}
                onChange={(e) => setTests((arr) => arr.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}>
                {!TEST_STATUSES.includes(t.status) ? <option value={t.status}>{t.status}</option> : null}
                {TEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input" value={t.details}
                onChange={(e) => setTests((arr) => arr.map((x, j) => j === i ? { ...x, details: e.target.value } : x))} />
            </div>
          ))}
        </div>
      ) : null}

      {section === 'manual' ? (
        <div className="space-y-2">
          {manual.map((item, i) => (
            <div key={item.key} className="grid items-center gap-2 sm:grid-cols-[160px_160px_1fr]">
              <span className="text-sm text-ink-700 dark:text-ink-200">{item.key}</span>
              <select className="select" value={item.status}
                onChange={(e) => setManual((arr) => arr.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}>
                {!MANUAL_STATUSES.includes(item.status) ? <option value={item.status}>{item.status}</option> : null}
                {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input" value={item.notes}
                onChange={(e) => setManual((arr) => arr.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} />
            </div>
          ))}
        </div>
      ) : null}

      {section === 'inspection' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inspection.map((it, i) => (
            <div key={it.item_key} className="overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
              {it.image_base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`data:image/jpeg;base64,${it.image_base64}`} alt={it.label}
                  className="aspect-video w-full object-cover" />
              ) : null}
              <div className="space-y-2 p-3">
                <div className="text-sm font-semibold text-ink-900 dark:text-white">{it.label}</div>
                <select className="select w-full" value={it.status}
                  onChange={(e) => setInspection((arr) => arr.map((x, j) => j === i ? { ...x, status: e.target.value as InspectionEdit['status'] } : x))}>
                  {INSPECTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <textarea className="textarea w-full" rows={2} placeholder="Comentário do item"
                  value={it.note}
                  onChange={(e) => setInspection((arr) => arr.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="mt-4 text-sm text-bad">{error}</div> : null}
      {ok ? <div className="mt-4 text-sm text-ok">Salvo com sucesso ✓</div> : null}

      <div className="mt-6 flex gap-2 border-t border-ink-100 pt-4 dark:border-ink-700">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-1 w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
