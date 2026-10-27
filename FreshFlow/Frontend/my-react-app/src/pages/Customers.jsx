import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import {
  PageLoading,
  PageError,
  EmptyState,
  inr,
  SearchBar,
  PageHeader,
} from '../components.jsx';

export default function Customers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/customers');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadHistory = async (customerId) => {
    setHistoryLoading(true);
    setPurchaseHistory(null);
    try {
      const result = await api.get(`/customers/${customerId}/purchases`);
      setPurchaseHistory(result);
    } catch (err) {
      setPurchaseHistory({ error: err.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelect = (customer) => {
    if (selected?.customerId === customer.customerId) {
      setSelected(null);
      setPurchaseHistory(null);
    } else {
      setSelected(customer);
      loadHistory(customer.customerId);
    }
  };

  if (loading) return <PageLoading message="Loading customers…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  const allCustomers = data?.customers ?? [];
  const filtered = allCustomers.filter((c) => {
    const s = search.toLowerCase();
    return (
      !search ||
      c.name.toLowerCase().includes(s) ||
      c.customerId.toLowerCase().includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description="Customer profiles, loyalty points, and purchase history."
      >
        <button id="refresh-customers-btn" className="secondary-button" onClick={load}>
          ↻ Refresh
        </button>
      </PageHeader>

      <div className="filter-row">
        <SearchBar
          id="customers-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, ID, or email…"
        />
      </div>

      <div className="customer-grid">
        {/* Customer list */}
        <div className="panel table-panel" style={{ minWidth: 0 }}>
          <div className="panel-heading">
            <div>
              <h2>All Customers</h2>
              <p>Click a customer to view purchase history.</p>
            </div>
            <span className="count-tag">{filtered.length}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="👤" title="No customers found" />
          ) : (
            <div className="eligible-customer-list" style={{ padding: '0 4px' }}>
              {filtered.map((c) => (
                <button
                  key={c.customerId}
                  className={`eligible-customer ${selected?.customerId === c.customerId ? 'selected-customer' : ''}`}
                  onClick={() => handleSelect(c)}
                  style={{ width: '100%', textAlign: 'left', border: selected?.customerId === c.customerId ? '1px solid #15966a' : undefined, background: selected?.customerId === c.customerId ? '#f0faf5' : undefined }}
                >
                  <div className="customer-avatar">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="eligible-customer-info" style={{ flex: 1 }}>
                    <strong>{c.name}</strong>
                    <span>{c.email || '—'}</span>
                    <p style={{ marginTop: 5 }}>
                      {c.totalPurchases} purchase(s) · ⭐ {c.loyaltyPoints} pts ·{' '}
                      {c.phone || 'No phone'}
                    </p>
                  </div>
                  <div className="eligible-offer">
                    <strong>{inr(c.totalSpent)}</strong>
                    <span>lifetime spend</span>
                    {c.lastPurchaseDate && (
                      <span style={{ fontSize: 10, color: '#9aa5b4', marginTop: 4 }}>
                        Last: {c.lastPurchaseDate}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase history panel */}
        {selected && (
          <div className="panel" style={{ padding: '25px 24px', minWidth: 0 }}>
            <div className="panel-heading">
              <div>
                <h2>Purchase History</h2>
                <p>{selected.name} · {selected.customerId}</p>
              </div>
              <button className="secondary-button" style={{ fontSize: 11, padding: '7px 10px' }} onClick={() => { setSelected(null); setPurchaseHistory(null); }}>
                ✕ Close
              </button>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div className="loader" style={{ margin: '0 auto' }} />
              </div>
            ) : purchaseHistory?.error ? (
              <div className="empty-state" style={{ color: '#d34b51' }}>{purchaseHistory.error}</div>
            ) : purchaseHistory?.purchases?.length === 0 ? (
              <EmptyState icon="🛒" title="No purchases" description="This customer has no recorded purchases." />
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {purchaseHistory.purchases?.map((inv) => (
                  <div key={inv.invoiceNo} style={{ border: '1px solid #e9edf3', borderRadius: 10, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: 12, color: '#26354a' }}>{inv.invoiceNo}</strong>
                        <span style={{ display: 'block', fontSize: 11, color: '#9aa5b4' }}>{inv.purchaseDate}</span>
                      </div>
                      <strong style={{ color: '#15966a' }}>{inr(inv.totalAmount)}</strong>
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {inv.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#586579', borderTop: i > 0 ? '1px solid #f2f5f9' : 'none', paddingTop: i > 0 ? 6 : 0 }}>
                          <span>
                            <span style={{ color: '#26354a', fontWeight: 600 }}>{item.productName}</span>
                            <span style={{ color: '#9aa5b4', marginLeft: 6 }}>×{item.quantity}</span>
                          </span>
                          <span>
                            {inr(item.unitPrice)}
                            {Number(item.discountAmount) > 0 && (
                              <span style={{ color: '#15966a', marginLeft: 6, fontSize: 10 }}>
                                -{inr(item.discountAmount)}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
