import { useState } from 'react'
import './index.css'

import Overview from './pages/Overview.jsx'
import Products from './pages/Products.jsx'
import Customers from './pages/Customers.jsx'
import ExpiryTracking from './pages/ExpiryTracking.jsx'
import Campaigns from './pages/Campaigns.jsx'
import Performance from './pages/Performance.jsx'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '⊞' },
  { id: 'products', label: 'Products & Inventory', icon: '📦' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'expiry', label: 'Expiry Tracking', icon: '⏱' },
  { id: 'campaigns', label: 'Campaigns', icon: '📢' },
  { id: 'performance', label: 'Performance', icon: '📈' },
]

const PAGE_COMPONENTS = {
  overview: Overview,
  products: Products,
  customers: Customers,
  expiry: ExpiryTracking,
  campaigns: Campaigns,
  performance: Performance,
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')

  const PageComponent = PAGE_COMPONENTS[activePage] || Overview

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">🍃</div>
          <div>
            <h2>FreshFlow</h2>
            <span>Retail Expiry Campaigner</span>
          </div>
        </div>

        <p className="nav-heading">Navigation</p>

        <nav className="navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-link${activePage === item.id ? ' active' : ''}`}
              onClick={() => setActivePage(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="sidebar-bottom">
          <div className="agent-status">
            <div className="status-dot" />
            <div>
              <strong>Gemini AI</strong>
              <p>Campaign generation active</p>
            </div>
          </div>
          <p className="sidebar-footer">
            FreshFlow · Powered by Gemini
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" id="main-content">
        <PageComponent onNavigate={setActivePage} />

        <footer className="page-footer">
          <span>FreshFlow © {new Date().getFullYear()}</span>
          <span>AI-powered retail expiry management</span>
        </footer>
      </main>
    </div>
  )
}
