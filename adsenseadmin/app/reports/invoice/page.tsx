'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';

interface Invoice {
  _id: string;
  title: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function InvoiceReportsPage() {
  const { userId, isSuperAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const fetchInvoices = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices?userId=${userId}&isSuperAdmin=${isSuperAdmin}`);
      const data = await res.json();
      if (data.status) {
        setInvoices(data.data);
      } else {
        setError(data.error || 'Failed to fetch invoices');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [userId, isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          amount: Number(newAmount),
          notes: newNotes,
          createdBy: userId,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setShowModal(false);
        setNewTitle('');
        setNewAmount('');
        setNewNotes('');
        fetchInvoices();
      } else {
        alert(data.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.status) {
        fetchInvoices();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return 'badge-success';
      case 'Rejected': return 'badge-error';
      case 'Pending': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'Approved').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0);

  if (loading && invoices.length === 0) {
    return <div className="admin-page"><p>Loading invoices...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>My Invoices</h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Invoice
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Invoiced (All Time)</div>
          <div className="stat-card-value">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Approved</div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending</div>
          <div className="stat-card-value" style={{ color: '#f59e0b' }}>${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Rejection Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv._id}>
                <td style={{ fontWeight: 600 }}>{inv.title}</td>
                <td style={{ fontWeight: 600 }}>${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`badge ${getStatusBadge(inv.status)}`}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ color: '#6b7280' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td style={{ color: '#ef4444', fontSize: '0.875rem' }}>{inv.rejectionReason || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {inv.status === 'Pending' && (
                      <button 
                        className="admin-btn" 
                        style={{ padding: '6px 12px', fontSize: 12, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'transparent' }}
                        onClick={() => handleDelete(inv._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No invoices found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card, #fff)', padding: '24px', borderRadius: '12px',
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            color: 'var(--text-primary, #111827)'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Create Invoice</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Title/Period</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-body, #f9fafb)', color: 'inherit' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Amount ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={newAmount} 
                  onChange={e => setNewAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-body, #f9fafb)', color: 'inherit' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Notes (Optional)</label>
                <textarea 
                  value={newNotes} 
                  onChange={e => setNewNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-body, #f9fafb)', color: 'inherit', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  className="admin-btn admin-btn-filter"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
