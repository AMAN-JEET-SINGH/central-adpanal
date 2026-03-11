import { NextResponse } from 'next/server';
import { getDomainSummary } from '@/lib/adsenseApi';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account') || 'MAIN';
  const period = searchParams.get('period') || '30d';

  try {
    const result = await getDomainSummary(account, period);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Domains API error:', message);
    return NextResponse.json({ error: 'Failed to fetch domain data', details: message }, { status: 500 });
  }
}
