import { getDb } from './mongo';
import { INSPECTION_ITEMS } from './inspection-items';

/**
 * Documento de inspeção física fotográfica. Cada checklist em andamento no app
 * cria um slug único; o celular acessa /inspecao/<slug> e envia fotos, que
 * ficam aqui no MongoDB vinculadas ao serial da máquina. Quando o relatório
 * final chega (com o mesmo slug), as fotos são mescladas no relatório.
 */
export interface InspectionPhotoDoc {
  item_key: string;
  label: string;
  image_base64: string;
  note?: string | null;
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

  /** Estado para a página mobile: itens do catálogo + quais já têm foto. */
  async state(slug: string): Promise<{
    found: boolean;
    serial: string;
    machine: string;
    total: number;
    done: number;
    items: { key: string; label: string; instruction: string; done: boolean }[];
  }> {
    const doc = await this.get(slug);
    const doneKeys = new Set((doc?.photos ?? []).map((p) => p.item_key));
    return {
      found: !!doc,
      serial: doc?.serial ?? '',
      machine: doc?.machine ?? '',
      total: INSPECTION_ITEMS.length,
      done: doneKeys.size,
      items: INSPECTION_ITEMS.map((i) => ({
        key: i.key,
        label: i.label,
        instruction: i.instruction,
        done: doneKeys.has(i.key),
      })),
    };
  },
};
