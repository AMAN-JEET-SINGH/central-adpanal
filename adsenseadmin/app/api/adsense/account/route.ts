import { NextResponse } from 'next/server';
import { getAccountInfo } from '@/lib/adsenseApi';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get('account') || 'MAIN';

  try {
    const result = await getAccountInfo(account);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Account info API error:', message);
    return NextResponse.json({ error: 'Failed to fetch account info', details: message }, { status: 500 });
  }
}
