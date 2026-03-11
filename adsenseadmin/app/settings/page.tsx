'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [panelName, setPanelName] = useState('Adsense Admin');
  const [defaultAccount, setDefaultAccount] = useState('MAIN');
  const [currency, setCurrency] = useState('USD');
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Settings</h1>
      </div>

      {saved && (
        <div style={{
          background: '#d1fae5',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 500,
          border: '1px solid #a7f3d0',
        }}>
          ✓ Settings saved successfully!
        </div>
      )}

      {/* General Settings */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>General</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>Panel Name</label>
            <input
              className="admin-input"
              value={panelName}
              onChange={e => setPanelName(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>Default Account</label>
            <select
              className="admin-select"
              value={defaultAccount}
              onChange={e => setDefaultAccount(e.target.value)}
              style={{ maxWidth: 400 }}
            >
              <option value="MAIN">MAIN</option>
              <option value="ALT">ALT</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 6 }}>Currency</label>
            <select
              className="admin-select"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ maxWidth: 400 }}
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Notifications</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="checkbox"
            id="notifications"
            checked={notifications}
            onChange={e => setNotifications(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#4338ca' }}
          />
          <label htmlFor="notifications" style={{ fontSize: 14, cursor: 'pointer' }}>
            Enable email notifications for revenue milestones
          </label>
        </div>
      </div>

      {/* Adsense Accounts Info */}
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Configured Adsense Accounts</h3>
        <p style={{ fontSize: 14, color: 'var(--admin-text-muted, #6b7280)', marginBottom: 16 }}>
          Accounts are configured via environment variables. Create <code>.env.account.*</code> files to add more accounts.
        </p>
        <div className="admin-table-card" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Status</th>
                <th>Config File</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>MAIN</td>
                <td><span className="badge badge-success">Configured</span></td>
                <td style={{ color: '#6b7280' }}>.env.local</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>ALT</td>
                <td><span className="badge badge-warning">Sample Only</span></td>
                <td style={{ color: '#6b7280' }}>.env.account.sample</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button className="admin-btn admin-btn-primary" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
}
