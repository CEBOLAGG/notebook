import { getDb } from './mongo';
import { INSPECTION_ITEMS } from './inspection-items';

/**
 * Documento de inspeção física fotográfica. Cada checklist em andamento no app
 * cria um slug único; o celular acessa /inspecao/<slug> e envia fotos, que
 * ficam aqui no MongoDB vinculadas ao serial da máquina. Quando o relatório
 * final chega (com o mesmo slug), as fotos são mescladas no relatório.
 */
/** Avaliação do técnico para o item: aprovado, com problema, ou ainda sem avaliar. */
export type InspectionStatus = 'ok' | 'problema' | null;

export interface InspectionPhotoDoc {
  item_key: string;
  label: string;
  image_base64: string;
  note?: string | null;
  /** Avaliação do técnico (OK ou Com problema), definida no celular após a foto. */
  status?: InspectionStatus;
  captured_at: string;
}

export interface InspectionDoc {
  slug: string;
  serial: string;
  machine: string;
  created_at: string;
  updated_at: string;
  photos: InspectionPhotoDoc[];
}

const COLLECTION = 'inspections';

export const inspectionsRepo = {
  async ensureIndexes(): Promise<void> {
    const db = await getDb();
    const col = db.collection<InspectionDoc>(COLLECTION);
    await Promise.all([
      col.createIndex({ slug: 1 }, { unique: true }),
      col.createIndex({ serial: 1 }),
      // Expira inspeções abandonadas após 30 dias.
      col.createIndex({ updated_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }),
    ]);
  },

  /** Cria a sessão de inspeção se ainda não existir. */
  async ensure(slug: string, serial: string, machine: string): Promise<InspectionDoc> {
    const db = await getDb();
    const col = db.collection<InspectionDoc>(COLLECTION);
    const now = new Date().toISOString();
    const existing = await col.findOne({ slug });
    if (existing) return existing;
    const doc: InspectionDoc = {
      slug,
      serial: serial || '',
      machine: machine || '',
      created_at: now,
      updated_at: now,
      photos: [],
    };
    await col.insertOne(doc as never);
    return doc;
  },

  async get(slug: string): Promise<InspectionDoc | null> {
    const db = await getDb();
    return db.collection<InspectionDoc>(COLLECTION).findOne({ slug });
  },

  /** Adiciona/substitui a foto de um item. */
  async putPhoto(
    slug: string,
    photo: InspectionPhotoDoc,
  ): Promise<InspectionDoc | null> {
    const db = await getDb();
    const col = db.collection<InspectionDoc>(COLLECTION);
    const now = new Date().toISOString();
    // Remove foto antiga do mesmo item, depois adiciona a nova.
    await col.updateOne(
      { slug },
      { $pull: { photos: { item_key: photo.item_key } } as never },
    );
    await col.updateOne(
      { slug },
      {
        $set: { updated_at: now },
        $push: { photos: photo as never },
      },
    );
    return col.findOne({ slug });
  },

  /**
   * Atualiza apenas a avaliação (status + nota) de um item que já tem foto,
   * sem reenviar a imagem. Usado quando o técnico ajusta a avaliação no celular.
   */
  async updatePhotoMeta(
    slug: string,
    itemKey: string,
    meta: { status?: InspectionStatus; note?: string | null },
  ): Promise<InspectionDoc | null> {
    const db = await getDb();
    const col = db.collection<InspectionDoc>(COLLECTION);
    const now = new Date().toISOString();
    const set: Record<string, unknown> = { 'photos.$.updated_at': now, updated_at: now };
    if (meta.status !== undefined) set['photos.$.status'] = meta.status;
    if (meta.note !== undefined) set['photos.$.note'] = meta.note;
    const r = await col.updateOne(
      { slug, 'photos.item_key': itemKey },
      { $set: set },
    );
    if (r.matchedCount === 0) return null;
    return col.findOne({ slug });
  },

  /** Estado para a página mobile: itens do catálogo + foto/status/nota de cada. */
  async state(slug: string): Promise<{
    found: boolean;
    serial: string;
    machine: string;
    total: number;
    done: number;
    items: {
      key: string;
      label: string;
      instruction: string;
      done: boolean;
      status: InspectionStatus;
      note: string | null;
    }[];
  }> {
    const doc = await this.get(slug);
    const byKey = new Map((doc?.photos ?? []).map((p) => [p.item_key, p]));
    return {
      found: !!doc,
      serial: doc?.serial ?? '',
      machine: doc?.machine ?? '',
      total: INSPECTION_ITEMS.length,
      done: byKey.size,
      items: INSPECTION_ITEMS.map((i) => {
        const p = byKey.get(i.key);
        return {
          key: i.key,
          label: i.label,
          instruction: i.instruction,
          done: !!p,
          status: p?.status ?? null,
          note: p?.note ?? null,
        };
      }),
    };
  },
};
