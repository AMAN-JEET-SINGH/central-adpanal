'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface ReportRow {
  DATE: string;
  DOMAIN_NAME: string;
  ESTIMATED_EARNINGS: number;
  PAGE_VIEWS: number;
  PAGE_VIEWS_RPM: number;
  IMPRESSIONS: number;
  IMPRESSIONS_RPM: number;
  CLICKS: number;
}

interface ReportTotals {
  earnings: number;
  pageViews: number;
  impressions: number;
  clicks: number;
  avgRpm: number;
  ctr: number;
}

export default function ReportsPage() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<ReportTotals | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = () => {
    setLoading(true);
    setError('');

    fetch(`${getApiUrl()}/api/adsense/report?account=MAIN&startDate=${dateFrom}&endDate=${dateTo}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.details || data.error);
        setRows(data.rows || []);
        setTotals(data.totals || null);
        setDomains(data.domains || []);
      })
      .catch(err => setError(err.message || 'Failed to fetch report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = selectedDomain
    ? rows.filter(r => r.DOMAIN_NAME === selectedDomain)
    : rows;

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
  const formatNumber = (val: number) => val.toLocaleString();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Reports</h1>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>From</label>
            <input
              className="admin-input"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>To</label>
            <input
              className="admin-input"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>Domain</label>
            <select
              className="admin-select"
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              style={{ width: 200 }}
            >
              <option value="">All Domains</option>
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={fetchReport} disabled={loading}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Totals */}
      {totals && !loading && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Earnings</div>
            <div className="stat-card-value">{formatCurrency(totals.earnings)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Page Views</div>
            <div className="stat-card-value">{formatNumber(totals.pageViews)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Impressions</div>
            <div className="stat-card-value">{formatNumber(totals.impressions)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Clicks</div>
            <div className="stat-card-value">{formatNumber(totals.clicks)}</div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading report data from Google Adsense...</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Domain</th>
                <th>Page Views</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>Page RPM</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No data for selected period</td></tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: '#6b7280' }}>{row.DATE}</td>
                    <td style={{ fontWeight: 600 }}>{row.DOMAIN_NAME}</td>
                    <td>{formatNumber(row.PAGE_VIEWS)}</td>
                    <td>{formatNumber(row.IMPRESSIONS)}</td>
                    <td>{formatNumber(row.CLICKS)}</td>
                    <td>{formatCurrency(row.PAGE_VIEWS_RPM)}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(row.ESTIMATED_EARNINGS)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
