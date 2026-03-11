'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import './admin-users.css';

interface AdminUser {
  _id: string;
  username: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  adsenseAllowedDomains: string[];
  adsenseDomainDeductions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  username: string;
  password: string;
  adsenseAllowedDomains: string[];
  adsenseDomainDeductions: Record<string, number>;
  isActive: boolean;
}

const initialFormData: FormData = {
  username: '',
  password: '',
  adsenseAllowedDomains: [],
  adsenseDomainDeductions: {},
  isActive: true,
};

type ViewMode = 'list' | 'create' | 'edit';

export default function AdminUsersPage() {
  const API = getApiUrl();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [domainSearch, setDomainSearch] = useState('');

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/admin-users`);
      const data = await res.json();
      if (data.status) setAdmins(data.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch admin users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const res = await fetch(`${API}/api/adsense/domains?account=MAIN&period=30d`);
      const data = await res.json();
      const domains = (data.domains || []).map((d: any) => d.domain || d);
      setAvailableDomains(domains);
    } catch (err) {
      console.error('Failed to fetch domains:', err);
    }
  };

  useEffect(() => { fetchAdmins(); fetchDomains(); }, []);

  const handleCreate = () => {
    setEditingAdmin(null);
    setFormData(initialFormData);
    setError(null);
    setSuccess(null);
    setViewMode('create');
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      adsenseAllowedDomains: admin.adsenseAllowedDomains || [],
      adsenseDomainDeductions: admin.adsenseDomainDeductions || {},
      isActive: admin.isActive,
    });
    setError(null);
    setSuccess(null);
    setViewMode('edit');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingAdmin(null);
    setFormData(initialFormData);
    setError(null);
    setSuccess(null);
  };

  const handleView = (admin: AdminUser) => setViewingAdmin(admin);
  const closeViewModal = () => setViewingAdmin(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const body: any = {
        username: formData.username,
        adsenseAllowedDomains: formData.adsenseAllowedDomains,
        adsenseDomainDeductions: formData.adsenseDomainDeductions,
        isActive: formData.isActive,
      };

      if (formData.password) body.password = formData.password;

      let res;
      if (editingAdmin) {
        res = await fetch(`${API}/api/admin-users/${editingAdmin._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        if (!formData.password) { setError('Password is required'); setSaving(false); return; }
        body.password = formData.password;
        res = await fetch(`${API}/api/admin-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(editingAdmin ? 'Admin user updated successfully' : 'Admin user created successfully');
      fetchAdmins();
      setTimeout(() => { setViewMode('list'); setSuccess(null); }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminUser) => {
    if (!confirm(`Are you sure you want to delete admin "${admin.username}"?`)) return;
    try {
      await fetch(`${API}/api/admin-users/${admin._id}`, { method: 'DELETE' });
      fetchAdmins();
    } catch (err: any) {
      setError('Failed to delete');
    }
  };

  const toggleDomain = (domain: string) => {
    setFormData(prev => {
      const isRemoving = prev.adsenseAllowedDomains.includes(domain);
      const newDomains = isRemoving
        ? prev.adsenseAllowedDomains.filter(d => d !== domain)
        : [...prev.adsenseAllowedDomains, domain];
      const newDeductions = { ...prev.adsenseDomainDeductions };
      if (isRemoving) delete newDeductions[domain];
      else newDeductions[domain] = 0;
      return { ...prev, adsenseAllowedDomains: newDomains, adsenseDomainDeductions: newDeductions };
    });
  };

  const handleDomainDeductionChange = (domain: string, value: string) => {
    const num = parseInt(value, 10);
    const clamped = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    setFormData(prev => ({
      ...prev,
      adsenseDomainDeductions: { ...prev.adsenseDomainDeductions, [domain]: clamped },
    }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  const filteredDomains = availableDomains.filter(d =>
    d.toLowerCase().includes(domainSearch.toLowerCase())
  );

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.isActive).length;
  const superAdmins = admins.filter(a => a.isSuperAdmin).length;

  // ── Create/Edit Form ──
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="admin-users-page">
        <div className="page-header">
          <button className="btn-back" onClick={handleCancel}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="page-title">
            <h1>{viewMode === 'create' ? 'Create New Admin' : 'Edit Admin'}</h1>
            {editingAdmin && <span className="subtitle">Editing: {editingAdmin.username}</span>}
          </div>
        </div>

        {error && <div className="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}
        {success && <div className="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{success}</div>}

        <div className="form-layout">
          <div className="form-main">
            <div className="form-card">
              <div className="form-card-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <h2>Account Details</h2>
              </div>
              <div className="form-card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Username / Email</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username or email" disabled={editingAdmin?.isSuperAdmin} />
                    <span className="form-hint">Minimum 3 characters</span>
                  </div>
                  <div className="form-group">
                    <label>{editingAdmin ? 'New Password' : 'Password'}</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingAdmin ? 'Leave empty to keep current' : 'Enter password'} />
                    <span className="form-hint">Minimum 6 characters</span>
                  </div>
                </div>
                {!editingAdmin?.isSuperAdmin && (
                  <div className="form-group">
                    <label className="toggle-label">
                      <span className="toggle-text"><strong>Account Status</strong><small>Enable or disable this admin account</small></span>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                        <span className="toggle-slider"></span>
                      </label>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {!editingAdmin?.isSuperAdmin && (
              <div className="form-card adsense-card">
                <div className="form-card-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h2>AdSense Domain & Deduction Settings</h2>
                </div>
                <div className="form-card-body">
                  <div className="form-group">
                    <label>Allowed Domains</label>
                    <p className="field-description">Select which domains this admin can see. Each domain can have a deduction %.</p>
                    {formData.adsenseAllowedDomains.length > 0 && (
                      <div className="selected-items">
                        {formData.adsenseAllowedDomains.map(domain => (
                          <span key={domain} className="selected-tag">{domain}<button type="button" onClick={() => toggleDomain(domain)}>×</button></span>
                        ))}
                      </div>
                    )}
                    <div className="search-select">
                      <div className="search-input-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" placeholder="Search domains..." value={domainSearch} onChange={e => setDomainSearch(e.target.value)} className="search-input" />
                        {domainSearch && <button type="button" className="clear-search" onClick={() => setDomainSearch('')}>×</button>}
                      </div>
                      <div className="options-list">
                        {availableDomains.length === 0 ? (
                          <div className="no-results">No domains available. Fetch AdSense data first.</div>
                        ) : filteredDomains.length === 0 ? (
                          <div className="no-results">No domains match &quot;{domainSearch}&quot;</div>
                        ) : (
                          filteredDomains.map(domain => (
                            <label key={domain} className={`option-item ${formData.adsenseAllowedDomains.includes(domain) ? 'selected' : ''}`}>
                              <input type="checkbox" checked={formData.adsenseAllowedDomains.includes(domain)} onChange={() => toggleDomain(domain)} />
                              <span className="option-checkbox">{formData.adsenseAllowedDomains.includes(domain) && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</span>
                              <span className="option-label">{domain}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  {formData.adsenseAllowedDomains.length > 0 && (
                    <div className="form-group">
                      <label>Per-Domain Deduction</label>
                      <p className="field-description">Set a deduction % for each domain. User sees earnings after this deduction.</p>
                      <div className="domain-deductions-list">
                        {formData.adsenseAllowedDomains.map(domain => {
                          const pct = formData.adsenseDomainDeductions[domain] ?? 0;
                          return (
                            <div key={domain} className="domain-deduction-row">
                              <span className="domain-deduction-name">{domain}</span>
                              <div className="domain-deduction-control">
                                <input type="number" min="0" max="100" value={pct} onChange={e => handleDomainDeductionChange(domain, e.target.value)} className="domain-deduction-input" />
                                <span className="domain-deduction-suffix">% deduct</span>
                              </div>
                              <span className="domain-deduction-preview">User sees {100 - pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-sidebar">
            <div className="form-card sticky">
              <div className="form-card-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <h2>Actions</h2>
              </div>
              <div className="form-card-body">
                <div className="action-summary">
                  <div className="summary-item"><span className="summary-label">Domains</span><span className="summary-value">{formData.adsenseAllowedDomains.length} selected</span></div>
                  <div className="summary-item"><span className="summary-label">Status</span><span className={`summary-value ${formData.isActive ? 'active' : 'inactive'}`}>{formData.isActive ? 'Active' : 'Inactive'}</span></div>
                </div>
                <div className="action-buttons-vertical">
                  <button className="btn-primary" onClick={handleSave} disabled={saving || !formData.username || (!editingAdmin && !formData.password)}>
                    {saving ? <><div className="btn-spinner"></div>Saving...</> : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{editingAdmin ? 'Update Admin' : 'Create Admin'}</>}
                  </button>
                  <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="admin-users-page">
      <div className="page-header list-header">
        <div className="page-title">
          <h1>Admin Users</h1>
          <span className="subtitle">Manage administrator accounts and domain deductions</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Admin
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
          <div className="stat-content"><span className="stat-value">{totalAdmins}</span><span className="stat-label">Total Admins</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <div className="stat-content"><span className="stat-value">{activeAdmins}</span><span className="stat-label">Active</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
          <div className="stat-content"><span className="stat-value">{superAdmins}</span><span className="stat-label">Super Admins</span></div>
        </div>
      </div>

      {/* Admin List */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading admin users...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="40" height="40"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3>No Admin Users</h3>
          <p>Create your first admin user to get started.</p>
          <button className="btn-primary" onClick={handleCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add First Admin
          </button>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table-modern">
            <thead>
              <tr>
                <th className="th-user">Admin User</th>
                <th className="th-status">Status</th>
                <th className="th-revenue">Domain Deductions</th>
                <th className="th-login">Created</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin._id} className={`table-row ${!admin.isActive ? 'row-inactive' : ''} ${admin.isSuperAdmin ? 'row-super' : ''}`}>
                  <td className="td-user">
                    <div className="user-info-cell">
                      <div className={`user-avatar ${admin.isSuperAdmin ? 'avatar-super' : ''}`}>
                        {getInitials(admin.username)}
                        {admin.isSuperAdmin && <span className="avatar-crown">👑</span>}
                      </div>
                      <div className="user-details">
                        <span className="user-name">{admin.username}</span>
                        <span className="user-role">{admin.isSuperAdmin ? 'Super Administrator' : 'Admin'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="td-status">
                    <div className={`status-pill ${admin.isActive ? 'pill-active' : 'pill-inactive'}`}>
                      <span className="status-dot"></span>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  <td className="td-revenue">
                    {(() => {
                      const deductions = admin.adsenseDomainDeductions || {};
                      const entries = Object.entries(deductions);
                      if (entries.length === 0) return <span className="no-deductions">None</span>;
                      return (
                        <div className="deduction-chips">
                          {entries.map(([domain, pct]) => (
                            <span key={domain} className={`deduction-chip ${Number(pct) > 0 ? 'has-deduction' : ''}`}>
                              {domain.replace(/^www\./, '').split('.')[0]}: {pct}%
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="td-login">
                    <span className="login-date">{formatDate(admin.createdAt)}</span>
                  </td>
                  <td className="td-actions">
                    <div className="actions-group">
                      <button className="btn-action btn-view" onClick={() => handleView(admin)} title="View Details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View
                      </button>
                      <button className="btn-action btn-edit" onClick={() => handleEdit(admin)} title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </button>
                      {!admin.isSuperAdmin && (
                        <button className="btn-action btn-delete" onClick={() => handleDelete(admin)} title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Admin Modal */}
      {viewingAdmin && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className={`modal-avatar ${viewingAdmin.isSuperAdmin ? 'avatar-super' : ''}`}>
                  {getInitials(viewingAdmin.username)}
                </div>
                <div>
                  <h2>{viewingAdmin.username}</h2>
                  <span className="modal-subtitle">{viewingAdmin.isSuperAdmin ? 'Super Administrator' : 'Admin'}</span>
                </div>
              </div>
              <button className="modal-close" onClick={closeViewModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Account Status</h3>
                <div className={`status-pill large ${viewingAdmin.isActive ? 'pill-active' : 'pill-inactive'}`}>
                  <span className="status-dot"></span>
                  {viewingAdmin.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="detail-section">
                <h3>Domain Deductions</h3>
                {viewingAdmin.adsenseAllowedDomains.length > 0 ? (
                  <div className="modal-domains-table">
                    <table className="admin-table-modern" style={{ marginTop: 8 }}>
                      <thead><tr><th>Domain</th><th>Deduction %</th><th>User Sees</th></tr></thead>
                      <tbody>
                        {viewingAdmin.adsenseAllowedDomains.map(domain => {
                          const deduction = viewingAdmin.adsenseDomainDeductions?.[domain] ?? 0;
                          return <tr key={domain}><td>{domain}</td><td>{deduction}%</td><td>{100 - deduction}%</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', margin: '8px 0' }}>{viewingAdmin.isSuperAdmin ? 'Full access to all domains' : 'No domains assigned'}</p>
                )}
              </div>
              <div className="detail-section">
                <h3>Account Info</h3>
                <p><strong>Created:</strong> {formatDate(viewingAdmin.createdAt)}</p>
                <p><strong>Updated:</strong> {formatDate(viewingAdmin.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
