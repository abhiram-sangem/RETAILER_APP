import React from 'react';

export default function Topbar({ view, setView, draftsCount, onLogout }) {
  return (
    <header className="topbar no-print">
      <div className="topbar-brand">Retailer App</div>
      <nav className="nav-links">
        <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>Home</button>

        <div className="nav-dropdown">
          <button className={`nav-item ${['list', 'payment-screen', 'invoices', 'invoice-details', 'return-sale', 'edit-history', 'sale-edit-compare', 'drafts-list'].includes(view) ? 'active' : ''}`}>
            Sales ▼
          </button>
          <div className="nav-dropdown-content">
            <button className="nav-dropdown-item" onClick={() => setView('list')}>New Sale</button>
            <button className="nav-dropdown-item" onClick={() => setView('drafts-list')}>Saved Drafts ({draftsCount})</button>
            <button className="nav-dropdown-item" onClick={() => setView('invoices')}>Sales List</button>
            <button className="nav-dropdown-item" onClick={() => setView('edit-history')}>Edit History</button>
          </div>
        </div>

        <div className="nav-dropdown">
          <button className={`nav-item ${['purchase-new', 'purchase-summary-screen', 'purchases-list', 'purchase-invoice-details', 'purchase-edit-history', 'purchase-edit-compare'].includes(view) ? 'active' : ''}`}>
            Purchases ▼
          </button>
          <div className="nav-dropdown-content">
            <button className="nav-dropdown-item" onClick={() => setView('purchase-new')}>New Purchase</button>
            <button className="nav-dropdown-item" onClick={() => setView('purchases-list')}>Purchase List</button>
            <button className="nav-dropdown-item" onClick={() => setView('purchase-edit-history')}>Purchase Edits</button>
          </div>
        </div>

        <div className="nav-dropdown">
          <button className={`nav-item ${['inventory', 'inventory-history'].includes(view) ? 'active' : ''}`}>
            Inventory ▼
          </button>
          <div className="nav-dropdown-content">
            <button className="nav-dropdown-item" onClick={() => setView('inventory')}>Stock Balance</button>
            <button className="nav-dropdown-item" onClick={() => setView('inventory-history')}>Inventory History</button>
          </div>
        </div>
        
        <div className="nav-dropdown">
          <button className={`nav-item ${['receipts', 'receipts-list'].includes(view) ? 'active' : ''}`}>
            Receipts ▼
          </button>
          <div className="nav-dropdown-content">
            <button className="nav-dropdown-item" onClick={() => setView('receipts')}>New Receipt</button>
            <button className="nav-dropdown-item" onClick={() => setView('receipts-list')}>Receipts History</button>
          </div>
        </div>

        <button className={`nav-item ${['ledgers', 'ledger-statement'].includes(view) ? 'active' : ''}`} onClick={() => setView('ledgers')}>Ledgers</button>
        <button className={`nav-item ${view === 'customers-manage' ? 'active' : ''}`} onClick={() => setView('customers-manage')}>Customers</button>
        <button className={`nav-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}>Products</button>
        
        {/* NEW DATA TRANSFER & REPORTS BUTTONS */}
        <button className={`nav-item ${view === 'data-transfer' ? 'active' : ''}`} onClick={() => setView('data-transfer')}>Data Transfer</button>
        <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>Reports</button>
        <button className={`nav-item ${view === 'invoice-builder' ? 'active' : ''}`} onClick={() => setView('invoice-builder')}>Bill Settings</button>
      
      </nav>

      
      <button className="btn btn-danger logout-btn" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}