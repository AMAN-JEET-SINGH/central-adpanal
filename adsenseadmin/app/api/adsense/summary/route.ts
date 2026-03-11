import { NextResponse } from 'next/server';
import { getSummary } from '@/lib/adsenseApi';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account') || 'MAIN';
  const period = searchParams.get('period') || '30d';

  try {
    const result = await getSummary(account, period);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Summary API error:', message);
    return NextResponse.json({ error: 'Failed to fetch summary', details: message }, { status: 500 });
  }
}
