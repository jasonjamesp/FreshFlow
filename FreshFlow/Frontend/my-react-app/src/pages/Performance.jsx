import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import { PageLoading, PageError, PageHeader, inr } from '../components.jsx';

function MetricCard({ icon, iconClass, label, value, subtext, highlight }) {
  return (
    <div className={`performance-card ${highlight ? 'highlight' : ''}`}>
      <p>{label}</p>
      <h2>
        {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
        {value}
      </h2>
      {subtext && <small>{subtext}</small>}
    </div>
  );
}

function WastageBar({ label, value, max, colorClass }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="performance-row">
      <div className="performance-label">
        <strong>{label}</strong>
        <span>{value} units</span>
      </div>
      <div className="performance-track">
        <div
          className={`performance-bar ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.min((count / total) * 100, 100) : 0;
  return (
    <div className="performance-row">
      <div className="performance-label">
        <strong>{label}</strong>
        <span>{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="performance-track">
        <div
          className="performance-bar after"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/performance');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading message="Loading performance data…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  const { campaignCounts, discountExpenditure, inventoryExposure, illustrative } = data;

  const statusColors = {
    DRAFT: '#aa751d',
    APPROVED: '#228254',
    SENT: '#356db8',
    REDEEMED: '#15966a',
    EXPIRED: '#d34b51',
    REJECTED: '#9aa5b4',
  };

  const statusList = ['DRAFT', 'APPROVED', 'SENT', 'REDEEMED', 'EXPIRED', 'REJECTED'];

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Agent Performance"
        description="Campaign outcomes, wastage exposure, and AI agent metrics."
      >
        <button id="refresh-performance-btn" className="secondary-button" onClick={load}>
          ↻ Refresh
        </button>
      </PageHeader>

      {/* Campaign summary cards */}
      <div className="performance-grid">
        <MetricCard
          label="Total Campaigns"
          value={campaignCounts.total}
          subtext="All campaigns ever created"
          icon="📊"
        />
        <MetricCard
          label="Active Pipeline"
          value={campaignCounts.activePipeline}
          subtext="Approved + Sent, awaiting redemption"
          icon="📤"
        />
        <MetricCard
          highlight
          label="Redeemed"
          value={campaignCounts.REDEEMED || 0}
          subtext="Successfully completed"
          icon="🎉"
        />
        <MetricCard
          label="Discount Spent"
          value={inr(discountExpenditure.totalDiscountSpent)}
          subtext={`Across ${discountExpenditure.redeemedCampaigns} redeemed campaigns`}
          icon="💸"
        />
      </div>

      {/* Inventory exposure */}
      <div className="performance-grid" style={{ marginBottom: 24 }}>
        <MetricCard
          label="Expired Units w/ Stock"
          value={inventoryExposure.expiredUnitsWithStock}
          subtext={inventoryExposure.note}
          icon="⛔"
        />
        <MetricCard
          label="Near-Expiry Units"
          value={inventoryExposure.nearExpiryUnits}
          subtext="Stock within 7 days of expiry"
          icon="⚠️"
        />
      </div>

      {/* Campaign status distribution */}
      <div className="panel" style={{ padding: '25px', marginBottom: 24 }}>
        <div className="panel-heading" style={{ marginBottom: 20 }}>
          <div>
            <h2>Campaign Status Distribution</h2>
            <p>Breakdown of all campaigns by status.</p>
          </div>
          <span className="count-tag">{campaignCounts.total} total</span>
        </div>
        <div className="performance-chart">
          {statusList.map((s) => (
            <StatusBar
              key={s}
              label={s}
              count={campaignCounts[s] || 0}
              total={campaignCounts.total}
              color={statusColors[s]}
            />
          ))}
        </div>
      </div>

      {/* Illustrative wastage chart */}
      <div className="panel" style={{ padding: '25px', marginBottom: 24, border: '2px dashed #e9edf3' }}>
        <div className="panel-heading" style={{ marginBottom: 16 }}>
          <div>
            <h2>Wastage Reduction · <em style={{ fontWeight: 400, fontStyle: 'italic', color: '#aa751d' }}>Illustrative Demo Data</em></h2>
            <p>{illustrative.note}</p>
          </div>
          <span style={{ padding: '6px 10px', borderRadius: 7, background: '#fff4df', color: '#aa751d', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            DEMO ONLY
          </span>
        </div>

        <div className="performance-grid" style={{ marginBottom: 20 }}>
          <MetricCard
            label="Before Intervention"
            value={`${illustrative.beforeWastage} units`}
            subtext="Estimated wastage without campaigns"
            icon="📉"
          />
          <MetricCard
            highlight
            label="After Intervention"
            value={`${illustrative.afterWastage} units`}
            subtext="Estimated wastage with campaigns"
            icon="📈"
          />
          <MetricCard
            label="Reduction"
            value={`${illustrative.beforeWastage - illustrative.afterWastage} units`}
            subtext={`= ${illustrative.reductionPercent}% less waste`}
            icon="♻️"
          />
          <MetricCard
            highlight
            label="Reduction %"
            value={`${illustrative.reductionPercent}%`}
            subtext="((Before − After) / Before) × 100"
            icon="✅"
          />
        </div>

        <div className="performance-chart">
          <WastageBar
            label="Before Intervention"
            value={illustrative.beforeWastage}
            max={illustrative.beforeWastage}
            colorClass=""
          />
          <WastageBar
            label="After Intervention"
            value={illustrative.afterWastage}
            max={illustrative.beforeWastage}
            colorClass="after"
          />
        </div>

        <div className="performance-note">
          <strong>Formula: </strong>
          Wastage Reduction (%) = ((Before wastage − After wastage) / Before wastage) × 100
          <br />
          <strong>Example: </strong>
          ({illustrative.beforeWastage} − {illustrative.afterWastage}) / {illustrative.beforeWastage} × 100
          = <strong>{illustrative.reductionPercent}%</strong>
          <br />
          <br />
          ⚠️ The above figures are <em>illustrative</em>. To measure real wastage reduction, record actual units expired or disposed and compare before and after running campaigns.
        </div>
      </div>

      <div className="performance-note" style={{ marginBottom: 24 }}>
        <strong>About discount expenditure:</strong>{' '}
        {discountExpenditure.note}
      </div>
    </div>
  );
}
