import { getDb } from './mongo';

/**
 * Manifesto de versão do app desktop, persistido no MongoDB.
 *
 * Antes ficava como arquivo estático em public/version.json — o que exigia um
 * redeploy da Vercel a cada nova versão. Agora vive numa coleção, então
 * publicar uma versão é só uma escrita (POST /api/version), sem deploy.
 *
 * Mantemos um único documento "corrente" (id fixo) com a versão mais recente
 * no topo e o histórico acumulado. O app lê os campos do topo; a UI pode
 * mostrar o history.
 */

const COLLECTION = 'app_version';
const DOC_ID = 'current';

export interface VersionEntry {
  version: string;
  date?: string | null;
  changelog: string[];
}

export interface VersionManifest extends VersionEntry {
  /** URL do .exe (GitHub Release). */
  url: string;
  /** SHA256 do .exe para validação de integridade. */
  sha256: string;
  /** Versões anteriores, mais recente primeiro. */
  history: VersionEntry[];
  /** Carimbo da última atualização do manifesto. */
  updated_at?: string;
}

export const versionRepo = {
  /** Lê o manifesto corrente. Retorna null se nunca foi publicado. */
  async get(): Promise<VersionManifest | null> {
    const db = await getDb();
    const col = db.collection<VersionManifest & { _id: string }>(COLLECTION);
    const doc = await col.findOne({ _id: DOC_ID });
    if (!doc) return null;
    // Remove _id antes de devolver (não serializa bem e não interessa ao app).
    const { _id, ...rest } = doc;
    void _id;
    return rest;
  },

  /**
   * Publica uma nova versão. Empurra a versão atual (se diferente) para o
   * history e grava a nova no topo. Idempotente: republicar a mesma versão
   * apenas atualiza url/sha256/changelog sem duplicar no history.
   */
  async publish(input: {
    version: string;
    url: string;
    sha256: string;
    changelog: string[];
    date?: string | null;
  }): Promise<VersionManifest> {
    const db = await getDb();
    const col = db.collection<VersionManifest & { _id: string }>(COLLECTION);

    const prev = await col.findOne({ _id: DOC_ID });
    const now = new Date().toISOString();
    const date = input.date ?? now.slice(0, 10);

    let history: VersionEntry[] = prev?.history ?? [];
    if (prev && prev.version && prev.version !== input.version) {
      const exists = history.some((h) => h.version === prev.version);
      if (!exists) {
        history = [
          { version: prev.version, date: prev.date ?? null, changelog: prev.changelog ?? [] },
          ...history,
        ];
      }
    }

    const manifest: VersionManifest = {
      version: input.version,
      date,
      url: input.url,
      sha256: input.sha256,
      changelog: input.changelog,
      history,
      updated_at: now,
    };

    await col.updateOne(
      { _id: DOC_ID },
      { $set: { ...manifest, _id: DOC_ID } },
      { upsert: true },
    );

    return manifest;
  },
};
