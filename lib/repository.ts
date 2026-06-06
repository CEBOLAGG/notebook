import { randomUUID } from 'node:crypto';
import { getDb } from './mongo';
import { inspectionsRepo } from './inspections';
import type { ApiPayload, CommentDoc, ReportDoc, ReportListItem } from './types';

const COLLECTION = 'reports';

/**
 * Repositório dos relatórios. Toda interação com o MongoDB passa por aqui;
 * para migrar ao Bling depois, basta reescrever esta camada mantendo as
 * mesmas assinaturas.
 */
export const reportsRepo = {
  async ensureIndexes(): Promise<void> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    await Promise.all([
      col.createIndex({ test_id: 1 }, { unique: true }),
      col.createIndex({ tested_at: -1 }),
      col.createIndex({ 'machine.ntb_code': 1 }),
      col.createIndex({ 'machine.serial': 1 }),
      col.createIndex({ final_classification: 1 }),
    ]);
  },

  async upsertFromPayload(payload: ApiPayload): Promise<ReportDoc> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    const now = new Date().toISOString();

    const existing = await col.findOne({ test_id: payload.test_id });
    if (existing) {
      // Idempotência: se o desktop reenviar o mesmo test_id mantemos o doc
      // existente (incluindo comentários adicionados pela equipe).
      return existing;
    }

    // Mescla as fotos de inspeção capturadas pelo celular (coleção separada,
    // vinculada pelo slug que o app gerou). Se o app já enviou fotos no
    // payload, mantém as do payload; senão, puxa da sessão de inspeção.
    let inspectionPhotos = payload.inspection_photos ?? [];
    if ((!inspectionPhotos || inspectionPhotos.length === 0) && payload.inspection_slug) {
      try {
        const insp = await inspectionsRepo.get(payload.inspection_slug);
        if (insp?.photos?.length) {
          inspectionPhotos = insp.photos.map((p) => ({
            item_key: p.item_key,
            label: p.label,
            image_base64: p.image_base64,
            note: p.note ?? null,
            captured_at: p.captured_at,
          }));
        }
      } catch (err) {
        console.warn('[reports] falha mesclando fotos de inspeção', err);
      }
    }

    const doc: ReportDoc = {
      ...payload,
      inspection_photos: inspectionPhotos,
      received_at: now,
      comments: [],
    };

    await col.insertOne(doc as never);
    return doc;
  },

  /**
   * Busca o relatório mais recente para um número de serial. Usado pelo
   * fluxo de reteste pós-reparo para localizar o histórico.
   */
  async findLatestBySerial(serial: string): Promise<ReportDoc | null> {
    if (!serial || !serial.trim()) return null;
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    return col
      .find({ 'machine.serial': serial.trim() })
      .sort({ tested_at: -1 })
      .limit(1)
      .next();
  },

  /** Lista todos os relatórios de um serial (para seleção no reteste). */
  async findAllBySerial(serial: string): Promise<ReportListItem[]> {
    if (!serial || !serial.trim()) return [];
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    const docs = await col
      .find({ 'machine.serial': serial.trim() }, {
        projection: {
          test_id: 1, report_type: 1, tested_at: 1, received_at: 1,
          technician_name: 1, 'machine.ntb_code': 1, 'machine.location': 1,
          'machine.manufacturer': 1, 'machine.model': 1, 'machine.serial': 1,
          final_classification: 1,
        },
      })
      .sort({ tested_at: -1 })
      .limit(50)
      .toArray();
    return docs.map((d) => ({
      test_id: d.test_id,
      report_type: d.report_type,
      tested_at: d.tested_at,
      received_at: d.received_at,
      technician_name: d.technician_name,
      ntb_code: d.machine?.ntb_code ?? '',
      location: d.machine?.location ?? '',
      manufacturer: d.machine?.manufacturer ?? null,
      model: d.machine?.model ?? null,
      serial: d.machine?.serial ?? null,
      final_classification: d.final_classification,
    }));
  },

  /**
   * Atualiza um relatório existente com dados de um reteste pós-reparo.
   * Mantém o histórico das execuções anteriores, atualiza tests/manual_checklist
   * com os novos resultados e incrementa um contador de retests.
   */
  async applyRetest(testId: string, payload: ApiPayload): Promise<ReportDoc | null> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    const now = new Date().toISOString();

    const existing = await col.findOne({ test_id: testId });
    if (!existing) return null;

    // Histórico: empilha snapshot dos testes anteriores antes de sobrescrever.
    const historyEntry = {
      retested_at: now,
      previous_classification: existing.final_classification,
      previous_tests: existing.tests,
      previous_manual_checklist: existing.manual_checklist,
      retested_components: payload.retested_components ?? [],
      repair_notes: payload.repair_notes ?? '',
    };

    const update: Record<string, unknown> = {
      // Dados novos sobrescrevem os antigos
      tested_at: payload.tested_at,
      technician_name: payload.technician_name,
      machine: payload.machine,
      storage: payload.storage,
      battery: payload.battery,
      tests: payload.tests,
      manual_checklist: payload.manual_checklist,
      general_notes: payload.general_notes,
      asset_tag: payload.asset_tag,
      final_classification: payload.final_classification,
      final_classification_override_reason: payload.final_classification_override_reason ?? null,
      checklist_mode: payload.checklist_mode ?? null,
      stress: payload.stress ?? existing.stress,
      retested_at: now,
    };

    await col.updateOne(
      { test_id: testId },
      {
        $set: update,
        $inc: { retest_count: 1 },
        $push: { retest_history: historyEntry as never },
      },
    );

    return await col.findOne({ test_id: testId });
  },

  async list(filter: ListFilter = {}): Promise<ReportListItem[]> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);

    const mongoFilter: Record<string, unknown> = {};
    if (filter.classification) mongoFilter['final_classification'] = filter.classification;
    if (filter.reportType) mongoFilter['report_type'] = filter.reportType;
    if (filter.search && filter.search.trim().length > 0) {
      const rx = new RegExp(escapeRegex(filter.search.trim()), 'i');
      mongoFilter['$or'] = [
        { 'machine.ntb_code': rx },
        { 'machine.serial': rx },
        { 'machine.model': rx },
        { 'machine.manufacturer': rx },
        { 'machine.location': rx },
        { technician_name: rx },
      ];
    }

    const docs = await col
      .find(mongoFilter, {
        projection: {
          test_id: 1,
          report_type: 1,
          tested_at: 1,
          received_at: 1,
          technician_name: 1,
          'machine.ntb_code': 1,
          'machine.location': 1,
          'machine.manufacturer': 1,
          'machine.model': 1,
          'machine.serial': 1,
          final_classification: 1,
        },
      })
      .sort({ tested_at: -1 })
      .limit(filter.limit ?? 200)
      .toArray();

    return docs.map((d) => ({
      test_id: d.test_id,
      report_type: d.report_type,
      tested_at: d.tested_at,
      received_at: d.received_at,
      technician_name: d.technician_name,
      ntb_code: d.machine?.ntb_code ?? '',
      location: d.machine?.location ?? '',
      manufacturer: d.machine?.manufacturer ?? null,
      model: d.machine?.model ?? null,
      serial: d.machine?.serial ?? null,
      final_classification: d.final_classification,
    }));
  },

  async getById(testId: string): Promise<ReportDoc | null> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    return col.findOne({ test_id: testId });
  },

  /**
   * Atualização livre de campos do relatório (edição manual pelo técnico no
   * site). Aceita um objeto parcial e aplica via $set. Protege chaves
   * imutáveis (_id, test_id, comments, received_at).
   */
  async updateFields(testId: string, patch: Record<string, unknown>): Promise<ReportDoc | null> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);

    const blocked = new Set(['_id', 'test_id', 'comments', 'received_at']);
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (blocked.has(k)) continue;
      set[k] = v;
    }
    set['edited_at'] = new Date().toISOString();

    if (Object.keys(set).length === 0) return col.findOne({ test_id: testId });

    const r = await col.updateOne({ test_id: testId }, { $set: set });
    if (r.matchedCount === 0) return null;
    return col.findOne({ test_id: testId });
  },

  async addComment(
    testId: string,
    input: { test_key: string; author: string; text: string },
  ): Promise<CommentDoc | null> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    const comment: CommentDoc = {
      id: randomUUID(),
      test_key: input.test_key,
      author: input.author,
      text: input.text,
      created_at: new Date().toISOString(),
    };
    const r = await col.updateOne(
      { test_id: testId },
      { $push: { comments: comment } },
    );
    return r.matchedCount > 0 ? comment : null;
  },

  async stats(): Promise<{
    total: number;
    approved: number;
    warnings: number;
    rejected: number;
    last7Days: number;
  }> {
    const db = await getDb();
    const col = db.collection<ReportDoc>(COLLECTION);
    const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [total, approved, warnings, rejected, last7Days] = await Promise.all([
      col.countDocuments({}),
      col.countDocuments({ final_classification: 'Aprovado' }),
      col.countDocuments({ final_classification: 'Aprovado com ressalvas' }),
      col.countDocuments({ final_classification: 'Reprovado' }),
      col.countDocuments({ tested_at: { $gte: sevenDays } }),
    ]);
    return { total, approved, warnings, rejected, last7Days };
  },
};

export interface ListFilter {
  search?: string;
  classification?: string;
  reportType?: 'full_checklist' | 'retest';
  limit?: number;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
