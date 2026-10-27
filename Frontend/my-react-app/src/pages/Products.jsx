import { useEffect, useState, useCallback } from 'react';
import api from '../api.js';
import {
  PageLoading,
  PageError,
  EmptyState,
  UrgencyBadge,
  inr,
  SearchBar,
  FilterSelect,
  PageHeader,
} from '../components.jsx';

export default function Products() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/products');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageLoading message="Loading products…" />;
  if (error) return <PageError message={error} onRetry={load} />;

  const allProducts = data?.products ?? [];

  // Collect categories for filter
  const categories = ['', ...new Set(allProducts.map((p) => p.category).filter(Boolean))];

  // Filter products
  const filtered = allProducts.filter((p) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.productName.toLowerCase().includes(searchLower) ||
      p.productId.toLowerCase().includes(searchLower) ||
      (p.category || '').toLowerCase().includes(searchLower);

    const matchesCategory = !categoryFilter || p.category === categoryFilter;

    const matchesUrgency =
      !urgencyFilter ||
      p.batches.some((b) => {
        if (urgencyFilter === 'EXPIRED') return b.stockStatus === 'EXPIRED';
        if (urgencyFilter === 'HIGH') return b.urgency === 'HIGH';
        if (urgencyFilter === 'MEDIUM') return b.urgency === 'MEDIUM';
        if (urgencyFilter === 'LOW') return b.urgency === 'LOW';
        if (urgencyFilter === 'SAFE') return b.stockStatus === 'FRESH';
        return true;
      });

    return matchesSearch && matchesCategory && matchesUrgency;
  });

  // Flatten into rows (one per batch, repeating product info)
  const rows = [];
  for (const product of filtered) {
    if (product.batches.length === 0) {
      rows.push({ product, batch: null });
    } else {
      for (const batch of product.batches) {
        rows.push({ product, batch });
      }
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Products & Inventory"
        description="All products and their stock batches with expiry status."
      >
        <button id="refresh-products-btn" className="secondary-button" onClick={load}>
          ↻ Refresh
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="filter-row">
        <SearchBar
          id="products-search"
          value={search}
          onChange={setSearch}
          placeholder="Search products…"
        />
        <FilterSelect
          id="category-filter"
          label="Filter by category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: '', label: 'All Categories' },
            ...categories.filter((c) => c).map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          id="urgency-filter"
          label="Filter by urgency"
          value={urgencyFilter}
          onChange={setUrgencyFilter}
          options={[
            { value: '', label: 'All Status' },
            { value: 'HIGH', label: '🔴 High Urgency' },
            { value: 'MEDIUM', label: '🟡 Medium Urgency' },
            { value: 'LOW', label: '🟢 Low Urgency' },
            { value: 'EXPIRED', label: '⛔ Expired' },
            { value: 'SAFE', label: '✅ Safe Stock' },
          ]}
        />
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Product Inventory</h2>
            <p>{rows.length} batch row(s) across {filtered.length} product(s)</p>
          </div>
          <span className="count-tag">{allProducts.length} products</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="📦" title="No products found" description="Try adjusting your search or filters." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Batch ID</th>
                  <th>Qty Remaining</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, batch }, idx) => (
                  <tr key={`${product.productId}-${batch?.batchId ?? idx}`}>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar">
                          {product.productName.charAt(0)}
                        </div>
                        <div>
                          <strong>{product.productName}</strong>
                          <span>{product.productId}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category || '—'}</td>
                    <td>{inr(product.costPrice)}</td>
                    <td>{inr(product.sellingPrice)}</td>
                    {batch ? (
                      <>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{batch.batchId}</td>
                        <td>
                          <strong style={{ color: batch.quantityRemaining < 10 ? '#d34b51' : '#26354a' }}>
                            {batch.quantityRemaining}
                          </strong>
                          <span style={{ display: 'block', color: '#9aa5b4', fontSize: 10 }}>
                            of {batch.quantityReceived} received
                          </span>
                        </td>
                        <td>{batch.expiryDate}</td>
                        <td>
                          {batch.stockStatus === 'EXPIRED' ? (
                            <span style={{ color: '#d34b51', fontWeight: 700 }}>Expired</span>
                          ) : batch.stockStatus === 'DEPLETED' ? (
                            <span style={{ color: '#9aa5b4' }}>—</span>
                          ) : (
                            <span style={{
                              fontWeight: 600,
                              color: batch.daysLeft <= 1 ? '#d34b51' : batch.daysLeft <= 3 ? '#aa751d' : '#526075',
                            }}>
                              {batch.daysLeft}d
                            </span>
                          )}
                        </td>
                        <td><UrgencyBadge urgency={batch.urgency} /></td>
                      </>
                    ) : (
                      <td colSpan={5} style={{ color: '#9aa5b4', fontStyle: 'italic' }}>
                        No batches recorded
                      </td>
                    )}
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
