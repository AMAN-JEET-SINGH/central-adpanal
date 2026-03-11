import { google } from 'googleapis';
import { getAdsenseAccounts, AdsenseAccountConfig } from './adsenseConfig';

// In-memory cache with configurable TTL
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function getDateRange(period: string): {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  switch (period) {
    case 'today':
      startDate = today;
      prevStartDate = new Date(today);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(prevStartDate);
      break;
    case '7d':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 6);
      break;
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      break;
    case '30d':
    default:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 29);
      break;
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(today),
    prevStartDate: formatDate(prevStartDate),
    prevEndDate: formatDate(prevEndDate),
  };
}

// Create OAuth2 + Adsense client for a given account config
function createAdsenseClient(config: AdsenseAccountConfig) {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  );
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  return google.adsense({ version: 'v2', auth: oauth2Client });
}

// Get client for account key
function getClientForAccount(accountKey: string) {
  const accounts = getAdsenseAccounts();
  const config = accounts.find(a => a.key === accountKey);
  if (!config) throw new Error(`Account "${accountKey}" not found`);
  return { adsense: createAdsenseClient(config), accountId: config.accountId };
}

// ==================== PUBLIC API ====================

export async function getAccountInfo(accountKey: string) {
  const cacheKey = `account_info_${accountKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { adsense, accountId } = getClientForAccount(accountKey);

  const response = await adsense.accounts.get({ name: accountId });
  const account = response.data;

  const result = {
    name: account.displayName || account.name,
    publisherId: account.name,
    state: account.state,
    timeZone: (account as Record<string, unknown>).timeZone,
    accountKey,
  };

  setCache(cacheKey, result);
  return result;
}

export async function getSummary(accountKey: string, period: string = '30d') {
  const cacheKey = `summary_${accountKey}_${period}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { adsense, accountId } = getClientForAccount(accountKey);
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period);

  const metrics = [
    'ESTIMATED_EARNINGS',
    'PAGE_VIEWS',
    'CLICKS',
    'IMPRESSIONS',
    'PAGE_VIEWS_CTR',
    'PAGE_VIEWS_RPM',
  ];

  const startParts = parseDateParts(startDate);
  const endParts = parseDateParts(endDate);
  const prevStartParts = parseDateParts(prevStartDate);
  const prevEndParts = parseDateParts(prevEndDate);

  const [currentRes, prevRes] = await Promise.all([
    adsense.accounts.reports.generate({
      account: accountId,
      'startDate.year': startParts.year,
      'startDate.month': startParts.month,
      'startDate.day': startParts.day,
      'endDate.year': endParts.year,
      'endDate.month': endParts.month,
      'endDate.day': endParts.day,
      metrics,
      reportingTimeZone: 'ACCOUNT_TIME_ZONE',
    }),
    adsense.accounts.reports.generate({
      account: accountId,
      'startDate.year': prevStartParts.year,
      'startDate.month': prevStartParts.month,
      'startDate.day': prevStartParts.day,
      'endDate.year': prevEndParts.year,
      'endDate.month': prevEndParts.month,
      'endDate.day': prevEndParts.day,
      metrics,
      reportingTimeZone: 'ACCOUNT_TIME_ZONE',
    }),
  ]);

  const extractTotals = (data: Record<string, unknown>) => {
    const totals = ((data.totals as Record<string, unknown>)?.cells || []) as Array<{ value?: string }>;
    const headers = (data.headers || []) as Array<{ name?: string }>;
    const obj: Record<string, number> = {};
    headers.forEach((h, i) => {
      obj[h.name || `col_${i}`] = parseFloat(totals[i]?.value || '0');
    });
    return obj;
  };

  const current = extractTotals(currentRes.data as unknown as Record<string, unknown>);
  const previous = extractTotals(prevRes.data as unknown as Record<string, unknown>);

  const calcDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const result = {
    period,
    startDate,
    endDate,
    accountKey,
    earnings: { value: current.ESTIMATED_EARNINGS || 0, delta: calcDelta(current.ESTIMATED_EARNINGS || 0, previous.ESTIMATED_EARNINGS || 0) },
    pageViews: { value: current.PAGE_VIEWS || 0, delta: calcDelta(current.PAGE_VIEWS || 0, previous.PAGE_VIEWS || 0) },
    clicks: { value: current.CLICKS || 0, delta: calcDelta(current.CLICKS || 0, previous.CLICKS || 0) },
    impressions: { value: current.IMPRESSIONS || 0, delta: calcDelta(current.IMPRESSIONS || 0, previous.IMPRESSIONS || 0) },
    ctr: { value: current.PAGE_VIEWS_CTR || 0, delta: calcDelta(current.PAGE_VIEWS_CTR || 0, previous.PAGE_VIEWS_CTR || 0) },
    rpm: { value: current.PAGE_VIEWS_RPM || 0, delta: calcDelta(current.PAGE_VIEWS_RPM || 0, previous.PAGE_VIEWS_RPM || 0) },
  };

  setCache(cacheKey, result);
  return result;
}

export async function getDetailedReport(
  accountKey: string,
  startDate?: string,
  endDate?: string
) {
  const sd = startDate || formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const ed = endDate || formatDate(new Date());

  const cacheKey = `report_${accountKey}_${sd}_${ed}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { adsense, accountId } = getClientForAccount(accountKey);

  const startParts = parseDateParts(sd);
  const endParts = parseDateParts(ed);

  const response = await adsense.accounts.reports.generate({
    account: accountId,
    'startDate.year': startParts.year,
    'startDate.month': startParts.month,
    'startDate.day': startParts.day,
    'endDate.year': endParts.year,
    'endDate.month': endParts.month,
    'endDate.day': endParts.day,
    dimensions: ['DATE', 'DOMAIN_NAME'],
    metrics: [
      'ESTIMATED_EARNINGS',
      'PAGE_VIEWS',
      'PAGE_VIEWS_RPM',
      'IMPRESSIONS',
      'IMPRESSIONS_RPM',
      'CLICKS',
    ],
    reportingTimeZone: 'ACCOUNT_TIME_ZONE',
  });

  const headers = (response.data.headers || []) as Array<{ name?: string; type?: string }>;
  const rows = ((response.data.rows || []) as Array<{ cells?: Array<{ value?: string }> }>).map(row => {
    const cells = row.cells || [];
    const obj: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      const val = cells[i]?.value || '0';
      obj[header.name || `col_${i}`] = header.type === 'DIMENSION' ? val : parseFloat(val);
    });
    return obj;
  });

  // Compute aggregates
  const domainsSet = new Set<string>();
  let totalEarnings = 0;
  let totalPageViews = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  rows.forEach(row => {
    if (row.DOMAIN_NAME) domainsSet.add(row.DOMAIN_NAME as string);
    totalEarnings += (row.ESTIMATED_EARNINGS as number) || 0;
    totalPageViews += (row.PAGE_VIEWS as number) || 0;
    totalImpressions += (row.IMPRESSIONS as number) || 0;
    totalClicks += (row.CLICKS as number) || 0;
  });

  const result = {
    accountKey,
    startDate: sd,
    endDate: ed,
    rows,
    domains: Array.from(domainsSet).sort(),
    totals: {
      earnings: totalEarnings,
      pageViews: totalPageViews,
      impressions: totalImpressions,
      clicks: totalClicks,
      avgRpm: totalPageViews > 0 ? (totalEarnings / totalPageViews) * 1000 : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    },
  };

  setCache(cacheKey, result);
  return result;
}

export async function getDomainSummary(accountKey: string, period: string = '30d') {
  const cacheKey = `domains_${accountKey}_${period}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { adsense, accountId } = getClientForAccount(accountKey);
  const { startDate, endDate } = getDateRange(period);

  const startParts = parseDateParts(startDate);
  const endParts = parseDateParts(endDate);

  const response = await adsense.accounts.reports.generate({
    account: accountId,
    'startDate.year': startParts.year,
    'startDate.month': startParts.month,
    'startDate.day': startParts.day,
    'endDate.year': endParts.year,
    'endDate.month': endParts.month,
    'endDate.day': endParts.day,
    dimensions: ['DOMAIN_NAME'],
    metrics: [
      'ESTIMATED_EARNINGS',
      'PAGE_VIEWS',
      'PAGE_VIEWS_RPM',
      'IMPRESSIONS',
      'CLICKS',
    ],
    reportingTimeZone: 'ACCOUNT_TIME_ZONE',
  });

  const headers = (response.data.headers || []) as Array<{ name?: string; type?: string }>;
  const rows = ((response.data.rows || []) as Array<{ cells?: Array<{ value?: string }> }>).map(row => {
    const cells = row.cells || [];
    const obj: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      const val = cells[i]?.value || '0';
      obj[header.name || `col_${i}`] = header.type === 'DIMENSION' ? val : parseFloat(val);
    });
    return obj;
  });

  // Sort by earnings descending
  rows.sort((a, b) => ((b.ESTIMATED_EARNINGS as number) || 0) - ((a.ESTIMATED_EARNINGS as number) || 0));

  const result = {
    accountKey,
    period,
    domains: rows.map(r => ({
      domain: r.DOMAIN_NAME,
      pageViews: r.PAGE_VIEWS,
      revenue: r.ESTIMATED_EARNINGS,
      rpm: r.PAGE_VIEWS_RPM,
      impressions: r.IMPRESSIONS,
      clicks: r.CLICKS,
      ctr: (r.IMPRESSIONS as number) > 0 ? (((r.CLICKS as number) / (r.IMPRESSIONS as number)) * 100) : 0,
    })),
  };

  setCache(cacheKey, result);
  return result;
}

export async function getPayments(accountKey: string) {
  const cacheKey = `payments_${accountKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { adsense, accountId } = getClientForAccount(accountKey);

  try {
    const response = await adsense.accounts.payments.list({ parent: accountId });
    const payments = ((response.data as Record<string, unknown>).payments || []) as Array<Record<string, unknown>>;

    const result = payments.map(p => ({
      name: p.name,
      date: p.date,
      amount: p.amount,
    }));

    setCache(cacheKey, result);
    return result;
  } catch {
    return [];
  }
}

export { getAdsenseAccounts, formatDate, getDateRange };
