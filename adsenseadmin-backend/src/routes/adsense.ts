import { Router, Request, Response } from 'express';
import { google } from 'googleapis';

const router = Router();

// ==================== CONFIG ====================

type AccountConfig = {
  key: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountId: string;
};

function getAccounts(): AccountConfig[] {
  const keys = (process.env.ADSENSE_ACCOUNT_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  return keys.map(key => {
    const rawId = process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_ACCOUNT_ID`] || '';
    const accountId = rawId.startsWith('accounts/') ? rawId : `accounts/${rawId}`;

    return {
      key,
      clientId: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_CLIENT_ID`] || '',
      clientSecret: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_CLIENT_SECRET`] || '',
      refreshToken: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_REFRESH_TOKEN`] || '',
      accountId,
    };
  });
}

function getClient(accountKey: string) {
  const accounts = getAccounts();
  const config = accounts.find(a => a.key === accountKey);
  if (!config) throw new Error(`Account "${accountKey}" not found`);

  const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  return {
    adsense: google.adsense({ version: 'v2', auth: oauth2Client }),
    accountId: config.accountId,
  };
}

// ==================== CACHE ====================

const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// ==================== HELPERS ====================

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDateParts(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function getDateRange(period: string) {
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

function extractTotals(data: any) {
  const totals = data.totals?.cells || [];
  const headers = data.headers || [];
  const obj: any = {};
  headers.forEach((h: any, i: number) => {
    obj[h.name] = parseFloat(totals[i]?.value || '0');
  });
  return obj;
}

function parseRows(data: any) {
  const headers = data.headers || [];
  return (data.rows || []).map((row: any) => {
    const cells = row.cells || [];
    const obj: any = {};
    headers.forEach((h: any, i: number) => {
      const val = cells[i]?.value || '0';
      obj[h.name] = h.type === 'DIMENSION' ? val : parseFloat(val);
    });
    return obj;
  });
}

function calcDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

// ==================== ROUTES ====================

// GET /api/adsense/accounts — List configured accounts
router.get('/accounts', (_req: Request, res: Response) => {
  const accounts = getAccounts().map(a => ({ key: a.key, accountId: a.accountId }));
  res.json({ accounts });
});

// GET /api/adsense/account?account=MAIN — Account info from Google
router.get('/account', async (req: Request, res: Response) => {
  try {
    const accountKey = (req.query.account as string) || 'MAIN';
    const cacheKey = `account_${accountKey}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { adsense, accountId } = getClient(accountKey);
    const response = await adsense.accounts.get({ name: accountId });
    const account = response.data;

    const rawTz = (account as any).timeZone;
    const result = {
      name: account.displayName || account.name,
      publisherId: account.name,
      state: account.state,
      timeZone: typeof rawTz === 'object' && rawTz ? (rawTz.id || JSON.stringify(rawTz)) : (rawTz || null),
      accountKey,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('Account info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch account info', details: error.message });
  }
});

// GET /api/adsense/summary?account=MAIN&period=thisMonth — Summary with deltas
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const accountKey = (req.query.account as string) || 'MAIN';
    const period = (req.query.period as string) || '30d';
    const cacheKey = `summary_${accountKey}_${period}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { adsense, accountId } = getClient(accountKey);
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period);

    const metrics = [
      'ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'CLICKS',
      'IMPRESSIONS', 'PAGE_VIEWS_CTR', 'PAGE_VIEWS_RPM',
    ];

    const s = parseDateParts(startDate);
    const e = parseDateParts(endDate);
    const ps = parseDateParts(prevStartDate);
    const pe = parseDateParts(prevEndDate);

    const [currentRes, prevRes] = await Promise.all([
      adsense.accounts.reports.generate({
        account: accountId,
        'startDate.year': s.year, 'startDate.month': s.month, 'startDate.day': s.day,
        'endDate.year': e.year, 'endDate.month': e.month, 'endDate.day': e.day,
        metrics, reportingTimeZone: 'ACCOUNT_TIME_ZONE',
      }),
      adsense.accounts.reports.generate({
        account: accountId,
        'startDate.year': ps.year, 'startDate.month': ps.month, 'startDate.day': ps.day,
        'endDate.year': pe.year, 'endDate.month': pe.month, 'endDate.day': pe.day,
        metrics, reportingTimeZone: 'ACCOUNT_TIME_ZONE',
      }),
    ]);

    const current = extractTotals(currentRes.data);
    const previous = extractTotals(prevRes.data);

    const result = {
      period, startDate, endDate, accountKey,
      earnings: { value: current.ESTIMATED_EARNINGS || 0, delta: calcDelta(current.ESTIMATED_EARNINGS || 0, previous.ESTIMATED_EARNINGS || 0) },
      pageViews: { value: current.PAGE_VIEWS || 0, delta: calcDelta(current.PAGE_VIEWS || 0, previous.PAGE_VIEWS || 0) },
      clicks: { value: current.CLICKS || 0, delta: calcDelta(current.CLICKS || 0, previous.CLICKS || 0) },
      impressions: { value: current.IMPRESSIONS || 0, delta: calcDelta(current.IMPRESSIONS || 0, previous.IMPRESSIONS || 0) },
      ctr: { value: current.PAGE_VIEWS_CTR || 0, delta: calcDelta(current.PAGE_VIEWS_CTR || 0, previous.PAGE_VIEWS_CTR || 0) },
      rpm: { value: current.PAGE_VIEWS_RPM || 0, delta: calcDelta(current.PAGE_VIEWS_RPM || 0, previous.PAGE_VIEWS_RPM || 0) },
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('Summary error:', error.message);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

// GET /api/adsense/report?account=MAIN&startDate=2026-03-01&endDate=2026-03-10 — Detailed report
router.get('/report', async (req: Request, res: Response) => {
  try {
    const accountKey = (req.query.account as string) || 'MAIN';
    const sd = (req.query.startDate as string) || formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const ed = (req.query.endDate as string) || formatDate(new Date());
    const cacheKey = `report_${accountKey}_${sd}_${ed}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { adsense, accountId } = getClient(accountKey);
    const s = parseDateParts(sd);
    const e = parseDateParts(ed);

    const response = await adsense.accounts.reports.generate({
      account: accountId,
      'startDate.year': s.year, 'startDate.month': s.month, 'startDate.day': s.day,
      'endDate.year': e.year, 'endDate.month': e.month, 'endDate.day': e.day,
      dimensions: ['DATE', 'COUNTRY_NAME', 'DOMAIN_NAME'],
      metrics: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'PAGE_VIEWS_RPM', 'IMPRESSIONS', 'IMPRESSIONS_RPM', 'CLICKS'],
      reportingTimeZone: 'ACCOUNT_TIME_ZONE',
    });

    const rows = parseRows(response.data);

    const domainsSet = new Set<string>();
    const countriesSet = new Set<string>();
    let totalEarnings = 0, totalPageViews = 0, totalImpressions = 0, totalClicks = 0;

    rows.forEach((row: any) => {
      if (row.DOMAIN_NAME) domainsSet.add(row.DOMAIN_NAME);
      if (row.COUNTRY_NAME) countriesSet.add(row.COUNTRY_NAME);
      totalEarnings += row.ESTIMATED_EARNINGS || 0;
      totalPageViews += row.PAGE_VIEWS || 0;
      totalImpressions += row.IMPRESSIONS || 0;
      totalClicks += row.CLICKS || 0;
    });

    const result = {
      accountKey, startDate: sd, endDate: ed, rows,
      domains: Array.from(domainsSet).sort(),
      countries: Array.from(countriesSet).sort(),
      totals: {
        earnings: totalEarnings, pageViews: totalPageViews,
        impressions: totalImpressions, clicks: totalClicks,
        avgRpm: totalPageViews > 0 ? (totalEarnings / totalPageViews) * 1000 : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      },
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('Report error:', error.message);
    res.status(500).json({ error: 'Failed to fetch report', details: error.message });
  }
});

// GET /api/adsense/domains?account=MAIN&period=thisMonth — Domain-level summary
router.get('/domains', async (req: Request, res: Response) => {
  try {
    const accountKey = (req.query.account as string) || 'MAIN';
    const period = (req.query.period as string) || '30d';
    const cacheKey = `domains_${accountKey}_${period}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { adsense, accountId } = getClient(accountKey);
    const { startDate, endDate } = getDateRange(period);
    const s = parseDateParts(startDate);
    const e = parseDateParts(endDate);

    const response = await adsense.accounts.reports.generate({
      account: accountId,
      'startDate.year': s.year, 'startDate.month': s.month, 'startDate.day': s.day,
      'endDate.year': e.year, 'endDate.month': e.month, 'endDate.day': e.day,
      dimensions: ['DOMAIN_NAME'],
      metrics: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'PAGE_VIEWS_RPM', 'IMPRESSIONS', 'CLICKS'],
      reportingTimeZone: 'ACCOUNT_TIME_ZONE',
    });

    const rows = parseRows(response.data);
    rows.sort((a: any, b: any) => (b.ESTIMATED_EARNINGS || 0) - (a.ESTIMATED_EARNINGS || 0));

    const result = {
      accountKey, period,
      domains: rows.map((r: any) => ({
        domain: r.DOMAIN_NAME,
        pageViews: r.PAGE_VIEWS,
        revenue: r.ESTIMATED_EARNINGS,
        rpm: r.PAGE_VIEWS_RPM,
        impressions: r.IMPRESSIONS,
        clicks: r.CLICKS,
        ctr: r.IMPRESSIONS > 0 ? ((r.CLICKS / r.IMPRESSIONS) * 100) : 0,
      })),
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('Domains error:', error.message);
    res.status(500).json({ error: 'Failed to fetch domains', details: error.message });
  }
});

// GET /api/adsense/payments?account=MAIN — Payment history
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const accountKey = (req.query.account as string) || 'MAIN';
    const cacheKey = `payments_${accountKey}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const { adsense, accountId } = getClient(accountKey);
    const response = await adsense.accounts.payments.list({ parent: accountId });
    const payments = (response.data as any).payments || [];

    const result = payments.map((p: any) => ({
      name: p.name,
      date: p.date,
      amount: p.amount,
    }));

    setCache(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error('Payments error:', error.message);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

export default router;
