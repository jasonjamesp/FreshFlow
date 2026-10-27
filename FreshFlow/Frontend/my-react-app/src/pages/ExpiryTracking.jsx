import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import {
  PageLoading,
  PageError,
  EmptyState,
  UrgencyBadge,
  FilterSelect,
  PageHeader,
} from '../components.jsx';

const FILTER_OPTIONS = [
  { value: '', label: 'All Batches' },
  { value: 'EXPIRING_SOON', label: '🟡 Expiring Soon (≤7d)' },
  { value: 'TODAY', label: '🔴 Expiring Today' },
  { value: 'EXPIRED', label: '⛔ Already Expired' },
  { value: 'SAFE', label: '✅ Safe Stock (>7d)' },
];

export default function ExpiryTracking() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/expiry');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading message="Loading expiry data…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  const allBatches = data?.batches ?? [];

  const filtered = allBatches.filter((b) => {
    if (!filter) return true;
    if (filter === 'EXPIRED') return b.daysLeft < 0;
    if (filter === 'TODAY') return b.daysLeft === 0;
    if (filter === 'EXPIRING_SOON') return b.daysLeft >= 0 && b.daysLeft <= 7 && b.stockStatus !== 'DEPLETED';
    if (filter === 'SAFE') return b.daysLeft > 7;
    return true;
  });

  const expiredCount = allBatches.filter((b) => b.daysLeft < 0).length;
  const nearCount = allBatches.filter((b) => b.daysLeft >= 0 && b.daysLeft <= 7).length;
  const safeCount = allBatches.filter((b) => b.daysLeft > 7).length;

  return (
    <div>
      <PageHeader
        eyebrow="Inventory Health"
        title="Expiry Tracking"
        description="Monitor all inventory batches by expiry urgency. Expired batches cannot be included in new campaigns."
      >
        <button id="refresh-expiry-btn" className="secondary-button" onClick={load}>
          ↻ Refresh
        </button>
      </PageHeader>

      {/* Summary strip */}
      <div className="summary-grid" style={{ marginBottom: 20 }}>
        <div className="summary-card">
          <div className="summary-icon red">⛔</div>
          <div className="summary-content">
            <p>Expired Batches</p>
            <h2>{expiredCount}</h2>
            <span>Items past their expiry date</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon orange">⚠️</div>
          <div className="summary-content">
            <p>Expiring Soon</p>
            <h2>{nearCount}</h2>
            <span>Within 7 days</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon green">✅</div>
          <div className="summary-content">
            <p>Safe Stock</p>
            <h2>{safeCount}</h2>
            <span>More than 7 days remaining</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon blue">📦</div>
          <div className="summary-content">
            <p>Total Batches</p>
            <h2>{allBatches.length}</h2>
            <span>All tracked batches</span>
          </div>
        </div>
      </div>

      <div className="filter-row" style={{ marginBottom: 20 }}>
        <FilterSelect
          id="expiry-filter"
          label="Filter by expiry status"
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS}
        />
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Inventory Batches</h2>
            <p>Showing {filtered.length} batch(es)</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="📦" title="No batches match this filter" />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Batch ID</th>
                  <th>Qty Remaining</th>
                  <th>Qty Received</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.batchId} style={{ background: b.daysLeft < 0 ? '#fff8f8' : undefined }}>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar" style={{ background: b.daysLeft < 0 ? '#ffeded' : undefined, color: b.daysLeft < 0 ? '#d34b51' : undefined }}>
                          {b.productName.charAt(0)}
                        </div>
                        <div>
                          <strong>{b.productName}</strong>
                          <span>{b.productId}</span>
                        </div>
                      </div>
                    </td>
                    <td>{b.category || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{b.batchId}</td>
                    <td>
                      <strong style={{ color: b.quantityRemaining === 0 ? '#9aa5b4' : b.quantityRemaining < 10 ? '#d34b51' : '#26354a' }}>
                        {b.quantityRemaining}
                      </strong>
                    </td>
                    <td style={{ color: '#9aa5b4' }}>{b.quantityReceived}</td>
                    <td>{b.expiryDate}</td>
                    <td>
                      {b.daysLeft < 0 ? (
                        <span style={{ color: '#d34b51', fontWeight: 700 }}>
                          {Math.abs(b.daysLeft)}d ago
                        </span>
                      ) : b.daysLeft === 0 ? (
                        <span style={{ color: '#d34b51', fontWeight: 700 }}>Today</span>
                      ) : (
                        <span style={{
                          fontWeight: 600,
                          color: b.daysLeft <= 3 ? '#d34b51' : b.daysLeft <= 7 ? '#aa751d' : '#526075',
                        }}>
                          {b.daysLeft}d
                        </span>
                      )}
                    </td>
                    <td>
                      {b.daysLeft < 0 ? (
                        <span className="urgency-badge high"><span className="badge-dot" />EXPIRED</span>
                      ) : b.stockStatus === 'DEPLETED' ? (
                        <span className="urgency-badge low"><span className="badge-dot" />DEPLETED</span>
                      ) : (
                        <UrgencyBadge urgency={b.urgency} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
