import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Badge, ClassificationBadge, StatusBadge } from '@/components/StatusBadge';
import { CommentForm } from '@/components/CommentForm';
import { DeleteReportButton } from '@/components/DeleteReportButton';
import { Icon } from '@/components/Icon';
import { reportsRepo } from '@/lib/repository';
import { INSPECTION_ITEMS, LEGACY_INSPECTION_LABELS } from '@/lib/inspection-items';
import {
  formatDate,
  labelTest,
  statusToTone,
} from '@/lib/format';
import type { ReportDoc } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ testId: string }>;
}

const GENERAL_KEY = '_general';

export default async function ReportDetailPage({ params }: PageProps) {
  const { testId } = await params;
  const reportRaw = await reportsRepo.getById(testId);
  if (!reportRaw) notFound();
  // Remove _id (ObjectId não serializa para Client Components).
  const { _id, ...report } = reportRaw as unknown as { _id?: unknown } & typeof reportRaw;
  void _id;

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
  // 'audio' (tom 1 kHz) foi aposentado — o estéreo L/R cobre a saída de som.
  // Os testes do técnico (estéreo, microfone, câmera, tela, brilho, teclado,
  // touchpad, descarga, throttling) só aparecem no app quando executados; os
  // pulados são acusados aqui como "não realizados".
  const EXPECTED_TESTS = ['bateria', 'carregador', 'wifi', 'bluetooth', 'internet', 'usb', 'taxa_atualizacao', 'biometria', 'leitor_cartao', 'hdmi', 'estereo', 'microfone', 'camera', 'tela', 'brilho', 'teclado', 'touchpad', 'descarga_bateria', 'throttling', 'stress'];
  const doneKeys = new Set(Object.keys(report.tests ?? {}));
  const untestedTests = EXPECTED_TESTS.filter((k) => !doneKeys.has(k));

  return (
    <Shell
      title={`Relatório ${m.ntb_code || report.test_id.slice(0, 8)}`}
      subtitle={`${[m.manufacturer, m.model].filter(Boolean).join(' ') || 'Equipamento'} • ${formatDate(report.tested_at)}`}
      actions={
        <>
          <Link href={`/reports/${encodeURIComponent(report.test_id)}/edit`} className="btn-primary">
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Editar relatório
          </Link>
          <DeleteReportButton
            testId={report.test_id}
            label={m.ntb_code || undefined}
            redirectTo="/reports"
            variant="button"
          />
          <Link href="/reports" className="btn-outline">
            Voltar
          </Link>
        </>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Identificação</h2>
            <ClassificationBadge value={report.final_classification} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Código NTB" value={m.ntb_code || '—'} mono />
            <Field label="Localização" value={m.location || '—'} />
            <Field label="Fabricante" value={m.manufacturer || '—'} />
            <Field label="Modelo" value={m.model || '—'} />
            <Field label="Serial" value={m.serial || '—'} mono />
            <Field label="Hostname" value={m.hostname} />
            <Field label="CPU" value={formatCpu(m)} />
            <Field label="RAM" value={formatRam(m)} />
            <Field label="SO" value={`${m.os} ${m.os_version}`} />
            <Field label="Resolução" value={m.screen_resolution} />
            <Field
              label={
                (m.gpus && m.gpus.length > 1) || (m.graphics_adapters && m.graphics_adapters.length > 1)
                  ? 'Placas de vídeo'
                  : 'Placa de vídeo'
              }
              value={formatGpus(m)}
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
            <Field label="Autopilot" value={m.autopilot_detail ? `${m.autopilot} — ${m.autopilot_detail}` : m.autopilot} />
            <Field label="Ativação" value={m.windows_activation} />
            <Field label="Senha de BIOS" value={formatBiosPasswords(m)} />
            <Field label="Computrace" value={formatComputrace(m)} />
            <Field label="Teclado retroiluminado" value={formatSimNao(m.keyboard_backlight)} />
            <Field label="Teclado numérico" value={m.has_numeric_keypad == null ? '—' : (m.has_numeric_keypad ? 'Sim' : 'Não')} />
            <Field label="Etiqueta" value={report.asset_tag || '—'} />
          </dl>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-white">Resumo</h2>
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
        <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-white">Testes automáticos</h2>
        {Object.entries(report.tests).length === 0 ? (
          <div className="card p-6 text-sm text-ink-500 dark:text-ink-400">
            Nenhum teste automático registrado.
          </div>
        ) : (
          // Layout COMPACTO (o painel também serve de estoque): grid de 2
          // colunas com linhas densas — badge + nome + detalhe curto.
          // Comentários ficam recolhidos atrás do link "Comentar".
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(report.tests).map(([key, t]) => {
              const tone = statusToTone(t.status);
              const needsComment = tone !== 'ok';
              const comments = commentsByKey.get(key) ?? [];
              return (
                <article key={key} className="card px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {labelTest(key)}
                    </h3>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.details ? (
                    <p className="mt-1 text-xs leading-snug text-ink-600 dark:text-ink-300">
                      {t.details}
                    </p>
                  ) : null}
                  <CommentList comments={comments} />
                  <CommentForm
                    testId={report.test_id}
                    testKey={key}
                    compact
                    open={false}
                    placeholder={
                      needsComment
                        ? 'Comente o motivo da falha ou de não ter sido testado'
                        : 'Adicione contexto para este teste'
                    }
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      {report.stress ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-white">Benchmark e stress</h2>
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
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-white">Testes não realizados</h2>
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

      {(() => {
        // Inspeção física UNIFICADA: uma única seção com a foto, a avaliação do
        // técnico (OK / Com problema, definida no celular) e o comentário.
        // Itens PRINCIPAIS aparecem sempre (com "Sem foto" quando não enviada —
        // fotos são opcionais); slots de DEFEITO só aparecem quando enviados;
        // chaves legadas (catálogo antigo) continuam visíveis com a foto salva.
        const photos = report.inspection_photos ?? [];
        const photoByKey = new Map(photos.map((p) => [p.item_key, p]));
        const catalogKeys = new Set(INSPECTION_ITEMS.map((i) => i.key));
        const legacy = photos.filter((p) => !catalogKeys.has(p.item_key));
        const visibleItems = INSPECTION_ITEMS
          .filter((def) => !def.optional || photoByKey.has(def.key))
          .map((def) => ({ key: def.key, label: def.label }))
          .concat(legacy.map((p) => ({
            key: p.item_key,
            label: LEGACY_INSPECTION_LABELS[p.item_key] ?? p.item_key,
          })));
        if (visibleItems.length === 0) return null;
        return (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-white">Inspeção física</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((def) => {
                const p = photoByKey.get(def.key);
                const status = p?.status ?? null;
                const extraComments = commentsByKey.get(def.key) ?? [];
                return (
                  <figure key={def.key} className="card flex flex-col overflow-hidden">
                    {p ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`data:image/jpeg;base64,${p.image_base64}`}
                        alt={def.label}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-ink-50 text-xs text-ink-400 dark:bg-ink-700/40">
                        Sem foto
                      </div>
                    )}
                    <figcaption className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink-900 dark:text-white">
                          {def.label}
                        </span>
                        {!p ? (
                          <Badge text="Sem foto" tone="mute" />
                        ) : status === 'problema' ? (
                          <Badge text="Com problema" tone="bad" />
                        ) : status === 'ok' ? (
                          <Badge text="OK" tone="ok" />
                        ) : (
                          <Badge text="Sem avaliação" tone="warn" />
                        )}
                      </div>
                      {p?.note ? (
                        <p className="text-sm text-ink-700 dark:text-ink-200">{p.note}</p>
                      ) : !p ? (
                        <p className="text-xs text-ink-500 dark:text-ink-400">
                          Foto não enviada pelo técnico.
                        </p>
                      ) : null}
                      {extraComments.length > 0 ? (
                        <CommentList comments={extraComments} />
                      ) : null}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        );
      })()}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-white">Comentários gerais</h2>
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

/** Normaliza "sim"/"nao"/"indisponivel" (payload) para exibição capitalizada. */
function formatSimNao(v?: string | null): string {
  switch ((v ?? '').toLowerCase()) {
    case 'sim': return 'Sim';
    case 'nao': case 'não': return 'Não';
    case 'indisponivel': case 'indisponível': case '': return 'Indisponível';
    default: return v!.charAt(0).toUpperCase() + v!.slice(1);
  }
}

/** Resume o estado das senhas de BIOS (Setup / Power-On / HDD). */
function formatBiosPasswords(m: ReportDoc['machine']): string {
  const parts: string[] = [];
  if (m.bios_setup_password) parts.push(`Setup: ${m.bios_setup_password}`);
  if (m.bios_power_on_password) parts.push(`Power-On: ${m.bios_power_on_password}`);
  if (m.bios_hdd_password && m.bios_hdd_password !== 'Indisponível') parts.push(`HDD: ${m.bios_hdd_password}`);
  if (parts.length === 0) return '—';
  // Tudo indisponível = leitura não suportada neste fabricante.
  if (parts.every((p) => p.endsWith('Indisponível'))) return 'Indisponível (leitura só em HP/Dell/Lenovo)';
  return parts.join(' • ');
}

function formatComputrace(m: ReportDoc['machine']): string {
  if (!m.computrace_module) return '—';
  if (m.computrace_module === 'Não ativado') return 'Não detectado';
  const v = m.computrace_version ? ` • v${m.computrace_version}` : '';
  return `${m.computrace_module}${v}`;
}

function formatCpu(m: ReportDoc['machine']): string {
  const base = m.cpu || '—';
  const extra: string[] = [];
  if (m.cpu_cores) extra.push(`${m.cpu_cores} núcleos`);
  if (m.cpu_threads) extra.push(`${m.cpu_threads} threads`);
  if (m.cpu_max_clock_mhz) extra.push(`${(m.cpu_max_clock_mhz / 1000).toFixed(1)} GHz`);
  return extra.length > 0 ? `${base} (${extra.join(' • ')})` : base;
}

function formatRam(m: ReportDoc['machine']): string {
  // Total: soma dos pentes (mais preciso) ou o ram_gb do WMI.
  const sum = (m.ram_modules ?? []).reduce((acc, mod) => acc + (mod.capacity_gb ?? 0), 0);
  const total = sum > 0 ? sum : m.ram_gb;
  let text = `${total.toFixed(1)} GB`;
  const extra: string[] = [];
  if (m.ram_type) extra.push(m.ram_type);
  if (m.ram_speed_mhz) extra.push(`${m.ram_speed_mhz} MHz`);
  if (m.ram_slots_used) {
    extra.push(m.ram_slots_total ? `${m.ram_slots_used}/${m.ram_slots_total} slots` : `${m.ram_slots_used} pente(s)`);
  }
  if (extra.length > 0) text += ` • ${extra.join(' • ')}`;
  return text;
}

function formatGpus(m: ReportDoc['machine']): string {
  if (m.gpus && m.gpus.length > 0) {
    return m.gpus
      .map((g) => {
        const parts: string[] = [];
        if (g.vram_mb) parts.push(g.vram_mb >= 1024 ? `${(g.vram_mb / 1024).toFixed(1)} GB` : `${g.vram_mb} MB`);
        if (g.driver_version) parts.push(`driver ${g.driver_version}`);
        return parts.length > 0 ? `${g.name} (${parts.join(' • ')})` : g.name;
      })
      .join(' • ');
  }
  if (m.graphics_adapters && m.graphics_adapters.length > 0) return m.graphics_adapters.join(' • ');
  return m.graphics_adapter || '—';
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
