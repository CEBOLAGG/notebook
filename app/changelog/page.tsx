import { Shell } from '@/components/Shell';
import { versionRepo, type VersionEntry } from '@/lib/version-manifest';
import staticManifest from '@/public/version.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Formata uma data ISO/só-dia como DD/MM/AAAA, sem hora. */
function formatDay(value?: string | null): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
}

/**
 * Histórico completo de versões do app desktop. Lê o manifesto do MongoDB
 * (fonte de verdade, atualizada a cada publicação) e cai para o version.json
 * estático se o banco ainda não tiver nada.
 */
export default async function ChangelogPage() {
  let current: VersionEntry & { date?: string | null };
  let history: VersionEntry[] = [];

  try {
    const manifest = await versionRepo.get();
    if (manifest) {
      current = { version: manifest.version, date: manifest.date, changelog: manifest.changelog };
      history = manifest.history ?? [];
    } else {
      current = {
        version: staticManifest.version,
        date: staticManifest.date,
        changelog: staticManifest.changelog,
      };
      history = (staticManifest.history ?? []) as VersionEntry[];
    }
  } catch {
    current = {
      version: staticManifest.version,
      date: staticManifest.date,
      changelog: staticManifest.changelog,
    };
    history = (staticManifest.history ?? []) as VersionEntry[];
  }

  const entries: (VersionEntry & { date?: string | null })[] = [current, ...history];

  return (
    <Shell
      title="Novidades"
      subtitle="Histórico de versões do aplicativo Notelet"
    >
      <ol className="relative space-y-6 border-l border-ink-200 pl-6 dark:border-ink-700">
        {entries.map((entry, idx) => (
          <li key={`${entry.version}-${idx}`} className="relative">
            <span
              className={`absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-white dark:ring-ink-900 ${
                idx === 0 ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-600'
              }`}
            />
            <div className="card p-5">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
                  v{entry.version}
                </h2>
                {idx === 0 ? (
                  <span className="badge-ok">Atual</span>
                ) : null}
                {formatDay(entry.date) ? (
                  <span className="text-sm text-ink-500 dark:text-ink-400">
                    {formatDay(entry.date)}
                  </span>
                ) : null}
              </div>
              {entry.changelog && entry.changelog.length > 0 ? (
                <ul className="space-y-2">
                  {entry.changelog.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-700 dark:text-ink-200">
                      <span className="mt-1 text-brand-600 dark:text-brand-400">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500 dark:text-ink-400">Sem notas para esta versão.</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
