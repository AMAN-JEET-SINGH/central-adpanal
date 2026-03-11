import { NextResponse } from 'next/server';
import { getAdsenseAccounts } from '@/lib/adsenseConfig';

export async function GET() {
  const accounts = getAdsenseAccounts().map(acc => ({
    key: acc.key,
    accountId: acc.accountId,
  }));

  return NextResponse.json({ accounts });
}
