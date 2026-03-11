'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getApiUrl } from '@/lib/api';
import './adsense.css';

// ── Helpers ──

function formatCurrency(val: number): string {
  return '$' + val.toFixed(2);
}

function formatNumber(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return val.toLocaleString();
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function todayStr(): string {
  return fmtDate(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtDate(d);
}

function monthStart(): string {
  const d = new Date();
  return fmtDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

// ── Types ──

interface ReportRow {
  DATE: string;
  COUNTRY_NAME: string;
  DOMAIN_NAME: string;
  PAGE_VIEWS: number;
  PAGE_VIEWS_RPM: number;
  IMPRESSIONS: number;
  IMPRESSIONS_RPM: number;
  CLICKS: number;
  ESTIMATED_EARNINGS: number;
}

interface AccountInfo {
  name: string;
  publisherId: string;
  state: string;
  timeZone: string | null;
}

type SortKey = 'DATE' | 'COUNTRY_NAME' | 'DOMAIN_NAME' | 'PAGE_VIEWS' | 'PAGE_VIEWS_RPM' | 'IMPRESSIONS' | 'IMPRESSIONS_RPM' | 'CLICKS' | 'ESTIMATED_EARNINGS';
type SortDir = 'asc' | 'desc';

// ── Multi-select Dropdown ──

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allSelected = selected.size === options.length;

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(options));
  }

  function toggle(item: string) {
    const next = new Set(selected);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    onChange(next);
  }

  const displayText = allSelected
    ? `All ${label}`
    : selected.size === 0
      ? `No ${label}`
      : `${selected.size} of ${options.length} ${label}`;

  return (
    <div className="ms-dropdown" ref={ref}>
      <button className="ms-dropdown-btn" onClick={() => setOpen(!open)} type="button">
        {displayText}
        <span className={`ms-dropdown-arrow ${open ? 'open' : ''}`}>&#9662;</span>
      </button>
      {open && (
        <div className="ms-dropdown-menu">
          <label className="ms-dropdown-item ms-dropdown-toggle-all">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </label>
          <div className="ms-dropdown-divider" />
          {options.map(opt => (
            <label key={opt} className="ms-dropdown-item">
              <input type="checkbox" checked={selected.has(opt)} onChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Line Chart with Tooltips ──

function LineChart({
  data,
  labels,
  height = 250,
  color = '#10B981',
  title,
  valueFormatter = (v: number) => v.toLocaleString(),
}: {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
  title: string;
  valueFormatter?: (v: number) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return <div className="adsense-empty">No data available</div>;
  }

  const maxVal = Math.max(...data.filter(v => v > 0), 1) * 1.15;
  const minVal = Math.min(...data.filter(v => v >= 0), 0);
  const padding = { left: 60, right: 30, top: 30, bottom: 50 };
  const graphWidth = Math.max(600, data.length * 30);
  const graphHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * (graphWidth - padding.left - padding.right);
  const getY = (value: number) => padding.top + graphHeight - ((value - minVal) / (maxVal - minVal || 1)) * graphHeight;

  const pathD = data.map((value, index) => {
    const x = getX(index);
    const y = getY(value);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${pathD} L ${getX(data.length - 1)} ${padding.top + graphHeight} L ${getX(0)} ${padding.top + graphHeight} Z`;

  const yAxisSteps = 5;
  const yLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = minVal + ((maxVal - minVal) / yAxisSteps) * (yAxisSteps - i);
    return { value, y: padding.top + (i / yAxisSteps) * graphHeight };
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="line-chart-container" ref={containerRef} onMouseMove={handleMouseMove}>
      <h3 className="line-chart-title">{title}</h3>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${graphWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {yLabels.map((label, i) => (
          <g key={i}>
            <line x1={padding.left} y1={label.y} x2={graphWidth - padding.right} y2={label.y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray={i === yLabels.length - 1 ? "0" : "4,4"} />
            <text x={padding.left - 10} y={label.y + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{valueFormatter(label.value)}</text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#gradient-${title.replace(/\s/g, '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((value, index) => {
          const x = getX(index);
          const y = getY(value);
          const isHovered = hoveredIndex === index;
          return (
            <g key={index}>
              <circle cx={x} cy={y} r={isHovered ? 7 : 4} fill={isHovered ? color : 'white'} stroke={color} strokeWidth="2" style={{ cursor: 'pointer', transition: 'r 0.15s' }} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} />
            </g>
          );
        })}

        {labels.map((label, index) => {
          const x = getX(index);
          const showEvery = Math.max(1, Math.floor(labels.length / 10));
          if (index % showEvery !== 0 && index !== labels.length - 1) return null;
          return (
            <text key={index} x={x} y={height - 15} fontSize="11" fill="#6b7280" textAnchor="middle">{label}</text>
          );
        })}
      </svg>

      {hoveredIndex !== null && (
        <div className="chart-cursor-tooltip" style={{ position: 'fixed', left: mousePos.x + 15, top: mousePos.y - 10, pointerEvents: 'none', zIndex: 1000 }}>
          <div className="chart-cursor-tooltip-content">
            <span className="chart-cursor-tooltip-label">{labels[hoveredIndex]}</span>
            <span className="chart-cursor-tooltip-value" style={{ color }}>{valueFormatter(data[hoveredIndex])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function AdSenseDashboard() {
  const API = getApiUrl();

  // Date range state
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(todayStr());
  const [appliedStart, setAppliedStart] = useState(daysAgo(29));
  const [appliedEnd, setAppliedEnd] = useState(todayStr());

  // Data state
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [payments, setPayments] = useState<{name: string; date: string; amount: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('DATE');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const lastReportId = useRef<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [acctRes, reportRes, paymentsRes] = await Promise.all([
        fetch(`${API}/api/adsense/account?account=MAIN`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/adsense/report?account=MAIN&startDate=${appliedStart}&endDate=${appliedEnd}`).then(r => r.json()),
        fetch(`${API}/api/adsense/payments?account=MAIN`).then(r => r.json()).catch(() => []),
      ]);

      if (acctRes && !acctRes.error) setAccount(acctRes);
      if (reportRes.error) throw new Error(reportRes.details || reportRes.error);

      setRows(reportRes.rows || []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);

      // Initialize filters
      const reportId = `${appliedStart}_${appliedEnd}`;
      if (reportId !== lastReportId.current) {
        lastReportId.current = reportId;
        const domains = reportRes.domains || [];
        const countries = reportRes.countries || [];
        setAllDomains(domains);
        setAllCountries(countries);
        setSelectedDomains(new Set(domains));
        setSelectedCountries(new Set(countries));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API, appliedStart, appliedEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtering ──
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (selectedDomains.size > 0 && !selectedDomains.has(row.DOMAIN_NAME)) return false;
      if (selectedCountries.size > 0 && !selectedCountries.has(row.COUNTRY_NAME)) return false;
      return true;
    });
  }, [rows, selectedDomains, selectedCountries]);

  // ── Computed totals ──
  const filteredTotals = useMemo(() => {
    let earnings = 0, pageViews = 0, impressions = 0, clicks = 0, pageViewsRpmSum = 0, impressionsRpmSum = 0;
    filteredRows.forEach(r => {
      earnings += r.ESTIMATED_EARNINGS || 0;
      pageViews += r.PAGE_VIEWS || 0;
      impressions += r.IMPRESSIONS || 0;
      clicks += r.CLICKS || 0;
      pageViewsRpmSum += r.PAGE_VIEWS_RPM || 0;
      impressionsRpmSum += r.IMPRESSIONS_RPM || 0;
    });
    const count = filteredRows.length || 1;
    return { earnings, pageViews, impressions, clicks, avgPageViewsRpm: pageViewsRpmSum / count, avgImpressionsRpm: impressionsRpmSum / count };
  }, [filteredRows]);

  // ── Sorted rows ──
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDir]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    const earningsMap = new Map<string, number>();
    const impressionsMap = new Map<string, number>();
    const pageViewsMap = new Map<string, number>();
    const rpmMap = new Map<string, { sum: number; count: number }>();

    filteredRows.forEach(r => {
      const date = r.DATE || '';
      earningsMap.set(date, (earningsMap.get(date) || 0) + (r.ESTIMATED_EARNINGS || 0));
      impressionsMap.set(date, (impressionsMap.get(date) || 0) + (r.IMPRESSIONS || 0));
      pageViewsMap.set(date, (pageViewsMap.get(date) || 0) + (r.PAGE_VIEWS || 0));
      const existing = rpmMap.get(date) || { sum: 0, count: 0 };
      rpmMap.set(date, { sum: existing.sum + (r.IMPRESSIONS_RPM || 0), count: existing.count + 1 });
    });

    const dates = Array.from(earningsMap.keys()).sort();
    const labels = dates.map(d => {
      const parts = d.split('-');
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
    });

    return {
      labels,
      earnings: dates.map(d => earningsMap.get(d) || 0),
      impressions: dates.map(d => impressionsMap.get(d) || 0),
      pageViews: dates.map(d => pageViewsMap.get(d) || 0),
      rpm: dates.map(d => { const data = rpmMap.get(d); return data ? data.sum / data.count : 0; }),
    };
  }, [filteredRows]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function applyDates() {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function applyPreset(preset: 'today' | '7d' | '30d' | 'thisMonth') {
    const today = todayStr();
    let s = today;
    switch (preset) {
      case 'today': s = today; break;
      case '7d': s = daysAgo(6); break;
      case '30d': s = daysAgo(29); break;
      case 'thisMonth': s = monthStart(); break;
    }
    setStartDate(s);
    setEndDate(today);
    setAppliedStart(s);
    setAppliedEnd(today);
  }

  const handleRefresh = () => loadData(true);

  const handleExport = () => {
    if (sortedRows.length === 0) { alert('No data to export'); return; }
    const headers = ['Date', 'Country', 'Domain', 'Page Views', 'Page RPM', 'Impressions', 'Imp. RPM', 'Clicks', 'Est. Revenue'];
    const csvRows = sortedRows.map(row => [
      `="${row.DATE}"`, row.COUNTRY_NAME, row.DOMAIN_NAME, row.PAGE_VIEWS,
      row.PAGE_VIEWS_RPM.toFixed(2), row.IMPRESSIONS, row.IMPRESSIONS_RPM.toFixed(2),
      row.CLICKS, row.ESTIMATED_EARNINGS.toFixed(2),
    ]);
    csvRows.push(['TOTALS', '', '', filteredTotals.pageViews, filteredTotals.avgPageViewsRpm.toFixed(2), filteredTotals.impressions, filteredTotals.avgImpressionsRpm.toFixed(2), filteredTotals.clicks, filteredTotals.earnings.toFixed(2)] as any);
    const escapeCSV = (v: any) => { const s = String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const csvContent = [headers.map(escapeCSV).join(','), ...csvRows.map((row: any) => row.map(escapeCSV).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adsense-report-${appliedStart}-to-${appliedEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="adsense-dashboard">
        <div className="adsense-loading">Loading AdSense data...</div>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="adsense-dashboard">
        <div className="adsense-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="adsense-dashboard">
      {/* Header */}
      <div className="adsense-header-row">
        <div>
          <h1>AdSense Dashboard</h1>
        </div>
        <div className="adsense-header-actions">
          <button className="adsense-download-btn" onClick={handleExport} title="Download CSV">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button className={`adsense-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh} disabled={refreshing}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Account Bar */}
      {account && (
        <div className="adsense-account-bar">
          <div className="adsense-account-info">
            <span className="adsense-account-name">{String(account.name || 'AdSense Account')}</span>
            <span className="adsense-publisher-id">{String(account.publisherId || '')}</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="adsense-filters-bar">
        <div className="adsense-filter-group">
          <label className="adsense-filter-label">From</label>
          <input type="date" className="adsense-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="adsense-filter-group">
          <label className="adsense-filter-label">To</label>
          <input type="date" className="adsense-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="adsense-preset-btn adsense-go-btn" onClick={applyDates} disabled={startDate === appliedStart && endDate === appliedEnd}>Go</button>
        <div className="adsense-presets">
          {([
            { key: 'today' as const, label: 'Today' },
            { key: '7d' as const, label: '7D' },
            { key: '30d' as const, label: '30D' },
            { key: 'thisMonth' as const, label: 'This Month' },
          ]).map(p => (
            <button key={p.key} className="adsense-preset-btn" onClick={() => applyPreset(p.key)}>{p.label}</button>
          ))}
        </div>
        {allDomains.length > 0 && (
          <MultiSelectDropdown label="Subdomains" options={allDomains} selected={selectedDomains} onChange={setSelectedDomains} />
        )}
        {allCountries.length > 0 && (
          <MultiSelectDropdown label="Countries" options={allCountries} selected={selectedCountries} onChange={setSelectedCountries} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="adsense-metrics-row">
        <div className="adsense-metric-card compact featured">
          <div className="adsense-metric-label">Total Revenue</div>
          <div className="adsense-metric-value">{formatCurrency(filteredTotals.earnings)}</div>
        </div>
        <div className="adsense-metric-card compact">
          <div className="adsense-metric-label">Impressions</div>
          <div className="adsense-metric-value">{formatNumber(filteredTotals.impressions)}</div>
        </div>
        <div className="adsense-metric-card compact">
          <div className="adsense-metric-label">Avg Impression RPM</div>
          <div className="adsense-metric-value">{formatCurrency(filteredTotals.avgImpressionsRpm)}</div>
        </div>
        <div className="adsense-metric-card compact">
          <div className="adsense-metric-label">Page Views</div>
          <div className="adsense-metric-value">{formatNumber(filteredTotals.pageViews)}</div>
        </div>
        <div className="adsense-metric-card compact">
          <div className="adsense-metric-label">Clicks</div>
          <div className="adsense-metric-value">{formatNumber(filteredTotals.clicks)}</div>
        </div>
        <div className="adsense-metric-card compact">
          <div className="adsense-metric-label">Avg Page RPM</div>
          <div className="adsense-metric-value">{formatCurrency(filteredTotals.avgPageViewsRpm)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="adsense-charts-grid">
        <div className="adsense-chart-section">
          <LineChart data={chartData.earnings} labels={chartData.labels} color="#10B981" title="Daily Earnings" valueFormatter={(v) => formatCurrency(v)} />
        </div>
        <div className="adsense-chart-section">
          <LineChart data={chartData.impressions} labels={chartData.labels} color="#6366F1" title="Daily Impressions" valueFormatter={(v) => formatNumber(v)} />
        </div>
        <div className="adsense-chart-section">
          <LineChart data={chartData.pageViews} labels={chartData.labels} color="#F59E0B" title="Daily Page Views" valueFormatter={(v) => formatNumber(v)} />
        </div>
        <div className="adsense-chart-section">
          <LineChart data={chartData.rpm} labels={chartData.labels} color="#EC4899" title="Daily Avg RPM" valueFormatter={(v) => formatCurrency(v)} />
        </div>
      </div>

      {/* Detailed Table */}
      <div className="adsense-table-section">
        <div className="adsense-table-header">
          <h2 className="adsense-table-title">Detailed Report ({filteredRows.length} rows)</h2>
        </div>
        {filteredRows.length === 0 ? (
          <div className="adsense-empty">No data matches the current filters</div>
        ) : (
          <div className="adsense-table-scroll">
            <table className="adsense-table adsense-table-sortable">
              <thead>
                <tr>
                  {([
                    { key: 'DATE' as SortKey, label: 'Date', cls: '' },
                    { key: 'COUNTRY_NAME' as SortKey, label: 'Country', cls: '' },
                    { key: 'DOMAIN_NAME' as SortKey, label: 'Domain', cls: '' },
                    { key: 'PAGE_VIEWS' as SortKey, label: 'Page Views', cls: 'numeric' },
                    { key: 'PAGE_VIEWS_RPM' as SortKey, label: 'Page RPM', cls: 'numeric' },
                    { key: 'IMPRESSIONS' as SortKey, label: 'Impressions', cls: 'numeric' },
                    { key: 'IMPRESSIONS_RPM' as SortKey, label: 'Imp. RPM', cls: 'numeric' },
                    { key: 'CLICKS' as SortKey, label: 'Clicks', cls: 'numeric' },
                    { key: 'ESTIMATED_EARNINGS' as SortKey, label: 'Est. Revenue', cls: 'numeric' },
                  ]).map(col => (
                    <th key={col.key} className={`${col.cls} sortable-th`} onClick={() => handleSort(col.key)}>
                      {col.label}{sortIndicator(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.DATE}</td>
                    <td>{row.COUNTRY_NAME}</td>
                    <td>{row.DOMAIN_NAME}</td>
                    <td className="numeric">{formatNumber(row.PAGE_VIEWS)}</td>
                    <td className="numeric">{formatCurrency(row.PAGE_VIEWS_RPM)}</td>
                    <td className="numeric">{formatNumber(row.IMPRESSIONS)}</td>
                    <td className="numeric">{formatCurrency(row.IMPRESSIONS_RPM)}</td>
                    <td className="numeric">{formatNumber(row.CLICKS)}</td>
                    <td className="numeric">{formatCurrency(row.ESTIMATED_EARNINGS)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="adsense-totals-row">
                  <td colSpan={3}><strong>Totals</strong></td>
                  <td className="numeric"><strong>{formatNumber(filteredTotals.pageViews)}</strong></td>
                  <td className="numeric"><strong>{formatCurrency(filteredTotals.avgPageViewsRpm)}</strong></td>
                  <td className="numeric"><strong>{formatNumber(filteredTotals.impressions)}</strong></td>
                  <td className="numeric"><strong>{formatCurrency(filteredTotals.avgImpressionsRpm)}</strong></td>
                  <td className="numeric"><strong>{formatNumber(filteredTotals.clicks)}</strong></td>
                  <td className="numeric"><strong>{formatCurrency(filteredTotals.earnings)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="adsense-table-section">
        <h2 className="adsense-table-title">Payment History</h2>
        {payments.length === 0 ? (
          <div className="adsense-empty">No payment history available</div>
        ) : (
          <table className="adsense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, i) => (
                <tr key={i}>
                  <td>{String(payment.date || '')}</td>
                  <td className="numeric">{String(payment.amount || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
