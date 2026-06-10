import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { ReportEditForm } from '@/components/ReportEditForm';
import { reportsRepo } from '@/lib/repository';
import type { ReportDoc } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ testId: string }>;
}

export default async function ReportEditPage({ params }: PageProps) {
  const { testId } = await params;
  const reportRaw = await reportsRepo.getById(testId);
  if (!reportRaw) notFound();
  const { _id, ...report } = reportRaw as unknown as { _id?: unknown } & ReportDoc;
  void _id;

  const m = report.machine;

  return (
    <Shell
      title={`Editar relatório ${m.ntb_code || report.test_id.slice(0, 8)}`}
      subtitle={`${[m.manufacturer, m.model].filter(Boolean).join(' ') || 'Equipamento'}`}
      actions={
        <Link href={`/reports/${encodeURIComponent(report.test_id)}`} className="btn-outline">
          Voltar sem salvar
        </Link>
      }
    >
      <ReportEditForm report={report as ReportDoc} />
    </Shell>
  );
}
