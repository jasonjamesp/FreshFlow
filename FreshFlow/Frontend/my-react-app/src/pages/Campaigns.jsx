import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import {
  PageLoading,
  PageError,
  EmptyState,
  StatusBadge,
  ActionBadge,
  inr,
  SearchBar,
  FilterSelect,
  ConfirmDialog,
  PageHeader,
} from '../components.jsx';

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'SENT', label: 'SENT' },
  { value: 'REDEEMED', label: 'REDEEMED' },
  { value: 'EXPIRED', label: 'EXPIRED' },
  { value: 'REJECTED', label: 'REJECTED' },
];

const ACTION_FILTERS = [
  { value: '', label: 'All Actions' },
  { value: 'DISCOUNT', label: 'DISCOUNT' },
  { value: 'NOTIFY', label: 'NOTIFY' },
  { value: 'BUNDLE', label: 'BUNDLE' },
];

// Valid transitions from current status
const TRANSITIONS = {
  DRAFT: ['APPROVED', 'REJECTED'],
  APPROVED: ['SENT', 'REJECTED'],
  SENT: ['REDEEMED', 'EXPIRED'],
  REDEEMED: [],
  EXPIRED: [],
  REJECTED: [],
};

export default function Campaigns() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null); // { campaignId, newStatus, label }
  const [mutating, setMutating] = useState(false);
  const [mutateMsg, setMutateMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (actionFilter) params.set('action', actionFilter);
      const result = await api.get(`/campaigns?${params}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = (data?.campaigns ?? []).filter((c) => {
    const s = search.toLowerCase();
    return (
      !search ||
      c.campaignId.toLowerCase().includes(s) ||
      c.customerName.toLowerCase().includes(s) ||
      c.productName.toLowerCase().includes(s) ||
      (c.customerEmail || '').toLowerCase().includes(s)
    );
  });

  const handleStatusChange = async (campaignId, newStatus) => {
    setMutating(true);
    setMutateMsg(null);
    try {
      await api.patch(`/campaigns/${campaignId}/status`, { status: newStatus });
      setMutateMsg({ success: true, message: `Campaign ${campaignId} → ${newStatus}` });
      setConfirm(null);
      setSelected(null);
      await load();
    } catch (err) {
      setMutateMsg({ success: false, message: err.message });
      setConfirm(null);
    } finally {
      setMutating(false);
    }
  };

  if (loading) return <PageLoading message="Loading campaigns…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  return (
    <div>
      {confirm && (
        <ConfirmDialog
          title={`Confirm: ${confirm.label}`}
          message={`Change campaign ${confirm.campaignId} to ${confirm.newStatus}?`}
          confirmLabel={confirm.label}
          danger={confirm.newStatus === 'REJECTED'}
          onConfirm={() => handleStatusChange(confirm.campaignId, confirm.newStatus)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <PageHeader
        eyebrow="Campaign Management"
        title="Campaigns"
        description="Review, approve, and track AI-generated customer campaigns."
      >
        <button id="refresh-campaigns-btn" className="secondary-button" onClick={load} disabled={loading}>
          ↻ Refresh
        </button>
      </PageHeader>

      {mutateMsg && (
        <div className={`gen-result-box ${mutateMsg.success ? 'success' : 'error'}`} role="status">
          {mutateMsg.success ? `✅ ${mutateMsg.message}` : `❌ ${mutateMsg.message}`}
          <button className="gen-result-close" onClick={() => setMutateMsg(null)}>×</button>
        </div>
      )}

      <div className="filter-row">
        <SearchBar id="campaigns-search" value={search} onChange={setSearch} placeholder="Search campaigns…" />
        <FilterSelect id="status-filter" label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        <FilterSelect id="action-filter" label="Filter by action" value={actionFilter} onChange={setActionFilter} options={ACTION_FILTERS} />
      </div>

      <div className="campaigns-layout">
        {/* Campaign list */}
        <div className="panel table-panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div>
              <h2>All Campaigns</h2>
              <p>Click a campaign to review and take action.</p>
            </div>
            <span className="count-tag">{filtered.length} campaigns</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="📢" title="No campaigns" description="Generate AI campaigns from the Overview page." />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Action</th>
                    <th>Discount</th>
                    <th>Valid Until</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const transitions = TRANSITIONS[c.status] || [];
                    return (
                      <tr
                        key={c.campaignId}
                        style={{ cursor: 'pointer', background: selected?.campaignId === c.campaignId ? '#f5fcf9' : undefined }}
                        onClick={() => setSelected(selected?.campaignId === c.campaignId ? null : c)}
                      >
                        <td>
                          <strong style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#26354a' }}>{c.campaignId}</strong>
                          <span style={{ display: 'block', color: '#9aa5b4', fontSize: 10 }}>{c.createdAt}</span>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">{c.customerName.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <strong>{c.customerName}</strong>
                              <span>{c.customerEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong style={{ display: 'block', fontSize: 12, color: '#26354a' }}>{c.productName}</strong>
                          <span style={{ color: '#9aa5b4', fontSize: 10 }}>{c.category}</span>
                        </td>
                        <td><ActionBadge action={c.action} /></td>
                        <td>
                          {c.action === 'DISCOUNT' && Number(c.discountPercentage) > 0 ? (
                            <span style={{ color: '#228254', fontWeight: 700 }}>
                              {c.discountPercentage}% · {inr(c.discountAmount)}
                            </span>
                          ) : (
                            <span style={{ color: '#9aa5b4' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: '#9aa5b4' }}>
                          {c.validUntil ? new Date(c.validUntil).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {transitions.includes('APPROVED') && (
                              <button
                                className="primary-button"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                disabled={mutating}
                                onClick={() => setConfirm({ campaignId: c.campaignId, newStatus: 'APPROVED', label: 'Approve' })}
                              >
                                ✓ Approve
                              </button>
                            )}
                            {transitions.includes('REJECTED') && (
                              <button
                                className="danger-button"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                disabled={mutating}
                                onClick={() => setConfirm({ campaignId: c.campaignId, newStatus: 'REJECTED', label: 'Reject' })}
                              >
                                ✕ Reject
                              </button>
                            )}
                            {transitions.includes('SENT') && (
                              <button
                                className="secondary-button"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                disabled={mutating}
                                onClick={() => setConfirm({ campaignId: c.campaignId, newStatus: 'SENT', label: 'Mark Sent' })}
                              >
                                📤 Send
                              </button>
                            )}
                            {transitions.includes('REDEEMED') && (
                              <button
                                className="secondary-button"
                                style={{ padding: '6px 10px', fontSize: 11, color: '#228254', borderColor: '#c9ead9' }}
                                disabled={mutating}
                                onClick={() => setConfirm({ campaignId: c.campaignId, newStatus: 'REDEEMED', label: 'Mark Redeemed' })}
                              >
                                🎉 Redeem
                              </button>
                            )}
                            {transitions.length === 0 && (
                              <span style={{ color: '#9aa5b4', fontSize: 11 }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <CampaignDetail
            campaign={selected}
            onClose={() => setSelected(null)}
            onAction={(newStatus) => setConfirm({ campaignId: selected.campaignId, newStatus, label: newStatus })}
            mutating={mutating}
          />
        )}
      </div>
    </div>
  );
}

function CampaignDetail({ campaign: c, onClose, onAction, mutating }) {
  const transitions = TRANSITIONS[c.status] || [];

  return (
    <div className="panel" style={{ padding: '25px', minWidth: 0 }}>
      <div className="panel-heading">
        <div>
          <h2>Campaign Details</h2>
          <p style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.campaignId}</p>
        </div>
        <button className="secondary-button" style={{ fontSize: 11, padding: '7px 10px' }} onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Status */}
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <StatusBadge status={c.status} />
        </div>

        <div className="detail-row">
          <span className="detail-label">Action</span>
          <ActionBadge action={c.action} />
        </div>

        {/* Customer */}
        <div style={{ padding: '14px', border: '1px solid #e9edf3', borderRadius: 10, background: '#fcfdff' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: '#26354a' }}>Customer</p>
          <strong style={{ color: '#26354a' }}>{c.customerName}</strong>
          <span style={{ display: 'block', fontSize: 12, color: '#8b96a5', marginTop: 4 }}>{c.customerEmail}</span>
        </div>

        {/* Product */}
        <div style={{ padding: '14px', border: '1px solid #e9edf3', borderRadius: 10, background: '#fcfdff' }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: '#26354a' }}>Product</p>
          <strong style={{ color: '#26354a' }}>{c.productName}</strong>
          <span style={{ display: 'block', fontSize: 12, color: '#8b96a5', marginTop: 4 }}>{c.category}</span>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
            <span>Cost: <strong>{inr(c.costPrice)}</strong></span>
            <span>Selling: <strong>{inr(c.sellingPrice)}</strong></span>
          </div>
        </div>

        {/* Discount */}
        {c.action === 'DISCOUNT' && Number(c.discountPercentage) > 0 && (
          <div style={{ padding: '14px', borderRadius: 10, background: '#f0faf5', border: '1px solid #c9ead9' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: '#228254' }}>Discount</p>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#15966a' }}>{c.discountPercentage}%</span>
            <span style={{ display: 'block', fontSize: 12, color: '#8b96a5', marginTop: 4 }}>
              {inr(c.discountAmount)} discount · Valid until{' '}
              {c.validUntil ? new Date(c.validUntil).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
        )}

        {/* AI Message */}
        {c.aiMessage && (
          <div className="reason-box" style={{ borderColor: '#36bc8b', background: '#f2fbf7' }}>
            <strong>📱 Customer Message</strong>
            <p>{c.aiMessage}</p>
            <p style={{ marginTop: 10, color: '#9aa5b4', fontSize: 10 }}>
              ℹ️ No email/SMS provider is configured. Use this message for manual outreach.
            </p>
          </div>
        )}

        {/* Reason */}
        <div className="reason-box">
          <strong>🤖 AI Reasoning</strong>
          <p>{c.reason}</p>
        </div>

        {/* Batch */}
        {c.batchId && (
          <div className="detail-row">
            <span className="detail-label">Batch</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.batchId}</span>
          </div>
        )}

        {/* Actions */}
        {transitions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid #e9edf3' }}>
            {transitions.includes('APPROVED') && (
              <button className="primary-button" disabled={mutating} onClick={() => onAction('APPROVED')}>
                ✓ Approve
              </button>
            )}
            {transitions.includes('REJECTED') && (
              <button className="danger-button" disabled={mutating} onClick={() => onAction('REJECTED')}>
                ✕ Reject
              </button>
            )}
            {transitions.includes('SENT') && (
              <button className="secondary-button" disabled={mutating} onClick={() => onAction('SENT')}>
                📤 Mark as Sent
              </button>
            )}
            {transitions.includes('REDEEMED') && (
              <button className="secondary-button" style={{ color: '#228254', borderColor: '#c9ead9' }} disabled={mutating} onClick={() => onAction('REDEEMED')}>
                🎉 Mark as Redeemed
              </button>
            )}
            {transitions.includes('EXPIRED') && (
              <button className="secondary-button" disabled={mutating} onClick={() => onAction('EXPIRED')}>
                ⌛ Mark as Expired
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
