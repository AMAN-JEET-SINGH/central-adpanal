import { NextResponse } from 'next/server';
import { getDetailedReport } from '@/lib/adsenseApi';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account') || 'MAIN';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  try {
    const result = await getDetailedReport(account, startDate, endDate);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Report API error:', message);
    return NextResponse.json({ error: 'Failed to fetch report', details: message }, { status: 500 });
  }
}
