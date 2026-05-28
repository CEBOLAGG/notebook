import { NextResponse } from 'next/server';
import { reportsRepo } from '@/lib/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ testId: string }> },
) {
  const { testId } = await params;
  const doc = await reportsRepo.getById(testId);
  if (!doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  // Strip o _id do mongo para evitar problemas de serialização.
  const { _id, ...rest } = doc as unknown as { _id?: unknown } & Record<string, unknown>;
  void _id;
  return NextResponse.json(rest);
}
