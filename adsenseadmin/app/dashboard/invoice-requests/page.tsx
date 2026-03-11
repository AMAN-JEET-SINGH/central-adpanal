'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';

interface InvoiceRequest {
  _id: string;
  title: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  createdBy: {
    _id: string;
    username: string;
  };
}

export default function InvoiceRequestsPage() {
  const { userId, isSuperAdmin } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchInvoices = async () => {
    if (!userId || !isSuperAdmin) return;
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices?userId=${userId}&isSuperAdmin=true`);
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

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this invoice?')) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices/${id}/approve`, {
        method: 'PATCH',
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

  const handleRejectInit = (id: string) => {
    setActiveInvoiceId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/invoices/${activeInvoiceId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rejectionReason }),
      });
      const data = await res.json();
      if (data.status) {
        setRejectModalOpen(false);
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
      case 'Pending': return 'badge-warning';
      case 'Rejected': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  if (!isSuperAdmin) {
    return <div className="admin-page"><h1>Access Denied: Super Admin Only</h1></div>;
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingCount = invoices.filter(i => i.status === 'Pending').length;
  const approvedCount = invoices.filter(i => i.status === 'Approved').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>All Invoice Requests</h1>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Requests</div>
          <div className="stat-card-value">{invoices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending</div>
          <div className="stat-card-value" style={{ color: '#f59e0b' }}>
            {pendingCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Approved</div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>
            {approvedCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Amount (All)</div>
          <div className="stat-card-value">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No requests found.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id}>
                <td>{inv.createdBy?.username || 'Unknown'}</td>
                <td style={{ fontWeight: 600 }}>{inv.title}</td>
                <td style={{ fontWeight: 600 }}>${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`badge ${getStatusBadge(inv.status)}`}>
                    {inv.status}
                  </span>
                </td>
                <td style={{ color: '#6b7280' }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {inv.status === 'Pending' && (
                      <>
                        <button 
                          className="admin-btn admin-btn-success" 
                          style={{ padding: '6px 12px', fontSize: 12, background: '#10b981', color: '#fff', border: 'none' }}
                          onClick={() => handleApprove(inv._id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="admin-btn" 
                          style={{ padding: '6px 12px', fontSize: 12, background: '#ef4444', color: '#fff', border: 'none' }}
                          onClick={() => handleRejectInit(inv._id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectModalOpen && (
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
            <h2 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Reject Invoice</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Reason for Rejection</label>
              <textarea 
                value={rejectionReason} 
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Optional but recommended..."
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-body, #f9fafb)', color: 'inherit', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="admin-btn admin-btn-filter"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                onClick={submitReject} 
                className="admin-btn"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
