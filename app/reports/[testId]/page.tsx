import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Badge, ClassificationBadge, StatusBadge } from '@/components/StatusBadge';
import { CommentForm } from '@/components/CommentForm';
import { reportsRepo } from '@/lib/repository';
import {
  formatDate,
  formatGb,
  labelManual,
  labelTest,
  statusToTone,
} from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ testId: string }>;
}

const GENERAL_KEY = '_general';

export default async function ReportDetailPage({ params }: PageProps) {
  const { testId } = await params;
  const report = await reportsRepo.getById(testId);
  if (!report) notFound();

  const comments = report.comments ?? [];
  const commentsByKey = new Map<string, typeof comments>();
  for (const c of comments) {
    const k = c.test_key || GENERAL_KEY;
    const arr = commentsByKey.get(k) ?? [];
    arr.push(c);
    commentsByKey.set(k, arr);
  }

  const m = report.machine;

  // Conjunto de testes automáticos esperados; os ausentes em report.tests
  // são considerados "não realizados".
  const EXPECTED_TESTS = ['ram', 'bateria', 'carregador', 'hdmi', 'wifi', 'bluetooth', 'internet', 'audio', 'microfone', 'webcam', 'teclado', 'touchpad', 'tela_pixels', 'stress'];
  const doneKeys = new Set(Object.keys(report.tests ?? {}));
  const untestedTests = EXPECTED_TESTS.filter((k) => !doneKeys.has(k));

  return (
    <Shell
      title={`Relatório ${m.ntb_code || report.test_id.slice(0, 8)}`}
      subtitle={`${[m.manufacturer, m.model].filter(Boolean).join(' ') || 'Equipamento'} • ${formatDate(report.tested_at)}`}
      actions={
        <Link href="/reports" className="btn-outline">
          Voltar
        </Link>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Identificação</h2>
            <ClassificationBadge value={report.final_classification} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Código NTB" value={m.ntb_code || '—'} mono />
            <Field label="Localização" value={m.location || '—'} />
            <Field label="Fabricante" value={m.manufacturer || '—'} />
            <Field label="Modelo" value={m.model || '—'} />
            <Field label="Serial" value={m.serial || '—'} mono />
            <Field label="Hostname" value={m.hostname} />
            <Field label="CPU" value={m.cpu || '—'} />
            <Field label="RAM" value={formatGb(m.ram_gb)} />
            <Field label="SO" value={`${m.os} ${m.os_version}`} />
            <Field label="Resolução" value={m.screen_resolution} />
            <Field
              label={
                m.graphics_adapters && m.graphics_adapters.length > 1
                  ? `Adaptadores gráficos (${m.graphics_adapters.length})`
                  : 'Adaptador gráfico'
              }
              value={
                m.graphics_adapters && m.graphics_adapters.length > 0
                  ? m.graphics_adapters.join(' • ')
                  : (m.graphics_adapter || '—')
              }
            />
            <Field label="MAC" value={m.mac_address || '—'} mono />
            <Field
              label="Conectividade"
              value={[
                `${m.network_adapters_wifi ?? 0} Wi-Fi`,
                `${m.network_adapters_ethernet ?? 0} Ethernet`,
                m.bluetooth_version ? `Bluetooth ${m.bluetooth_version}` : null,
              ].filter(Boolean).join(' • ')}
            />
            <Field label="TPM" value={`${m.tpm}${m.tpm_version ? ` (${m.tpm_version})` : ''}`} />
            <Field label="Secure Boot" value={m.secure_boot} />
            <Field label="Autopilot" value={m.autopilot} />
            <Field label="Ativação" value={m.windows_activation} />
            <Field label="Teclado retroiluminado" value={m.keyboard_backlight} />
            <Field label="Teclado numérico" value={m.has_numeric_keypad == null ? '—' : (m.has_numeric_keypad ? 'Sim' : 'Não')} />
            <Field label="Etiqueta" value={report.asset_tag || '—'} />
          </dl>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Resumo</h2>
          <dl className="space-y-3 text-sm">
            <Field label="Tipo" value={report.report_type === 'retest' ? 'Reteste' : 'Checklist completo'} />
            <Field label="Técnico" value={report.technician_name || '—'} />
            <Field label="Realizado em" value={formatDate(report.tested_at)} />
            <Field label="Recebido em" value={formatDate(report.received_at)} />
            <Field label="ID" value={report.test_id} mono />
          </dl>
          {report.general_notes ? (
            <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700 dark:bg-ink-700/40 dark:text-ink-200">
              <div className="label mb-1">Observações gerais</div>
              {report.general_notes}
            </div>
          ) : null}
          {report.repair_notes ? (
            <div className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700 dark:bg-ink-700/40 dark:text-ink-200">
              <div className="label mb-1">Notas de reparo</div>
              {report.repair_notes}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Testes automáticos</h2>
        <div className="card divide-y divide-ink-100 dark:divide-ink-700">
          {Object.entries(report.tests).length === 0 ? (
            <div className="p-6 text-sm text-ink-500 dark:text-ink-400">
              Nenhum teste automático registrado.
            </div>
          ) : (
            Object.entries(report.tests).map(([key, t]) => {
              const tone = statusToTone(t.status);
              const needsComment = tone !== 'ok';
              return (
                <article key={key} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                          {labelTest(key)}
                        </h3>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">
                        {t.details || '—'}
                      </p>
                      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                        Executado em {formatDate(t.executed_at)}
                      </p>
                    </div>
                  </div>
                  <CommentList comments={commentsByKey.get(key) ?? []} />
                  <CommentForm
                    testId={report.test_id}
                    testKey={key}
                    open={needsComment && (commentsByKey.get(key)?.length ?? 0) === 0}
                    placeholder={
                      needsComment
                        ? 'Comente o motivo da falha ou de não ter sido testado'
                        : 'Adicione contexto para este teste'
                    }
                  />
                </article>
              );
            })
          )}
        </div>
      </section>

      {report.stress ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Benchmark e stress</h2>
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StressStat label="Nota final" value={report.stress.final_score} />
              <StressStat label="CPU Single" value={report.stress.cpu_single_thread} />
              <StressStat label="CPU Multi" value={report.stress.cpu_multi_thread} />
              <StressStat label="CPU eficiência" value={report.stress.cpu_efficiency} suffix="%" />
              <StressStat label="GPU Graphics" value={report.stress.gpu_graphics} />
              <StressStat label="GPU Compute" value={report.stress.gpu_compute} />
              <StressStat label="GPU Bandwidth" value={report.stress.gpu_bandwidth} />
              <StressStat label="Disco" value={report.stress.disk_score}
                hint={report.stress.disk_read_mb_s != null
                  ? `↓${Math.round(report.stress.disk_read_mb_s)} ↑${Math.round(report.stress.disk_write_mb_s ?? 0)} MB/s`
                  : undefined} />
              <StressStat label="Geekbench Single" value={report.stress.geekbench_single} />
              <StressStat label="Geekbench Multi" value={report.stress.geekbench_multi} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {report.stress.gpu_name ? (
                <span className="rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-700/40">GPU: {report.stress.gpu_name}</span>
              ) : null}
              <span className="rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-700/40">
                VRAM: {report.stress.vram_ok ? `OK (${report.stress.vram_allocated_mb ?? 0} MB)` : `corrompida (${report.stress.vram_mismatch_count ?? 0})`}
              </span>
              <span className="rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-700/40">
                RAM: {report.stress.ram_ok ? `OK (${report.stress.ram_allocated_mb ?? 0} MB)` : `erros (${report.stress.ram_error_count ?? 0})`}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {untestedTests.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Testes não realizados</h2>
          <div className="card p-5">
            <div className="flex flex-wrap gap-2">
              {untestedTests.map((key) => (
                <span key={key} className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  {labelTest(key)}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">
              Estes testes não foram executados neste checklist.
            </p>
          </div>
        </section>
      ) : null}

      {Object.keys(report.manual_checklist ?? {}).length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Inspeção física</h2>
          <div className="card divide-y divide-ink-100 dark:divide-ink-700">
            {Object.entries(report.manual_checklist).map(([key, item]) => (
              <article key={key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                        {labelManual(key)}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.notes ? (
                      <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{item.notes}</p>
                    ) : null}
                  </div>
                </div>
                <CommentList comments={commentsByKey.get(key) ?? []} />
                <CommentForm
                  testId={report.test_id}
                  testKey={key}
                  compact
                  placeholder="Comente este item"
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {(report.inspection_photos ?? []).length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Fotos da inspeção física</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(report.inspection_photos ?? []).map((p) => (
              <figure key={p.item_key} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${p.image_base64}`}
                  alt={p.label}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="p-3">
                  <div className="text-sm font-semibold text-ink-900 dark:text-white">{p.label}</div>
                  {p.note ? (
                    <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">{p.note}</div>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Comentários gerais</h2>
        <div className="card p-5">
          <CommentList comments={commentsByKey.get(GENERAL_KEY) ?? []} />
          <CommentForm
            testId={report.test_id}
            testKey={GENERAL_KEY}
            open
            placeholder="Adicione um comentário sobre o relatório"
          />
        </div>
      </section>
    </Shell>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd
        className={`mt-0.5 text-ink-900 dark:text-white ${mono ? 'font-mono text-xs' : 'text-sm'}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StressStat({ label, value, suffix, hint }: { label: string; value?: number | null; suffix?: string; hint?: string }) {
  const show = value != null && value > 0;
  return (
    <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-700/40">
      <div className="label">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-ink-900 dark:text-white">
        {show ? `${value}${suffix ?? ''}` : '—'}
      </div>
      {hint ? <div className="text-xs text-ink-500 dark:text-ink-400">{hint}</div> : null}
    </div>
  );
}

function CommentList({
  comments,
}: {
  comments: { id: string; author: string; text: string; created_at: string }[];
}) {
  if (comments.length === 0) return null;
  return (
    <ul className="mt-4 space-y-3 border-t border-ink-100 pt-4 dark:border-ink-700">
      {comments.map((c) => (
        <li key={c.id} className="rounded-lg bg-ink-50 p-3 dark:bg-ink-700/40">
          <div className="flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
            <span className="font-medium text-ink-700 dark:text-ink-200">{c.author}</span>
            <span>{formatDate(c.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800 dark:text-ink-100">
            {c.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
