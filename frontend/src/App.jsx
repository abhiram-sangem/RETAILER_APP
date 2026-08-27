import { useEffect, useState, useMemo } from 'react';
import './App.css';

// --- COMPONENTS ---
import Login from './components/Login';
import Topbar from './components/Topbar';

// --- PAGES ---
import Dashboard from './pages/Dashboard';
import DataTransfer from './pages/DataTransfer';
import ReportsManager from './pages/ReportsManager';
import CustomerManager from './pages/CustomerManager';
import ProductsManager from './pages/ProductsManager';
import SalesManager from './pages/SalesManager';
import PurchaseManager from './pages/PurchaseManager';
import LedgerManager from './pages/LedgerManager';
import ReceiptManager from './pages/ReceiptManager';
import InventoryManager from './pages/InventoryManager';
import InvoiceBuilder from './pages/InvoiceBuilder';

// --- API ---
import { 
  productService, invoiceService, customerService, 
  purchaseInvoiceService, historyService, receiptService
} from './services/api';

export default function App() {
  // --- AUTH STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- CORE DATA STATE ---
  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [purchaseInvoiceHistory, setPurchaseInvoiceHistory] = useState([]);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadInvoices();
    loadPurchaseInvoices();
    loadHistory();
    loadReceipts();
  }, []);

  function loadProducts() { productService.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])); }
  function loadCustomers() { customerService.getCustomers().then(data => setCustomers(Array.isArray(data) ? data : [])); }
  function loadInvoices() { invoiceService.getInvoices().then(data => setInvoices((data || []).sort((a, b) => b.id - a.id))); }
  function loadPurchaseInvoices() { purchaseInvoiceService.getPurchaseInvoices().then(data => setPurchaseInvoices((data || []).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)))); }
  function loadReceipts() { receiptService.getReceipts().then(data => setReceipts(Array.isArray(data) ? data : [])); }
  function loadHistory() {
    historyService.getInventoryHistory().then(data => setInventoryHistory(Array.isArray(data) ? data : []));
    historyService.getInvoiceHistory().then(data => setInvoiceHistory(Array.isArray(data) ? data : []));
    historyService.getPurchaseInvoiceHistory().then(data => setPurchaseInvoiceHistory(Array.isArray(data) ? data : []));
  }

  // --- DASHBOARD MATH (Extracted for Dashboard performance) ---
  const salesStats = useMemo(() => {
    const dailyMap = {}; const weeklyMap = {}; const monthlyMap = {}; const yearlyMap = {};
    invoices.forEach(inv => {
      if (inv.isReturn) return;
      const d = new Date(inv.orderDate);
      const total = inv.finalTotal || inv.totalAmount || 0;
      
      const daySortKey = d.toISOString().split('T')[0];
      const startOfWeek = new Date(d); startOfWeek.setDate(d.getDate() - d.getDay());
      const weekSortKey = startOfWeek.toISOString().split('T')[0];
      const monthSortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = d.getFullYear().toString();

      if (!dailyMap[daySortKey]) dailyMap[daySortKey] = { label: d.toLocaleDateString('en-GB'), total: 0 };
      dailyMap[daySortKey].total += total;
      if (!weeklyMap[weekSortKey]) weeklyMap[weekSortKey] = { label: `Week of ${startOfWeek.toLocaleDateString('en-GB')}`, total: 0 };
      weeklyMap[weekSortKey].total += total;
      if (!monthlyMap[monthSortKey]) monthlyMap[monthSortKey] = { label: d.toLocaleString('en-GB', { month: 'short', year: 'numeric' }), total: 0 };
      monthlyMap[monthSortKey].total += total;
      if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { label: yearKey, total: 0 };
      yearlyMap[yearKey].total += total;
    });

    const toSortedArray = (map) => Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(entry => entry[1]);
    return { daily: toSortedArray(dailyMap), weekly: toSortedArray(weeklyMap), monthly: toSortedArray(monthlyMap), yearly: toSortedArray(yearlyMap) };
  }, [invoices]);

  // --- LOGIN GATE ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '12345') { setIsLoggedIn(true); setLoginError(''); } 
    else { setLoginError('Invalid username or password'); }
  };

  if (!isLoggedIn) {
    return <Login handleLogin={handleLogin} loginError={loginError} username={username} setUsername={setUsername} password={password} setPassword={setPassword} />;
  }

  // --- RENDER ROUTER ---
  return (
    <div className="app-layout">
      <Topbar 
        view={view} 
        setView={setView} 
        draftsCount={JSON.parse(localStorage.getItem('salesDrafts'))?.length || 0} 
        onLogout={() => { setIsLoggedIn(false); setUsername(''); setPassword(''); setView('home'); }} 
      />

      <main className="main-content">
        {/* HOMEPAGE */}
        {view === 'home' && (
          <Dashboard salesStats={salesStats} invoices={invoices} setView={setView} />
        )}

        {/* PRODUCTS & INVENTORY */}
        {['products'].includes(view) && (
          <ProductsManager products={products} loadProducts={loadProducts} loadHistory={loadHistory} />
        )}
        {['inventory', 'inventory-history'].includes(view) && (
          <InventoryManager view={view} products={products} inventoryHistory={inventoryHistory} loadProducts={loadProducts} loadHistory={loadHistory} />
        )}

        {/* CUSTOMERS & LEDGERS */}
        {['customers-manage'].includes(view) && (
          <CustomerManager customers={customers} loadCustomers={loadCustomers} />
        )}
        {['ledgers', 'ledger-statement'].includes(view) && (
          <LedgerManager view={view} setView={setView} customers={customers} invoices={invoices} receipts={receipts} />
        )}

        {/* SALES */}
        {['list', 'payment-screen', 'invoices', 'invoice-details', 'return-sale', 'edit-history', 'sale-edit-compare', 'drafts-list'].includes(view) && (
          <SalesManager view={view} setView={setView} products={products} customers={customers} invoices={invoices} invoiceHistory={invoiceHistory} loadProducts={loadProducts} loadInvoices={loadInvoices} loadHistory={loadHistory} loadCustomers={loadCustomers} />
        )}

        {/* PURCHASES */}
        {['purchase-new', 'purchase-summary-screen', 'purchases-list', 'purchase-invoice-details', 'purchase-edit-history', 'purchase-edit-compare'].includes(view) && (
          <PurchaseManager view={view} setView={setView} products={products} purchaseInvoices={purchaseInvoices} purchaseInvoiceHistory={purchaseInvoiceHistory} loadProducts={loadProducts} loadPurchaseInvoices={loadPurchaseInvoices} loadHistory={loadHistory} />
        )}

        {/* RECEIPTS */}
        {['receipts', 'receipts-list'].includes(view) && (
          <ReceiptManager view={view} setView={setView} customers={customers} receipts={receipts} loadCustomers={loadCustomers} loadReceipts={loadReceipts} />
        )}

        {/* REPORTS */}
        {/* DATA TRANSFER */}
        {view === 'data-transfer' && (
          <DataTransfer customers={customers} products={products} loadCustomers={loadCustomers} loadProducts={loadProducts} loadHistory={loadHistory} />
        )}

        {/* BUSINESS REPORTS */}
        {view === 'reports' && (
          <ReportsManager invoices={invoices} purchaseInvoices={purchaseInvoices} products={products} customers={customers} />
        )}

        {/* INVOICE BUILDER */}
        {view === 'invoice-builder' && (
          <InvoiceBuilder />
        )}
      </main>
    </div>
  );
}