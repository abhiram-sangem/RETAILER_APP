import React, { useState, useEffect } from 'react';

export default function Topbar({ view, setView, draftsCount, onLogout }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Auto-expand the "More" menu if the user navigates to one of its screens
  useEffect(() => {
    if (['reports', 'data-transfer', 'settings', 'collections', 'employees-manage'].includes(view)) {
      setIsMoreOpen(true);
    } else {
      setIsMoreOpen(false);
    }
  }, [view]);

  return (
    <header className="topbar" style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '12px 20px', transition: 'all 0.2s ease-in-out' }}>
      
      {/* --- PRIMARY NAVIGATION (FIRST ROW) --- */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        
        {/* Left Side: Brand */}
        <div style={{ flex: '0 0 200px' }}>
          <div className="topbar-brand" style={{ margin: 0 }}>Retailer App</div>
        </div>
        
        {/* Center: Navigation Options */}
        <nav className="nav-links" style={{ display: 'flex', gap: '8px', margin: 0, flexGrow: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>Home</button>
          
          {/* CSS Dropdown for Sales */}
          <div className="nav-dropdown">
            <button className={`nav-item ${['list', 'payment-screen', 'invoices', 'invoice-details', 'return-sale', 'edit-history', 'drafts-list', 'sale-edit-compare'].includes(view) ? 'active' : ''}`}>
              Sales ▼
            </button>
            <div className="nav-dropdown-content">
              <button className="nav-dropdown-item" onClick={() => setView('list')}>New Sale</button>
              <button className="nav-dropdown-item" onClick={() => setView('drafts-list')}>Saved Drafts ({draftsCount || 0})</button>
              <button className="nav-dropdown-item" onClick={() => setView('invoices')}>Sales List</button>
              <button className="nav-dropdown-item" onClick={() => setView('edit-history')}>Edit History</button>
            </div>
          </div>

          {/* CSS Dropdown for Purchases */}
          <div className="nav-dropdown">
            <button className={`nav-item ${['purchase-new', 'purchase-summary-screen', 'purchases-list', 'purchase-invoice-details', 'purchase-edit-history', 'purchase-edit-compare', 'vendors-manage'].includes(view) ? 'active' : ''}`}>
              Purchases ▼
            </button>
            <div className="nav-dropdown-content">
              <button className="nav-dropdown-item" onClick={() => setView('purchase-new')}>New Purchase</button>
              <button className="nav-dropdown-item" onClick={() => setView('purchases-list')}>Purchase List</button>
              <button className="nav-dropdown-item" onClick={() => setView('purchase-edit-history')}>Purchase Edits</button>
              <button className="nav-dropdown-item" onClick={() => setView('vendors-manage')}>Manage Vendors</button>
            </div>
          </div>

          {/* CSS Dropdown for Inventory */}
          <div className="nav-dropdown">
            <button className={`nav-item ${['inventory', 'inventory-history'].includes(view) ? 'active' : ''}`}>
              Inventory ▼
            </button>
            <div className="nav-dropdown-content">
              <button className="nav-dropdown-item" onClick={() => setView('inventory')}>Stock Balance</button>
              <button className="nav-dropdown-item" onClick={() => setView('inventory-history')}>Inventory History</button>
            </div>
          </div>
          
          {/* CSS Dropdown for Receipts */}
          <div className="nav-dropdown">
            <button className={`nav-item ${['receipts', 'receipts-list', 'receipt-edit-history', 'receipt-edit-compare'].includes(view) ? 'active' : ''}`}>
              Receipts ▼
            </button>
            <div className="nav-dropdown-content">
              <button className="nav-dropdown-item" onClick={() => setView('receipts')}>New Receipt</button>
              <button className="nav-dropdown-item" onClick={() => setView('receipts-list')}>Receipts List</button>
              <button className="nav-dropdown-item" onClick={() => setView('receipt-edit-history')}>Edit History</button>
            </div>
          </div>

          <button className={`nav-item ${['ledgers', 'ledger-statement'].includes(view) ? 'active' : ''}`} onClick={() => setView('ledgers')}>Ledgers</button>
          <button className={`nav-item ${view === 'customers-manage' ? 'active' : ''}`} onClick={() => setView('customers-manage')}>Customers</button>
          <button className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}>Products</button>
          
          {/* Toggle for "More" second row */}
          <button 
            className={`nav-item ${isMoreOpen || ['reports', 'data-transfer', 'settings', 'collections', 'employees-manage'].includes(view) ? 'active' : ''}`} 
            onClick={() => setIsMoreOpen(!isMoreOpen)}
          >
            More ▼
          </button>
        </nav>

        {/* Right Side: Logout */}
        <div style={{ flex: '0 0 200px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-danger logout-btn" onClick={onLogout} style={{ margin: 0 }}>
            Logout
          </button>
        </div>
      </div>

      {/* --- SUB-NAVIGATION (EXPANDED SECOND ROW ONLY FOR "MORE") --- */}
      {isMoreOpen && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          justifyContent: 'center', // Centers the second row perfectly under the main nav
          flexWrap: 'wrap'
        }}>
          <button className={`nav-item ${view === 'employees-manage' ? 'active' : ''}`} onClick={() => setView('employees-manage')}>Employees</button>
          <button className={`nav-item ${view === 'collections' ? 'active' : ''}`} onClick={() => setView('collections')}>Route Planner</button>
          <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>Reports</button>
          <button className={`nav-item ${view === 'data-transfer' ? 'active' : ''}`} onClick={() => setView('data-transfer')}>Data Transfer</button>
          <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>Settings</button>
        </div>
      )}
    </header>
  );
}