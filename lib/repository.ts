import { randomUUID } from 'node:crypto';
import { getDb } from './mongo';
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

    const doc: ReportDoc = {
      ...payload,
      received_at: now,
      comments: [],
    };

    await col.insertOne(doc as never);
    return doc;
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
