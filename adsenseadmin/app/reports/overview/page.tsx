'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface SummaryData {
  earnings: { value: number; delta: number };
  pageViews: { value: number; delta: number };
  rpm: { value: number; delta: number };
  impressions: { value: number; delta: number };
  ctr: { value: number; delta: number };
}

interface DomainRow {
  domain: string;
  pageViews: number;
  revenue: number;
  rpm: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export default function ReportsOverviewPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('thisMonth');

  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      fetch(`${getApiUrl()}/api/adsense/summary?account=MAIN&period=${period}`).then(r => r.json()),
      fetch(`${getApiUrl()}/api/adsense/domains?account=MAIN&period=${period}`).then(r => r.json()),
    ])
      .then(([summaryData, domainsData]) => {
        if (summaryData.error) throw new Error(summaryData.details || summaryData.error);
        setSummary(summaryData);
        setDomains(domainsData.domains || []);
      })
      .catch(err => setError(err.message || 'Failed to fetch data'))
      .finally(() => setLoading(false));
  }, [period]);

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
  const formatNumber = (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val.toLocaleString();
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const renderDelta = (delta: number) => {
    const isPositive = delta >= 0;
    return (
      <div className={`stat-card-change ${isPositive ? 'positive' : 'negative'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isPositive
            ? <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
            : <path d="M17 7l-5 5-5-5M17 17l-5-5-5 5" />
          }
        </svg>
        {isPositive ? '+' : ''}{delta.toFixed(1)}% vs prev period
      </div>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Overview</h1>
        <div className="account-selector">
          <label>Period:</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ minWidth: 160 }}>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading overview from Google Adsense...</div>
      ) : (
        <>
          {summary && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-label">Total Revenue</div>
                <div className="stat-card-value">{formatCurrency(summary.earnings.value)}</div>
                {renderDelta(summary.earnings.delta)}
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total Impressions</div>
                <div className="stat-card-value">{formatNumber(summary.impressions.value)}</div>
                {renderDelta(summary.impressions.delta)}
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Average RPM</div>
                <div className="stat-card-value">{formatCurrency(summary.rpm.value)}</div>
                {renderDelta(summary.rpm.delta)}
              </div>
              <div className="stat-card">
                <div className="stat-card-label">CTR</div>
                <div className="stat-card-value">{formatPercent(summary.ctr.value)}</div>
                {renderDelta(summary.ctr.delta)}
              </div>
            </div>
          )}

          {/* Top Performing Domains */}
          <div className="admin-card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Top Performing Domains</h3>
            {domains.length === 0 ? (
              <p style={{ fontSize: 14, color: '#6b7280' }}>No domain data available for this period.</p>
            ) : (
              <div className="admin-table-card" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Page Views</th>
                      <th>Revenue</th>
                      <th>RPM</th>
                      <th>CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.domain}</td>
                        <td>{formatNumber(d.pageViews)}</td>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(d.revenue)}</td>
                        <td>{formatCurrency(d.rpm)}</td>
                        <td>{formatPercent(d.ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
