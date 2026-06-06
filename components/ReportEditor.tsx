'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportDoc } from '@/lib/types';

const CLASSIFICATIONS = ['Aprovado', 'Aprovado com ressalvas', 'Reprovado'];
const TEST_STATUSES = ['OK', 'Atenção', 'Falha', 'Não testado', 'Não aplicável'];
const MANUAL_STATUSES = ['OK', 'Com defeito', 'Não testado', 'Observação'];

/**
 * Editor completo do relatório para os técnicos manipularem o estoque no site.
 * Permite editar identificação, classificação, observações, status/detalhes
 * de cada teste e itens da inspeção manual. Salva via PATCH /api/reports/:id.
 */
export function ReportEditor({ report }: { report: ReportDoc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const m = report.machine;
  // Estado editável (cópias rasas).
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
      // Reconstrói tests e manual_checklist completos.
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

      {tests.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Testes automáticos</h3>
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
        </div>
      ) : null}

      {manual.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Inspeção manual</h3>
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
        </div>
      ) : null}

      {error ? <div className="mt-4 text-sm text-bad">{error}</div> : null}
      {ok ? <div className="mt-4 text-sm text-ok">Salvo com sucesso ✓</div> : null}

      <div className="mt-6 flex gap-2">
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
