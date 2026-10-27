import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import {
  PageLoading,
  PageError,
  EmptyState,
  StatusBadge,
  UrgencyBadge,
  ActionBadge,
  inr,
  PageHeader,
} from '../components.jsx';

function SummaryCard({ icon, iconClass, label, value, subtext }) {
  return (
    <div className="summary-card">
      <div className={`summary-icon ${iconClass}`}>{icon}</div>
      <div className="summary-content">
        <p>{label}</p>
        <h2>{value}</h2>
        {subtext && <span>{subtext}</span>}
      </div>
    </div>
  );
}

export default function Overview({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/dashboard');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await api.post('/campaigns/generate');
      setGenResult({ success: true, data: result });
      await load(); // refresh dashboard
    } catch (err) {
      setGenResult({ success: false, error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PageLoading message="Loading dashboard…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  const { summary, expiryAlerts, recentCampaigns } = data;

  return (
    <div>
      <PageHeader
        eyebrow="FreshFlow Dashboard"
        title="Manage expiry. Reduce waste."
        description="Live overview of your inventory, campaigns, and expiry alerts."
      >
        <button
          id="generate-ai-campaigns-btn"
          className="primary-button"
          onClick={handleGenerate}
          disabled={generating}
          aria-busy={generating}
        >
          {generating ? (
            <>
              <span className="btn-spinner" /> Generating…
            </>
          ) : (
            <> 🤖 Generate AI Campaigns</>
          )}
        </button>
        <button
          id="refresh-dashboard-btn"
          className="secondary-button"
          onClick={load}
          disabled={loading}
          style={{ marginLeft: 8 }}
        >
          ↻ Refresh
        </button>
      </PageHeader>

      {/* Generation result toast */}
      {genResult && (
        <div
          className={`gen-result-box ${genResult.success ? 'success' : 'error'}`}
          role="status"
        >
          {genResult.success ? (
            <span>
              ✅ <strong>{genResult.data.campaignsCreated} campaign(s) created</strong> from{' '}
              {genResult.data.batchesEvaluated} batch(es) evaluated.
              {genResult.data.skippedBatches?.length > 0 && (
                <> {genResult.data.skippedBatches.length} batch(es) skipped.</>
              )}
            </span>
          ) : (
            <span>❌ {genResult.error}</span>
          )}
          <button
            className="gen-result-close"
            onClick={() => setGenResult(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="summary-grid">
        <SummaryCard
          icon="🔴"
          iconClass="red"
          label="Urgent Products"
          value={summary.urgentProducts}
          subtext="Expiring within 7 days"
        />
        <SummaryCard
          icon="📢"
          iconClass="purple"
          label="Active Campaigns"
          value={summary.activeCampaigns}
          subtext="Draft + Approved + Sent"
        />
        <SummaryCard
          icon="📦"
          iconClass="blue"
          label="Total Inventory"
          value={`${summary.totalInventoryUnits.toLocaleString()} units`}
          subtext="Across all batches"
        />
        <SummaryCard
          icon="🍃"
          iconClass="green"
          label="FreshFlow AI"
          value="Active"
          subtext="Gemini-powered"
        />
      </div>

      {/* Expiry alerts */}
      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Urgent Expiry Alerts</h2>
            <p>Batches expiring within 7 days with stock remaining.</p>
          </div>
          <span className="count-tag">{expiryAlerts.length} batches</span>
        </div>

        {expiryAlerts.length === 0 ? (
          <EmptyState icon="✅" title="No urgent items" description="All batches are safely within date." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch ID</th>
                  <th>Qty Remaining</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {expiryAlerts.map((item) => (
                  <tr key={item.batchId}>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar">
                          {item.productName.charAt(0)}
                        </div>
                        <div>
                          <strong>{item.productName}</strong>
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.batchId}</td>
                    <td><strong style={{ color: item.quantityRemaining < 10 ? '#d34b51' : '#26354a' }}>{item.quantityRemaining}</strong></td>
                    <td>{item.expiryDate}</td>
                    <td>
                      <strong style={{ color: item.daysLeft <= 1 ? '#d34b51' : item.daysLeft <= 3 ? '#aa751d' : '#526075' }}>
                        {item.daysLeft === 0 ? 'Today' : item.daysLeft === 1 ? '1 day' : `${item.daysLeft} days`}
                      </strong>
                    </td>
                    <td><UrgencyBadge urgency={item.urgency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent campaigns */}
      <div className="panel" style={{ padding: '25px 24px' }}>
        <div className="panel-heading">
          <div>
            <h2>AI Campaign Recommendations</h2>
            <p>Most recent campaigns created by the Gemini agent.</p>
          </div>
          <button
            id="view-all-campaigns-btn"
            className="secondary-button"
            onClick={() => onNavigate('campaigns')}
          >
            View All →
          </button>
        </div>

        {recentCampaigns.length === 0 ? (
          <EmptyState
            icon="🤖"
            title="No campaigns yet"
            description='Click "Generate AI Campaigns" above to create your first batch.'
          />
        ) : (
          <div className="campaign-grid">
            {recentCampaigns.map((c) => (
              <CampaignCard key={c.campaignId} campaign={c} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign: c, onNavigate }) {
  return (
    <article className="campaign-card">
      <div className="campaign-top">
        <span className="campaign-id">{c.campaignId}</span>
        <StatusBadge status={c.status} />
      </div>

      <h3>{c.productName}</h3>
      <p className="customer">
        Customer: <strong>{c.customerName}</strong>
      </p>
      <p className="customer" style={{ marginTop: 4 }}>
        Action: <ActionBadge action={c.action} />
      </p>

      {c.action === 'DISCOUNT' && Number(c.discountPercentage) > 0 && (
        <div className="discount-value">{c.discountPercentage}% OFF · {inr(c.discountAmount)} saved</div>
      )}

      {c.aiMessage && (
        <div className="reason-box" style={{ borderColor: '#36bc8b', background: '#f2fbf7' }}>
          <strong>AI Message</strong>
          <p>{c.aiMessage}</p>
        </div>
      )}

      <div className="reason-box" style={{ marginTop: 10 }}>
        <strong>Why this action?</strong>
        <p>{c.reason}</p>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button
          className="secondary-button"
          style={{ fontSize: 11, padding: '7px 11px' }}
          onClick={() => onNavigate('campaigns')}
        >
          View Details →
        </button>
      </div>
    </article>
  );
}
