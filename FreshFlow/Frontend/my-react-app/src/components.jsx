/**
 * Shared reusable UI components for FreshFlow.
 */

// ── Loading state ──────────────────────────────────────────────────────────
export function PageLoading({ message = 'Loading…' }) {
  return (
    <div className="page-state">
      <div className="loading-content">
        <div className="loader" />
        <p>{message}</p>
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────
export function PageError({ message, onRetry }) {
  return (
    <div className="page-state">
      <div className="error-box">
        <h2>⚠ Something went wrong</h2>
        <p>{message || 'An unexpected error occurred. Please try again.'}</p>
        {onRetry && (
          <button className="primary-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      {title && <strong style={{ display: 'block', marginBottom: 6, color: '#26354a' }}>{title}</strong>}
      {description && <p style={{ margin: 0 }}>{description}</p>}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const cls = status ? status.toLowerCase() : 'draft';
  return (
    <span className={`status-badge ${cls}`}>
      <span className="badge-dot" />
      {status || 'UNKNOWN'}
    </span>
  );
}

// ── Urgency badge ──────────────────────────────────────────────────────────
export function UrgencyBadge({ urgency }) {
  const levelMap = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    EXPIRED: 'high',
    DEPLETED: 'low',
  };
  const cls = levelMap[urgency] || 'low';
  return (
    <span className={`urgency-badge ${cls}`}>
      <span className="badge-dot" />
      {urgency}
    </span>
  );
}

// ── Action badge ───────────────────────────────────────────────────────────
export function ActionBadge({ action }) {
  const colorMap = {
    DISCOUNT: { color: '#228254', bg: '#e4f7eb' },
    NOTIFY: { color: '#356db8', bg: '#e8f1ff' },
    BUNDLE: { color: '#7958d7', bg: '#f1edff' },
  };
  const style = colorMap[action] || { color: '#64748b', bg: '#eef2f7' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 9px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        color: style.color,
        background: style.bg,
      }}
    >
      {action}
    </span>
  );
}

// ── INR formatter ──────────────────────────────────────────────────────────
export function inr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Search bar ─────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…', id }) {
  return (
    <div className="search-bar">
      <span style={{ color: '#9aa5b4', fontSize: 16 }}>🔍</span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

// ── Filter select ──────────────────────────────────────────────────────────
export function FilterSelect({ value, onChange, options, id, label }) {
  return (
    <select
      id={id}
      className="filter-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ── Confirmation dialog ────────────────────────────────────────────────────
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger = false }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={danger ? 'danger-button' : 'primary-button'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section topbar ─────────────────────────────────────────────────────────
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="topbar">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="topbar-actions">{children}</div>}
    </div>
  );
}
