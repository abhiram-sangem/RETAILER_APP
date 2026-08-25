import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { 
  productService, 
  invoiceService, 
  customerService, 
  purchaseInvoiceService,
  historyService,
  receiptService
} from './services/api'

export default function App() {
  // =========================================
  // --- Portable Dynamic ID Helper Functions ---
  // =========================================
  const formatProductId = (id) => id ? `PR${String(id).padStart(4, '0')}` : 'N/A'
  const formatInvoiceId = (id) => id ? `INV-${String(id).padStart(4, '0')}` : 'N/A'
  const formatPurchaseInvoiceId = (id) => id ? `PINV-${String(id).padStart(4, '0')}` : 'N/A'
  const formatReceiptId = (id) => id ? `REC-${String(id).padStart(4, '0')}` : 'N/A'

  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Helper to format Date exactly like "30-06-2026 11:54" for the Print Bill
  const formatPrintDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // =========================================
  // --- Auth / Login States ---
  // =========================================
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // =========================================
  // --- View & Core Data States ---
  // =========================================
  const [view, setView] = useState('home')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [purchaseInvoices, setPurchaseInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [receipts, setReceipts] = useState([])
  
  // History States
  const [inventoryHistory, setInventoryHistory] = useState([])
  const [invoiceHistory, setInvoiceHistory] = useState([])
  const [purchaseInvoiceHistory, setPurchaseInvoiceHistory] = useState([])
  const [historyCompareData, setHistoryCompareData] = useState(null)

  // Ledger & Preview States
  const [viewingCustomerStatement, setViewingCustomerStatement] = useState(null)
  const [ledgerPreview, setLedgerPreview] = useState(null) 
  const [viewingReceipt, setViewingReceipt] = useState(null) 

  // =========================================
  // --- Search, Date Filters & Pagination ---
  // =========================================
  const [searchQuery, setSearchQuery] = useState('')
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('')
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('') 
  
  const [dateFilterRange, setDateFilterRange] = useState('all') 
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // =========================================
  // --- LIVE CLOCK FOR RECEIPTS ---
  // =========================================
  const [liveTime, setLiveTime] = useState(new Date())
  useEffect(() => {
    const timerId = setInterval(() => setLiveTime(new Date()), 1000)
    return () => clearInterval(timerId)
  }, [])

  // =========================================
  // --- MULTI-TAB SALES STATE ENGINE ---
  // =========================================
  const generateNewTab = (title = 'New Bill') => ({
    id: Date.now() + Math.random(),
    title,
    cart: [],
    activeCustomer: null,
    customerSearch: '',
    discountPercent: 0,
    taxPercent: 5,
    editingInvoiceId: null,
    isPayLater: false,
    paymentMethod: 'Cash',
    saleDate: new Date().toISOString().split('T')[0],
    isDropdownOpen: false
  });

  const [salesTabs, setSalesTabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('salesTabs'))
      return saved?.length ? saved : [generateNewTab()]
    } catch { return [generateNewTab()] }
  })

  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('activeTabId')) || salesTabs[0].id
    } catch { return salesTabs[0].id }
  })

  const activeTab = salesTabs.find(t => t.id === activeTabId) || salesTabs[0]

  const updateActiveTab = (updates) => {
    setSalesTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ))
  }

  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salesDrafts')) || [] } 
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('salesTabs', JSON.stringify(salesTabs))
    localStorage.setItem('activeTabId', JSON.stringify(activeTabId))
  }, [salesTabs, activeTabId])

  useEffect(() => {
    localStorage.setItem('salesDrafts', JSON.stringify(drafts))
  }, [drafts])

  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [returnSaleData, setReturnSaleData] = useState(null)

  // =========================================
  // --- Purchase Cart & Billing States ---
  // =========================================
  const [editingPurchaseInvoiceId, setEditingPurchaseInvoiceId] = useState(null)
  const [purchaseSellerName, setPurchaseSellerName] = useState('')
  const [customInvoiceId, setCustomInvoiceId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [purchaseDiscountPercent, setPurchaseDiscountPercent] = useState(0)
  const [purchaseTaxPercent, setPurchaseTaxPercent] = useState(5)
  const [showAddPurchaseProductModal, setShowAddPurchaseProductModal] = useState(false)
  
  const [purchaseCart, setPurchaseCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('purchaseCart')) || [] } 
    catch { return [] }
  })
  const [error, setError] = useState('')

  // =========================================
  // --- Receipts & Ledger States ---
  // =========================================
  const [receiptCustomer, setReceiptCustomer] = useState(null)
  const [receiptSearch, setReceiptSearch] = useState('')
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptDiscount, setReceiptDiscount] = useState('') 
  const [receiptMethod, setReceiptMethod] = useState('Cash')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]) 
  const [receiptRemarks, setReceiptRemarks] = useState('Payment received with thanks.')

  // =========================================
  // --- Modal Visibility & Form States ---
  // =========================================
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerForm, setCustomerForm] = useState({ 
    name: '', gstno: '', mobile: '', city: '', location: '', state: ''
  })

  const [viewingProduct, setViewingProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ 
    name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '' 
  })

  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventoryForm, setInventoryForm] = useState({ stock: '' })

  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState(null)

  const [expandedStats, setExpandedStats] = useState({
    daily: false, weekly: false, monthly: false, yearly: false
  })

  // =========================================
  // --- Lifecycle Effects / Synchronization ---
  // =========================================
  useEffect(() => {
    loadProducts()
    loadCustomers()
    loadInvoices()
    loadPurchaseInvoices()
    loadHistory()
    loadReceipts()
  }, [])

  useEffect(() => {
    localStorage.setItem('purchaseCart', JSON.stringify(purchaseCart))
  }, [purchaseCart])

  useEffect(() => {
    setSearchQuery('')
    setPurchaseSearchQuery('')
    setLedgerSearchQuery('')
    setDateFilterRange('all') 
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
    setViewingReceipt(null)
  }, [view])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, purchaseSearchQuery, ledgerSearchQuery, dateFilterRange, startDate, endDate, itemsPerPage])

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '12345') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const isWithinDateRange = (dateInput) => {
    if (!dateInput) return false;
    const dateToCheck = new Date(dateInput);
    dateToCheck.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilterRange === 'today') return dateToCheck.getTime() === today.getTime();
    if (dateFilterRange === 'week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return dateToCheck >= lastWeek && dateToCheck <= today;
    }
    if (dateFilterRange === 'month') {
      const lastMonth = new Date(today);
      lastMonth.setDate(lastMonth.getDate() - 30);
      return dateToCheck >= lastMonth && dateToCheck <= today;
    }
    if (dateFilterRange === 'year') {
      const thisYear = new Date(today.getFullYear(), 0, 1);
      return dateToCheck >= thisYear && dateToCheck <= today;
    }
    if (dateFilterRange === 'custom') {
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (dateToCheck < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(0, 0, 0, 0);
        if (dateToCheck > e) return false;
      }
    }
    return true; 
  }

  // =========================================
  // --- Core Calculation Engines (useMemo) ---
  // =========================================
  const customerStatementData = useMemo(() => {
    if (!viewingCustomerStatement) return [];
    const normalizeName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNameNorm = normalizeName(viewingCustomerStatement.name);
    const targetId = viewingCustomerStatement.id;
    
    let statement = [];

    invoices.forEach(inv => {
      const invNameNorm = normalizeName(inv.customerName);
      if (invNameNorm === targetNameNorm) {
        const isPayLater = inv.paymentMethod === 'Pay Later';
        const amount = inv.finalTotal || inv.totalAmount || 0;
        
        let debit = 0; let credit = 0;
        if (!inv.isReturn) {
          debit = amount; credit = isPayLater ? 0 : amount;
        } else {
          credit = amount; debit = isPayLater ? 0 : amount; 
        }

        statement.push({
          sortDate: new Date(inv.orderDate),
          type: inv.isReturn ? 'Sale Return' : 'Sale Bill',
          ref: formatInvoiceId(inv.id),
          method: inv.paymentMethod || 'Cash',
          debit: debit, credit: credit,
          isCashTx: (!inv.isReturn && !isPayLater) 
        });
      }
    });

    receipts.forEach(rec => {
      const recNameNorm = normalizeName(rec.customerName);
      if (rec.customerId === targetId || recNameNorm === targetNameNorm) {
        const recDiscount = rec.discountAmount || 0;
        statement.push({
          sortDate: new Date(rec.receiptDate),
          type: 'Payment Received',
          ref: formatReceiptId(rec.id),
          method: rec.paymentMode,
          debit: 0, credit: rec.amount + recDiscount,
          isCashTx: false
        });
      }
    });

    statement.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    let runningBalance = 0;
    statement.forEach(item => {
      runningBalance += item.debit; runningBalance -= item.credit; 
      item.runningBalance = runningBalance;
    });

    return statement.reverse();
  }, [viewingCustomerStatement, invoices, receipts]);

  const filteredCustomerStatementData = useMemo(() => {
    return customerStatementData.filter(row => {
      const safeQuery = (ledgerSearchQuery || '').toLowerCase();
      const matchesText = !safeQuery || 
        (row.ref && row.ref.toLowerCase().includes(safeQuery)) ||
        (row.method && row.method.toLowerCase().includes(safeQuery)) ||
        (row.type && row.type.toLowerCase().includes(safeQuery));
      return matchesText && isWithinDateRange(row.sortDate);
    });
  }, [customerStatementData, ledgerSearchQuery, dateFilterRange, startDate, endDate]);

  const salesStats = useMemo(() => {
    const dailyMap = {}; const weeklyMap = {}; const monthlyMap = {}; const yearlyMap = {};
    invoices.forEach(inv => {
      if (inv.isReturn) return;
      const d = new Date(inv.orderDate);
      const total = inv.finalTotal || inv.totalAmount || 0;
      
      const daySortKey = d.toISOString().split('T')[0];
      const dayDisplay = d.toLocaleDateString('en-GB');

      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const weekSortKey = startOfWeek.toISOString().split('T')[0];
      const weekDisplay = `Week of ${startOfWeek.toLocaleDateString('en-GB')}`;

      const monthSortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
      const yearKey = d.getFullYear().toString();

      if (!dailyMap[daySortKey]) dailyMap[daySortKey] = { label: dayDisplay, total: 0 };
      dailyMap[daySortKey].total += total;

      if (!weeklyMap[weekSortKey]) weeklyMap[weekSortKey] = { label: weekDisplay, total: 0 };
      weeklyMap[weekSortKey].total += total;

      if (!monthlyMap[monthSortKey]) monthlyMap[monthSortKey] = { label: monthDisplay, total: 0 };
      monthlyMap[monthSortKey].total += total;

      if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { label: yearKey, total: 0 };
      yearlyMap[yearKey].total += total;
    });

    const toSortedArray = (map) => Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(entry => entry[1]);
    return { daily: toSortedArray(dailyMap), weekly: toSortedArray(weeklyMap), monthly: toSortedArray(monthlyMap), yearly: toSortedArray(yearlyMap) };
  }, [invoices]);

  const activeBillingDetails = useMemo(() => {
    const subtotal = activeTab.cart.reduce((sum, item) => sum + item.price * (Number(item.quantity) || 0), 0)
    const discountAmount = subtotal * (activeTab.discountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    const cgstPercent = activeTab.taxPercent / 2
    const sgstPercent = activeTab.taxPercent / 2
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    return { subtotal, discountAmount, taxableAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal }
  }, [activeTab.cart, activeTab.discountPercent, activeTab.taxPercent])

  const purchaseBillingDetails = useMemo(() => {
    const subtotal = purchaseCart.reduce((sum, item) => sum + (item.purchasePrice || 0) * (Number(item.quantity) || 0), 0)
    const discountAmount = subtotal * (purchaseDiscountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    const cgstPercent = purchaseTaxPercent / 2
    const sgstPercent = purchaseTaxPercent / 2
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    return { subtotal, discountAmount, taxableAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal }
  }, [purchaseCart, purchaseDiscountPercent, purchaseTaxPercent])

  const selectedInvoiceMath = useMemo(() => {
    if (!selectedInvoice) return null;
    const subtotal = selectedInvoice.grossTotal || selectedInvoice.totalAmount || 0;
    const discountPercent = selectedInvoice.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = selectedInvoice.cgst || 0;
    const sgst = selectedInvoice.sgst || 0;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = selectedInvoice.finalTotal || selectedInvoice.totalAmount || 0;
    const roundoff = finalTotal - exactTotal;
    const cgstPercent = taxableAmount > 0 ? (cgst / taxableAmount) * 100 : 0;
    const sgstPercent = taxableAmount > 0 ? (sgst / taxableAmount) * 100 : 0;
    const totalTaxPercent = cgstPercent + sgstPercent;
    return { subtotal, discountPercent, discountAmount, taxableAmount, cgst, sgst, exactTotal, finalTotal, roundoff, cgstPercent, sgstPercent, totalTaxPercent };
  }, [selectedInvoice]);

  const selectedPurchaseInvoiceMath = useMemo(() => {
    if (!selectedPurchaseInvoice) return null;
    const subtotal = selectedPurchaseInvoice.grossTotal || 0;
    const discountPercent = selectedPurchaseInvoice.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = selectedPurchaseInvoice.cgst || 0;
    const sgst = selectedPurchaseInvoice.sgst || 0;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = selectedPurchaseInvoice.finalTotal || 0;
    const roundoff = finalTotal - exactTotal;
    const cgstPercent = taxableAmount > 0 ? (cgst / taxableAmount) * 100 : 0;
    const sgstPercent = taxableAmount > 0 ? (sgst / taxableAmount) * 100 : 0;
    const totalTaxPercent = cgstPercent + sgstPercent;
    return { subtotal, discountPercent, discountAmount, taxableAmount, cgst, sgst, exactTotal, finalTotal, roundoff, cgstPercent, sgstPercent, totalTaxPercent };
  }, [selectedPurchaseInvoice]);

  const returnMath = useMemo(() => {
    if (!returnSaleData) return null;
    const subtotal = returnSaleData.returnItems.reduce((sum, item) => sum + (item.price * (Number(item.returnQty) || 0)), 0);
    const discountPercent = returnSaleData.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const origSubtotal = returnSaleData.grossTotal || 0;
    const origDiscountAmt = origSubtotal * (discountPercent / 100);
    const origTaxable = origSubtotal - origDiscountAmt;
    const origCgstPercent = origTaxable > 0 ? (returnSaleData.cgst / origTaxable) : 0;
    const origSgstPercent = origTaxable > 0 ? (returnSaleData.sgst / origTaxable) : 0;
    const cgst = taxableAmount * origCgstPercent;
    const sgst = taxableAmount * origSgstPercent;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = Math.round(exactTotal);
    const roundoff = finalTotal - exactTotal;
    return { subtotal, discountAmount, taxableAmount, cgst, sgst, finalTotal, roundoff };
  }, [returnSaleData]);

  const preExistingSellers = useMemo(() => {
    const names = purchaseInvoices.map(inv => inv.sellerName).filter(Boolean);
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length === 0) return ['Wholesale Market', 'Direct Distributor', 'Local Supplier'];
    return uniqueNames;
  }, [purchaseInvoices]);

  // =========================================
  // --- Master Filter & Search Pipelines ---
  // =========================================
  const safeSearch = (searchQuery || '').toLowerCase();
  const safePurchaseSearch = (purchaseSearchQuery || '').toLowerCase();
  const safeCustomerSearch = (activeTab?.customerSearch || '').toLowerCase();
  const safeSellerSearch = (purchaseSellerName || '').toLowerCase();
  const safeReceiptSearch = (receiptSearch || '').toLowerCase();

  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) ||
    formatProductId(p.id).toLowerCase().includes(safeSearch)
  )

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(safeSearch)) ||
    (c.mobile && c.mobile.includes(safeSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeSearch)) ||
    (c.location && c.location.toLowerCase().includes(safeSearch)) ||
    (c.gstno && c.gstno.toLowerCase().includes(safeSearch))
  )

  const dropdownFilteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(safeCustomerSearch)) ||
    (c.location && c.location.toLowerCase().includes(safeCustomerSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeCustomerSearch))
  )

  const receiptFilteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(safeReceiptSearch)) ||
    (c.mobile && c.mobile.includes(safeReceiptSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeReceiptSearch))
  )

  const dropdownFilteredSellers = preExistingSellers.filter(s => 
    s && s.toLowerCase().includes(safeSellerSearch)
  )

  const filteredInvoices = invoices.filter(i =>
    ((i.customerName && i.customerName.toLowerCase().includes(safeSearch)) || 
    formatInvoiceId(i.id).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(i.orderDate)
  )

  const filteredPurchaseInvoices = purchaseInvoices.filter(i =>
    ((i.sellerName && i.sellerName.toLowerCase().includes(safePurchaseSearch)) ||
    (i.id && i.id.toString().includes(safePurchaseSearch)) ||
    (i.customInvoiceId && i.customInvoiceId.toLowerCase().includes(safePurchaseSearch))) &&
    isWithinDateRange(i.purchaseDate)
  )

  const filteredReceipts = receipts.filter(r => 
    ((r.customerName && r.customerName.toLowerCase().includes(safeSearch)) ||
    (r.paymentMode && r.paymentMode.toLowerCase().includes(safeSearch)) ||
    formatReceiptId(r.id).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(r.receiptDate)
  )

  const filteredInventoryHistory = inventoryHistory.filter(log => 
    ((log.productName && log.productName.toLowerCase().includes(safeSearch)) ||
    (log.actionType && log.actionType.toLowerCase().includes(safeSearch))) &&
    isWithinDateRange(log.timestamp)
  )

  const filteredInvoiceHistory = invoiceHistory.filter(log => 
    ((log.customerName && log.customerName.toLowerCase().includes(safeSearch)) ||
    formatInvoiceId(log.originalInvoiceId).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(log.editDate)
  )

  const filteredPurchaseInvoiceHistory = purchaseInvoiceHistory.filter(log => 
    ((log.sellerName && log.sellerName.toLowerCase().includes(safeSearch)) ||
    formatPurchaseInvoiceId(log.originalPurchaseInvoiceId).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(log.editDate)
  )

  // Pagination Handlers
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedPurchaseInvoices = filteredPurchaseInvoices.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedReceipts = filteredReceipts.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInventoryHistory = filteredInventoryHistory.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInvoiceHistory = filteredInvoiceHistory.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedPurchaseInvoiceHistory = filteredPurchaseInvoiceHistory.slice(indexOfFirstItem, indexOfLastItem)

  function loadProducts() { productService.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])) }
  function loadCustomers() { customerService.getCustomers().then(data => setCustomers(Array.isArray(data) ? data : [])) }
  function loadInvoices() { invoiceService.getInvoices().then(data => setInvoices((data || []).sort((a, b) => b.id - a.id))) }
  function loadPurchaseInvoices() { purchaseInvoiceService.getPurchaseInvoices().then(data => setPurchaseInvoices((data || []).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)))) }
  function loadReceipts() { receiptService.getReceipts().then(data => setReceipts(Array.isArray(data) ? data : [])) }
  function loadHistory() {
    historyService.getInventoryHistory().then(data => setInventoryHistory(Array.isArray(data) ? data : []))
    historyService.getInvoiceHistory().then(data => setInvoiceHistory(Array.isArray(data) ? data : []))
    historyService.getPurchaseInvoiceHistory().then(data => setPurchaseInvoiceHistory(Array.isArray(data) ? data : []))
  }

  // =========================================
  // --- Outbound Sales Process Handlers ---
  // =========================================
  const openNewTab = () => {
    const newTab = generateNewTab(`Bill ${salesTabs.length + 1}`);
    setSalesTabs([...salesTabs, newTab]);
    setActiveTabId(newTab.id);
  }

  const closeTab = (idToClose, e) => {
    e.stopPropagation();
    if (salesTabs.length === 1) {
      const reset = generateNewTab();
      setSalesTabs([reset]);
      setActiveTabId(reset.id);
      return;
    }
    const newTabs = salesTabs.filter(t => t.id !== idToClose);
    setSalesTabs(newTabs);
    if (activeTabId === idToClose) setActiveTabId(newTabs[newTabs.length - 1].id);
  }

  const saveToDrafts = () => {
    if (activeTab.cart.length === 0 && !activeTab.activeCustomer) return window.alert("Cannot save an empty tab to drafts.");
    const draftName = window.prompt("Enter a name to easily identify this draft:", activeTab.activeCustomer ? activeTab.activeCustomer.name : `Draft ${new Date().toLocaleTimeString()}`);
    if (draftName === null) return; 

    const newDraft = { ...activeTab, draftId: Date.now(), draftName, savedAt: new Date().toISOString() };
    setDrafts([...drafts, newDraft]);

    if (salesTabs.length === 1) {
      const reset = generateNewTab();
      setSalesTabs([reset]);
      setActiveTabId(reset.id);
    } else {
      const newTabs = salesTabs.filter(t => t.id !== activeTabId);
      setSalesTabs(newTabs);
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
    window.alert("Successfully saved to Drafts!");
  }

  const resumeDraft = (draftToResume) => {
    const resumedTab = { ...draftToResume, id: Date.now() }; 
    setSalesTabs([...salesTabs, resumedTab]);
    setActiveTabId(resumedTab.id);
    setDrafts(drafts.filter(d => d.draftId !== draftToResume.draftId));
    setView('list');
  }

  const deleteDraft = (draftId) => {
    if (window.confirm("Are you sure you want to delete this draft?")) {
      setDrafts(drafts.filter(d => d.draftId !== draftId));
    }
  }

  function addToCart(product) {
    if (product.stock <= 0) return window.alert(`Sorry, ${product.name} is currently out of stock!`)
    const existing = activeTab.cart.find(item => item.id === product.id)
    let newCart;
    if (existing) {
      if (existing.quantity >= product.stock) return window.alert(`Cannot add more. We only have ${product.stock} of ${product.name} in stock.`)
      newCart = activeTab.cart.map(item => item.id === product.id ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } : item)
    } else {
      newCart = [...activeTab.cart, { ...product, quantity: 1 }]
    }
    updateActiveTab({ cart: newCart })
  }

  function updateQuantity(index, val) {
    const item = activeTab.cart[index]
    if (val === '') {
      const newCart = activeTab.cart.map((itm, idx) => idx === index ? { ...itm, quantity: '' } : itm);
      return updateActiveTab({ cart: newCart });
    }
    const quantity = Number(val)
    if (quantity < 0) return
    if (quantity > item.stock) return window.alert(`Cannot exceed available inventory (${item.stock} left).`)
    const newCart = activeTab.cart.map((itm, idx) => idx === index ? { ...itm, quantity } : itm)
    updateActiveTab({ cart: newCart })
  }

  function removeCartItem(index) {
    updateActiveTab({ cart: activeTab.cart.filter((_, idx) => idx !== index) })
  }

  function proceedToPayment() {
    if (!activeTab.cart.length) return window.alert('Cart is empty.')
    if (!activeTab.activeCustomer) return window.alert('Please select a customer before proceeding to payment.')
    setView('payment-screen')
  }

  function submitFinalSale() {
    const finalPaymentMethod = activeTab.isPayLater ? 'Pay Later' : activeTab.paymentMethod;

    if (activeTab.editingInvoiceId) {
      invoiceService.update(
        activeTab.editingInvoiceId, activeTab.activeCustomer.name, activeTab.cart,
        activeBillingDetails.subtotal, activeTab.discountPercent, activeBillingDetails.cgst,
        activeBillingDetails.sgst, activeBillingDetails.finalTotal, finalPaymentMethod, activeTab.saleDate
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} updated successfully!`)
        closeTab(activeTabId, { stopPropagation: () => {} })
        loadProducts(); loadInvoices(); loadHistory(); loadCustomers();
        
        // AUTO-PRINT
        invoiceService.getInvoiceById(invoice.id).then(fullInvoice => {
          setSelectedInvoice(fullInvoice);
          setView('invoice-details');
          setTimeout(() => window.print(), 500); 
        });
      }).catch(err => window.alert('Failed to update sale. ' + err.message))
    } else {
      invoiceService.create(
        activeTab.activeCustomer.name, activeTab.cart, activeBillingDetails.subtotal, 
        activeTab.discountPercent, activeBillingDetails.cgst, activeBillingDetails.sgst,
        activeBillingDetails.finalTotal, finalPaymentMethod, activeTab.saleDate
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} completed successfully!`)
        closeTab(activeTabId, { stopPropagation: () => {} })
        loadProducts(); loadInvoices(); loadHistory(); loadCustomers();

        // AUTO-PRINT
        invoiceService.getInvoiceById(invoice.id).then(fullInvoice => {
          setSelectedInvoice(fullInvoice);
          setView('invoice-details');
          setTimeout(() => window.print(), 500);
        });
      }).catch(err => window.alert('Failed to complete sale. ' + err.message))
    }
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale/edit?")) {
      closeTab(activeTabId, { stopPropagation: () => {} })
      setView('list')
    }
  }

  function handleViewInvoiceDetails(invoiceId) { 
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data)
      setView('invoice-details')
    }) 
  }

  function handleLedgerRowClick(row) {
    const parsedId = parseInt(row.ref.replace(/[^0-9]/g, ''), 10);
    if (row.type === 'Payment Received') {
      const rec = receipts.find(r => r.id === parsedId);
      if (rec) setLedgerPreview({ type: 'receipt', data: rec });
    } else {
      invoiceService.getInvoiceById(parsedId).then(data => {
        setLedgerPreview({ type: 'invoice', data, isReturn: row.type === 'Sale Return' });
      }).catch(err => console.error("Could not load preview:", err));
    }
  }

  function handleEditSale(invoice) {
    const subtotal = invoice.grossTotal || 0;
    const discountAmt = subtotal * ((invoice.discountPercent || 0) / 100);
    const taxableAmt = subtotal - discountAmt;
    const totalTaxPercent = taxableAmt > 0 ? ((invoice.cgst + invoice.sgst) / taxableAmt) * 100 : 5;
    
    const editTab = generateNewTab(`Editing ${formatInvoiceId(invoice.id)}`);
    editTab.editingInvoiceId = invoice.id;
    editTab.activeCustomer = { name: invoice.customerName };
    editTab.customerSearch = invoice.customerName;
    editTab.discountPercent = invoice.discountPercent || 0;
    editTab.taxPercent = Math.round(totalTaxPercent);
    editTab.isPayLater = invoice.paymentMethod === 'Pay Later';
    editTab.paymentMethod = editTab.isPayLater ? 'Cash' : (invoice.paymentMethod || 'Cash');
    editTab.saleDate = invoice.orderDate ? invoice.orderDate.split('T')[0] : new Date().toISOString().split('T')[0];
    editTab.cart = invoice.items.map(item => ({
      ...item.product, id: item.product.id, price: item.price, quantity: item.quantity, originalQuantity: item.quantity, stock: (item.product.stock || 0) + item.quantity 
    }));

    setSalesTabs([...salesTabs, editTab]);
    setActiveTabId(editTab.id);
    setView('list');
  }

  function handleInitiateReturn(invoice) {
    if (invoice.isReturn) return window.alert("This is already a returned invoice!");
    setReturnSaleData({
      ...invoice,
      returnItems: invoice.items.map(item => ({ ...item, returnQty: 0 }))
    });
    setView('return-sale');
  }

  function handleReturnAllItems() {
    setReturnSaleData(prev => ({
      ...prev,
      returnItems: prev.returnItems.map(item => ({ ...item, returnQty: item.quantity }))
    }));
  }

  function submitReturn() {
    const itemsToReturn = returnSaleData.returnItems.filter(i => (Number(i.returnQty) || 0) > 0);
    if (itemsToReturn.length === 0) return window.alert("Please select at least one item to return.");
    if (!window.confirm(`Process return for ${itemsToReturn.length} items? This will generate a negative bill and restore inventory.`)) return;

    invoiceService.returnInvoice(
      returnSaleData.id, itemsToReturn.map(i => ({ id: i.product.id, quantity: Number(i.returnQty), price: i.price })),
      returnMath.subtotal, returnSaleData.discountPercent, returnMath.cgst, returnMath.sgst, returnMath.finalTotal
    ).then(() => {
      window.alert("Return processed successfully!");
      setReturnSaleData(null);
      setView('invoices'); loadInvoices(); loadProducts(); loadHistory(); loadCustomers();
    }).catch(err => window.alert("Failed to process return: " + err.message));
  }

  // =========================================
  // --- Inbound Vendor Purchase Handlers ---
  // =========================================
  function addToPurchaseCart(product) {
    setPurchaseCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) return current.map(item => item.id === product.id ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } : item)
      return [...current, { ...product, quantity: 1, purchasePrice: product.purchasePrice || 0 }]
    })
  }

  function updatePurchaseQuantity(index, val) {
    setPurchaseCart(current => {
      if (val === '') return current.map((itm, idx) => idx === index ? { ...itm, quantity: '' } : itm)
      const quantity = Number(val)
      if (quantity < 0) return current
      return current.map((itm, idx) => idx === index ? { ...itm, quantity } : itm)
    })
  }

  function updatePurchasePrice(index, price) {
    if (price < 0) return
    setPurchaseCart(current => current.map((itm, idx) => idx === index ? { ...itm, purchasePrice: price } : itm))
  }

  function removePurchaseCartItem(index) {
    setPurchaseCart(current => current.filter((_, idx) => idx !== index))
  }

  function proceedToPurchaseSummary() {
    if (!purchaseCart.length) return window.alert('Purchase cart is empty.')
    if (!purchaseSellerName.trim()) return window.alert('Please select or enter a Seller Name before proceeding.')
    if (!customInvoiceId.trim()) return window.alert('Please enter the Purchase Invoice ID given by the seller.')
    if (!purchaseDate) return window.alert('Please select the Date of Purchase.')
    setView('purchase-summary-screen')
  }

  function submitPurchaseCart() {
    if (editingPurchaseInvoiceId) {
      purchaseInvoiceService.update(
        editingPurchaseInvoiceId, purchaseSellerName, purchaseDate, customInvoiceId, purchaseCart,
        purchaseBillingDetails.subtotal, purchaseDiscountPercent, purchaseBillingDetails.cgst,
        purchaseBillingDetails.sgst, purchaseBillingDetails.finalTotal
      ).then(() => {
        window.alert(`Purchase Invoice updated successfully!`); resetPurchaseState()
      }).catch(err => window.alert('Failed to update purchase. ' + err.message))
    } else {
      purchaseInvoiceService.create(
        purchaseSellerName, purchaseDate, customInvoiceId, purchaseCart,
        purchaseBillingDetails.subtotal, purchaseDiscountPercent, purchaseBillingDetails.cgst,
        purchaseBillingDetails.sgst, purchaseBillingDetails.finalTotal
      ).then(() => {
        window.alert(`Purchase Invoice recorded successfully!`); resetPurchaseState()
      }).catch(err => window.alert('Failed to complete purchase. ' + err.message))
    }
  }

  function resetPurchaseState() {
    setPurchaseCart([])
    setPurchaseSellerName('')
    setCustomInvoiceId('')
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setPurchaseDiscountPercent(0)
    setPurchaseTaxPercent(5)
    setEditingPurchaseInvoiceId(null)
    setView('purchases-list')
    loadProducts(); loadPurchaseInvoices(); loadHistory();
  }

  function cancelPurchase() {
    if (window.confirm("Are you sure you want to cancel the current purchase entry?")) resetPurchaseState()
  }

  function handleViewPurchaseInvoiceDetails(invoiceId) {
    purchaseInvoiceService.getPurchaseInvoiceById(invoiceId).then(data => {
      setSelectedPurchaseInvoice(data)
      setView('purchase-invoice-details')
    })
  }

  function handleEditPurchase(invoice) {
    setEditingPurchaseInvoiceId(invoice.id);
    setPurchaseSellerName(invoice.sellerName);
    setCustomInvoiceId(invoice.customInvoiceId || '');
    setPurchaseDate(invoice.purchaseDate ? invoice.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setPurchaseDiscountPercent(invoice.discountPercent || 0);

    const subtotal = invoice.grossTotal || 0;
    const discountAmt = subtotal * ((invoice.discountPercent || 0) / 100);
    const taxableAmt = subtotal - discountAmt;
    const totalTaxPercent = taxableAmt > 0 ? ((invoice.cgst + invoice.sgst) / taxableAmt) * 100 : 5;
    
    setPurchaseTaxPercent(Math.round(totalTaxPercent));

    setPurchaseCart(invoice.items.map(item => ({
      ...item.product, id: item.product.id, purchasePrice: item.purchasePrice, quantity: item.quantity, originalQuantity: item.quantity
    })));

    setView('purchase-new');
  }

  // =========================================
  // --- Customer Receipts Processing ---
  // =========================================
  function handleGenerateReceipt() {
    if (!receiptCustomer) return window.alert("Please select a customer.");
    if (!receiptAmount || Number(receiptAmount) <= 0) return window.alert("Please enter a valid amount.");
    
    receiptService.create(receiptCustomer.id, receiptAmount, receiptDiscount, receiptMethod, receiptDate, receiptRemarks)
      .then(() => {
        window.alert(`Receipt securely logged! Total Ledger Credit applied for ${receiptCustomer.name}.`);
        loadCustomers(); loadReceipts(); setReceiptCustomer(null);
        setReceiptAmount(''); setReceiptDiscount(''); setReceiptDate(new Date().toISOString().split('T')[0]);
        setReceiptSearch(''); setReceiptRemarks('Payment received with thanks.');
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
  }

  // =========================================
  // --- System Master CRUD Operations ---
  // =========================================
  function handleSaveProduct() {
    const name = productForm.name.trim()
    const hsnCode = productForm.hsnCode.trim()
    const purchasePrice = parseFloat(productForm.purchasePrice)
    const mrp = parseFloat(productForm.mrp)
    const price = parseFloat(productForm.price)
    
    if (!name || isNaN(purchasePrice) || isNaN(mrp) || isNaN(price) || purchasePrice < 0 || price <= 0 || mrp <= 0) {
      return window.alert('Invalid details. Ensure all prices are positive numbers.')
    }
    
    if (isEditMode) {
      const existingProduct = products.find(p => p.id === editingProductId)
      productService.updateProduct(
        editingProductId, name, purchasePrice, mrp, price, existingProduct ? existingProduct.stock : 0, hsnCode
      ).then(() => { loadProducts(); loadHistory(); closeProductModal() })
    } else {
      productService.addProduct(
        name, purchasePrice, mrp, price, parseInt(productForm.stock, 10) || 0, hsnCode
      ).then(() => { loadProducts(); loadHistory(); closeProductModal() })
    }
  }

  function handleDeleteProduct(id, name) {
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This cannot be undone.`)) { 
      productService.deleteProduct(id).then(() => { loadProducts(); closeProductModal(); }) 
    }
  }

  function closeProductModal() {
    setShowProductModal(false)
    setProductForm({ name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '' })
  }

  function openInventoryModal(product) {
    setEditingInventoryId(product.id)
    setInventoryForm({ stock: product.stock.toString() })
    setShowInventoryModal(true)
  }

  function closeInventoryModal() {
    setShowInventoryModal(false)
    setEditingInventoryId(null)
    setInventoryForm({ stock: '' })
  }

  function handleSaveInventory() {
    const newStock = parseInt(inventoryForm.stock, 10)
    if (isNaN(newStock) || newStock < 0) return window.alert('Stock must be 0 or greater.')
    
    const product = products.find(p => p.id === editingInventoryId)
    productService.updateProduct(
      product.id, product.name, product.purchasePrice, product.mrp || product.price, product.price, newStock, product.hsnCode
    ).then(() => { loadProducts(); loadHistory(); closeInventoryModal() })
  }

  function handleSaveCustomer() {
    const { name, gstno, mobile, city, location, state } = customerForm
    if (!name?.trim()) return window.alert('Name is required')
    
    const existingBalance = isCustomerEditMode ? (customers.find(c => c.id === editingCustomerId)?.balance || 0) : 0;

    const action = isCustomerEditMode
      ? customerService.updateCustomer(editingCustomerId, name, gstno, mobile, city, location, existingBalance, state)
      : customerService.addCustomer(name, gstno, mobile, city, location, existingBalance, state)
      
    action.then(() => { loadCustomers(); closeCustomerModal() })
  }

  function handleDeleteCustomer(id, name) {
    if (window.confirm(`Are you sure you want to completely delete customer "${name}"? This cannot be undone.`)) {
      customerService.deleteCustomer(id).then(() => { loadCustomers(); closeCustomerModal(); })
    }
  }

  function closeCustomerModal() {
    setShowCustomerModal(false)
    setCustomerForm({ name: '', gstno: '', mobile: '', city: '', location: '', state: '' })
  }

  // =========================================
  // --- File Upload / Excel Reports ---
  // =========================================
  const handleImportCustomers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedCustomers = data.map(row => ({
          name: row.Name || row.name || 'Unknown',
          mobile: String(row['Phone Number'] || row.mobile || ''),
          city: row.City || row.city || '',
          location: row.Location || row.location || '',
          gstno: row.GST || row.gstno || '',
          balance: Number(row.Balance || row.balance) || 0,
          state: row.State || row.state || ''
        }));

        customerService.addCustomersBulk(formattedCustomers)
          .then(() => {
            window.alert(`Successfully imported/updated ${formattedCustomers.length} customers!`);
            loadCustomers();
          })
          .catch(err => window.alert("Failed to import customers: " + err.message));
      } catch (err) { window.alert("Error parsing Excel file: " + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) return window.alert("No customers to export.");
    const dataToExport = customers.map(c => ({
      'Customer ID': c.id, 'Name': c.name, 'Phone Number': c.mobile, 'City': c.city,
      'Location': c.location, 'State': c.state, 'GST': c.gstno, 'Balance': c.balance
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportProducts = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedProducts = data.map(row => {
          let parsedId = null;
          const rawId = row.Id || row['Product ID'] || row.id;
          if (rawId) {
             const extracted = String(rawId).replace(/[^0-9]/g, '');
             if (extracted) parsedId = parseInt(extracted, 10);
          }
          return {
            id: parsedId, name: row.Name || row.name || 'Unknown Product',
            hsnCode: String(row.HSN || row['HSN Code'] || row.hsnCode || ''),
            purchasePrice: Number(row['purchase price'] || row['Purchase Price'] || row.purchasePrice) || 0,
            mrp: Number(row.MRP || row.mrp) || 0,
            price: Number(row['sales price'] || row['Selling Price'] || row.price) || 0,
            stock: Number(row['In Stock'] || row.Stock || row.stock) || 0
          }
        });

        productService.addProductsBulk(formattedProducts)
          .then(() => {
            window.alert(`Successfully imported/updated ${formattedProducts.length} products!`);
            loadProducts(); loadHistory(); 
          })
          .catch(err => window.alert("Failed to import products: " + err.message));
      } catch (err) { window.alert("Error parsing Excel file: " + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportProducts = () => {
    if (products.length === 0) return window.alert("No products to export.");
    const dataToExport = products.map(p => ({
      'Product ID': formatProductId(p.id), 'Name': p.name, 'HSN Code': p.hsnCode,
      'Purchase Price': p.purchasePrice, 'MRP': p.mrp || p.price, 'Selling Price': p.price, 'Stock': p.stock
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `Products_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // =========================================
  // --- Helpers for Render Logic ---
  // =========================================
  
  const renderDateFilter = () => (
    <div className="date-filter-group">
      <select 
        className="form-control mb-0 date-select-sm" 
        value={dateFilterRange} 
        onChange={e => setDateFilterRange(e.target.value)}
      >
        <option value="all">📅 All Time</option>
        <option value="today">📅 Today</option>
        <option value="week">📅 Last 7 Days</option>
        <option value="month">📅 Last 30 Days</option>
        <option value="year">📅 This Year</option>
        <option value="custom">⚙️ Custom Range...</option>
      </select>
      
      {dateFilterRange === 'custom' && (
        <div className="custom-date-range">
          <input type="date" className="form-control mb-0 date-input-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted fs-sm fw-bold">to</span>
          <input type="date" className="form-control mb-0 date-input-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      )}
    </div>
  );

  const parseItems = (json) => {
    try { return JSON.parse(json) || []; } catch { return []; }
  };

  const renderHistoryItems = (jsonString) => {
    const items = parseItems(jsonString);
    if (!items.length) return <tr><td colSpan="3" className="text-muted">No items</td></tr>;
    
    return items.map((item, idx) => (
      <tr key={idx} className="bg-transparent">
        <td className="fw-bold">{item.name}</td>
        <td>{item.qty || item.quantity}</td>
        <td className="text-success">{formatMoney(item.price || item.purchasePrice)}</td>
      </tr>
    ));
  };

  const renderHistorySummary = (itemsJson, finalTotal) => {
    const items = parseItems(itemsJson);
    const calcSubtotal = items.reduce((sum, i) => sum + ((i.price || i.purchasePrice || 0) * (i.qty || i.quantity || 0)), 0);
    const totalQty = items.reduce((sum, i) => sum + (i.qty || i.quantity || 0), 0);
    
    return (
      <div className="receipt-panel receipt-summary-box">
        <div className="receipt-row receipt-three-col mb-0-5">
          <span className="fw-bold text-muted">Total Items:</span>
          <span className="text-right text-muted">{items.length} (Qty: {totalQty})</span>
        </div>
        <div className="receipt-row receipt-three-col mb-0-5">
          <span className="fw-bold text-muted">Est. Subtotal:</span>
          <span className="text-right text-muted">{formatMoney(calcSubtotal)}</span>
        </div>
        <div className="receipt-total receipt-three-col border-top-light">
          <span className="fw-bold">Final Total:</span>
          <span className="text-right fw-bold text-success fs-lg">{formatMoney(finalTotal)}</span>
        </div>
      </div>
    )
  }

  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
    return (
      <div className="pagination-wrapper">
        <div>
          <label className="fw-bold">Rows per page:</label>
          <select
            className="form-control mb-0 pagination-select"
            value={itemsPerPage}
            onChange={e => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="pagination-info">
          <span className="pagination-text">
            Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems}
          </span>
          <div className="btn-group">
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================
  // --- Security Auth Gate ---
  // =========================================
  if (!isLoggedIn) {
    return (
      <div className="modal-overlay login-overlay">
        <form onSubmit={handleLogin} className="card login-card">
          <h2 className="modal-header-title text-center">Retailer Login</h2>
          {loginError && <div className="text-danger mb-0 text-center">{loginError}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" required />
          </div>
          <button type="submit" className="btn btn-primary btn-checkout">Login to Dashboard</button>
        </form>
      </div>
    );
  }

  // =========================================
  // --- PIXEL PERFECT PRINT TEMPLATE ---
  // =========================================
  const renderPrintableInvoice = () => {
    if (!selectedInvoice || !selectedInvoiceMath) return null;
    const inv = selectedInvoice;
    const math = selectedInvoiceMath;
    const cust = customers.find(c => c.name === inv.customerName) || {};
    
    // REDUCED empty rows to 10 to prevent page spill
    const emptyRowsCount = Math.max(0, 22 - (inv.items?.length || 0));

    return (
      <div className="invoice-a4-box">
        {/* Header Block */}
        <div className="inv-header-flex">
          <div className="inv-h-left">GSTIN: 36AQOPM2633B1ZO</div>
          <div className="inv-h-center">
            <div className="inv-label">Invoice</div>
            <h1 className="inv-company-name">Ramesh Enterprises</h1>
            <div className="inv-company-text">Shop No. 21/B, S.P.T Market, Nalgonda</div>
            <div className="inv-company-text">rameshenterprises.nalgonda@gmail.com</div>
            <div className="inv-company-text">9440970457</div>
          </div>
          <div className="inv-h-right text-right">
            <h1 className="inv-logo-text">V I L Ā N</h1>
          </div>
        </div>

        {/* Customer Block */}
        <div className="inv-customer-flex">
          <div className="inv-cust-left">
            <h3 className="inv-cust-title">{inv.customerName}</h3>
            <div>{cust.location || cust.city || 'Address Not Provided'}</div>
            {cust.mobile && <div>{cust.mobile}</div>}
            <div>GST : {cust.gstno || 'URD'}</div>
          </div>
          <div className="inv-cust-right">
            <div><strong>Date:</strong> {formatPrintDate(inv.orderDate)}</div>
            <div><strong>Inv No:</strong> {formatInvoiceId(inv.id)}</div>
          </div>
        </div>

        {/* Dynamic Table Section */}
        <table className="inv-table">
          <thead>
            <tr>
              <th className="col-sno">S.No</th>
              <th className="col-hsn">HSN</th>
              <th className="col-prod">Product</th>
              <th className="col-qty">Quantity</th>
              <th className="col-price">Unit Price (₹)</th>
              <th className="col-tot">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="inv-table-body">
            {inv.items?.map((itm, i) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td className="text-center">{itm.product?.hsnCode || ''}</td>
                <td>{itm.product?.name}</td>
                <td className="text-center">{itm.quantity} pcs</td>
                <td className="text-right">{itm.price.toFixed(2)}</td>
                <td className="text-right">{(itm.price * itm.quantity).toFixed(2)}</td>
              </tr>
            ))}
            {[...Array(emptyRowsCount)].map((_, i) => (
              <tr key={`empty-${i}`}>
                <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
              </tr>
            ))}
            
            {/* The Hardcoded Math & Bank Summary rows */}
            <tr>
              <td rowSpan={9} colSpan={3} className="text-left align-top border-right-bold">
                <strong>Acc No: 31440400000058</strong><br/>
                Bank Name: BANK OF BARODA<br/>
                Branch Name: NALGONDA<br/>
                <strong>IFSC: BARB0NALGON</strong>
              </td>
              <td colSpan={2} className="text-right fw-bold border-right-bold">Total Quantity</td>
              <td className="text-right fw-bold">{inv.items?.reduce((a, b) => a + b.quantity, 0)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right border-right-bold">Subtotal</td>
              <td className="text-right">{math.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right border-right-bold">Scheme Discount</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-right border-right-bold">Special Discount</td>
              <td className="text-center border-right-bold">{math.discountPercent > 0 ? `${math.discountPercent.toFixed(2)} %` : ''}</td>
              <td className="text-right">{math.discountAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right border-right-bold">Subtotal (excl Tax)</td>
              <td className="text-right">{math.taxableAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="text-right border-right-bold">CGST</td>
              <td className="text-center border-right-bold">{math.cgstPercent > 0 ? `${math.cgstPercent.toFixed(2)} %` : ''}</td>
              <td className="text-right">{math.cgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="text-right border-right-bold">SGST</td>
              <td className="text-center border-right-bold">{math.sgstPercent > 0 ? `${math.sgstPercent.toFixed(2)} %` : ''}</td>
              <td className="text-right">{math.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right border-right-bold">Round off</td>
              <td className="text-right">{math.roundoff.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-right fw-bold border-right-bold" style={{fontSize: '16px'}}>Total</td>
              <td className="text-right fw-bold" style={{fontSize: '16px'}}>₹ {math.finalTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer Text */}
        <div className="inv-footer-tag">
          Powered by Retailer ERP System
        </div>
      </div>
    );
  };

  // =========================================
  // --- Main Core Grid Layout Render ---
  // =========================================
  return (
    <>
      <div className="app-layout no-print">
        {/* TOPBAR NAVIGATION MODULE */}
        <header className="topbar">
          <div className="topbar-brand">Retailer App</div>
          <nav className="nav-links">
            <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>Home</button>

            <div className="nav-dropdown">
              <button className={`nav-item ${['list', 'payment-screen', 'invoices', 'invoice-details', 'return-sale', 'edit-history', 'drafts-list', 'sale-edit-compare'].includes(view) ? 'active' : ''}`}>
                Sales ▼
              </button>
              <div className="nav-dropdown-content">
                <button className="nav-dropdown-item" onClick={() => { setView('list'); }}>New Sale</button>
                <button className="nav-dropdown-item" onClick={() => setView('drafts-list')}>Saved Drafts ({drafts.length})</button>
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
            <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>Reports</button>
          </nav>
          
          <button className="btn btn-danger logout-btn" onClick={() => { setIsLoggedIn(false); setUsername(''); setPassword(''); setView('home'); }}>
            Logout
          </button>
        </header>

        {/* CENTRAL APP VIEWSPACE CONTAINER */}
        <main className="main-content">
          {error && <div className="text-danger mb-0">{error}</div>}

          {/* --- DYNAMIC TARGET: HOME SALES REGISTERS OVERVIEW --- */}
          {view === 'home' && (
            <div>
              <h2 className="card-title">Sales Overview</h2>
              <div className="dashboard-stats-grid">
                <div className="card stat-card daily-card">
                  <h4>Daily Sales</h4>
                  <table className="summary-table">
                    <tbody>
                      {salesStats.daily.length === 0 ? (
                        <tr><td className="text-dark-muted">No records</td></tr>
                      ) : (
                        (expandedStats.daily ? salesStats.daily : salesStats.daily.slice(0, 5)).map((item, i) => (
                          <tr key={i}>
                            <td>{item.label}</td>
                            <td className="text-success text-right">{formatMoney(item.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {salesStats.daily.length > 5 && (
                    <button className="btn btn-secondary w-100" onClick={() => setExpandedStats(p => ({ ...p, daily: !p.daily }))}>
                      {expandedStats.daily ? 'View Less' : 'View More Past Days'}
                    </button>
                  )}
                </div>

                <div className="card stat-card weekly-card">
                  <h4>Weekly Sales</h4>
                  <table className="summary-table">
                    <tbody>
                      {salesStats.weekly.length === 0 ? (
                        <tr><td className="text-dark-muted">No records</td></tr>
                      ) : (
                        (expandedStats.weekly ? salesStats.weekly : salesStats.weekly.slice(0, 5)).map((item, i) => (
                          <tr key={i}>
                            <td>{item.label}</td>
                            <td className="text-primary text-right">{formatMoney(item.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {salesStats.weekly.length > 5 && (
                    <button className="btn btn-secondary w-100" onClick={() => setExpandedStats(p => ({ ...p, weekly: !p.weekly }))}>
                      {expandedStats.weekly ? 'View Less' : 'View More Past Weeks'}
                    </button>
                  )}
                </div>

                <div className="card stat-card monthly-card">
                  <h4>Monthly Sales</h4>
                  <table className="summary-table">
                    <tbody>
                      {salesStats.monthly.length === 0 ? (
                        <tr><td className="text-dark-muted">No records</td></tr>
                      ) : (
                        (expandedStats.monthly ? salesStats.monthly : salesStats.monthly.slice(0, 5)).map((item, i) => (
                          <tr key={i}>
                            <td>{item.label}</td>
                            <td className="text-purple text-right">{formatMoney(item.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {salesStats.monthly.length > 5 && (
                    <button className="btn btn-secondary w-100" onClick={() => setExpandedStats(p => ({ ...p, monthly: !p.monthly }))}>
                      {expandedStats.monthly ? 'View Less' : 'View More Past Months'}
                    </button>
                  )}
                </div>

                <div className="card stat-card yearly-card">
                  <h4>Yearly Sales</h4>
                  <table className="summary-table">
                    <tbody>
                      {salesStats.yearly.length === 0 ? (
                        <tr><td className="text-dark-muted">No records</td></tr>
                      ) : (
                        (expandedStats.yearly ? salesStats.yearly : salesStats.yearly.slice(0, 5)).map((item, i) => (
                          <tr key={i}>
                            <td>{item.label}</td>
                            <td className="text-amber text-right">{formatMoney(item.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {salesStats.yearly.length > 5 && (
                    <button className="btn btn-secondary w-100" onClick={() => setExpandedStats(p => ({ ...p, yearly: !p.yearly }))}>
                      {expandedStats.yearly ? 'View Less' : 'View More Past Years'}
                    </button>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Transactions</h3>
                  <button className="btn btn-primary" onClick={() => setView('invoices')}>View All Sales</button>
                </div>
                <div className="table-responsive">
                  <table className="block-table data-table">
                    <thead>
                      <tr>
                        <th>Bill ID</th>
                        <th>Customer Name</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0, 5).map(inv => (
                        <tr key={inv.id} className="product-row available" onClick={() => handleViewInvoiceDetails(inv.id)}>
                          <td className="fw-bold cell-padded">{formatInvoiceId(inv.id)}</td>
                          <td className="cell-padded">{inv.customerName}</td>
                          <td className={`price-text cell-padded ${inv.isReturn ? 'text-danger' : 'text-success'}`}>{formatMoney(inv.finalTotal || inv.totalAmount)}</td>
                          <td className="cell-padded">{new Date(inv.orderDate).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                      {invoices.length === 0 && <tr><td colSpan="4" className="empty-state">No recent sales found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: REPORTS MENU --- */}
          {view === 'reports' && (
            <div className="card bg-transparent">
              <div className="reports-layout">
                <div className="card mb-0">
                  <div className="card-header"><h2 className="card-title">Customer Data</h2></div>
                  <div className="dashboard-stats-grid single-col mt-1">
                    <div className="card stat-card report-card report-card-export">
                      <h4>Export Customers</h4>
                      <p className="text-muted mb-1-5">Download a complete backup of all your customers and their ledger balances.</p>
                      <div className="mt-auto">
                        <button className="btn btn-primary w-100" onClick={handleExportCustomers}>Download Excel Report</button>
                      </div>
                    </div>
                    <div className="card stat-card report-card report-card-import">
                      <h4>Import & Update Customers</h4>
                      <p className="text-muted mb-1-5">Upload Excel file to add new customers or update existing ones (matches by Phone Number or Name).</p>
                      <div className="mt-auto">
                        <input type="file" id="excel-upload-customers" accept=".xlsx, .xls" className="d-none" onChange={handleImportCustomers} />
                        <label htmlFor="excel-upload-customers" className="btn btn-success w-100 d-block cursor-pointer">Select Excel File</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card mb-0">
                  <div className="card-header"><h2 className="card-title">Product Inventory Data</h2></div>
                  <div className="dashboard-stats-grid single-col mt-1">
                    <div className="card stat-card report-card report-card-export-prod">
                      <h4>Export Products</h4>
                      <p className="text-muted mb-1-5">Download a complete list of your products, prices, and current stock levels.</p>
                      <div className="mt-auto">
                        <button className="btn btn-warning w-100" onClick={handleExportProducts}>Download Excel Report</button>
                      </div>
                    </div>
                    <div className="card stat-card report-card report-card-import-prod">
                      <h4>Import & Update Products</h4>
                      <p className="text-muted mb-1-5">Upload Excel file to add new products or update prices/stock (matches by Product ID or Name).</p>
                      <div className="mt-auto">
                        <input type="file" id="excel-upload-products" accept=".xlsx, .xls" className="d-none" onChange={handleImportProducts} />
                        <label htmlFor="excel-upload-products" className="btn btn-purple w-100 d-block cursor-pointer">Select Excel File</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: LEDGERS --- */}
          {view === 'ledgers' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title mb-0">Customer Ledgers</h2>
                <input 
                  type="text" 
                  className="form-control header-search" 
                  placeholder="Search customers..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              
              <div className="dashboard-stats-grid single-col ledger-stats-container">
                <div className="card stat-card ledger-stats-card">
                  <h4>Total Outstanding Market Dues</h4>
                  <div className="text-danger fw-bold fs-xxl mt-auto">
                    {formatMoney(customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0))}
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Contact</th>
                      <th>Location</th>
                      <th>Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map(c => (
                      <tr key={c.id} className="product-row available" onClick={() => {
                        setViewingCustomerStatement(c);
                        setView('ledger-statement');
                      }}>
                        <td className="fw-bold cell-padded">{c.name}</td>
                        <td className="cell-padded">{c.mobile || 'N/A'}</td>
                        <td className="cell-padded">{c.location || c.city || 'N/A'}</td>
                        <td className={`fw-bold cell-padded ${c.balance > 0 ? 'text-danger' : (c.balance < 0 ? 'text-success' : 'text-muted')}`}>
                          {formatMoney(Math.abs(c.balance))} {c.balance > 0 ? '(Due)' : (c.balance < 0 ? '(Advance)' : '')}
                        </td>
                      </tr>
                    ))}
                    {paginatedCustomers.length === 0 && (
                      <tr><td colSpan={4} className="empty-state">No customers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredCustomers.length)}
            </div>
          )}

          {/* 🚀 NEW FULL PAGE: SIDE-BY-SIDE SPLIT LEDGER STATEMENT */}
          {view === 'ledger-statement' && viewingCustomerStatement && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Statement of Account</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search ref, method..." 
                    value={ledgerSearchQuery} 
                    onChange={e => setLedgerSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                  <button className="btn btn-secondary" onClick={() => { setViewingCustomerStatement(null); setLedgerPreview(null); setView('ledgers'); }}>
                    Back to Ledgers
                  </button>
                </div>
              </div>
              
              <div className="invoice-summary-grid mt-1 invoice-summary-bg">
                <div className="info-block">
                  <span className="info-label">Customer Name</span>
                  <strong className="info-value text-primary fs-xxl">{viewingCustomerStatement.name}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Contact / Location</span>
                  <strong className="info-value fs-lg">{viewingCustomerStatement.mobile || 'N/A'} <br/> {viewingCustomerStatement.city || viewingCustomerStatement.location || ''}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Total Outstanding Balance</span>
                  <strong className={`info-value fs-xxl ${viewingCustomerStatement.balance > 0 ? 'text-danger' : 'text-success'}`}>
                    {formatMoney(viewingCustomerStatement.balance)}
                  </strong>
                </div>
              </div>

              {/* Side-by-Side Flex Layout */}
              <div className="ledger-split-layout">
                
                {/* LEFT SIDE: Ledger Table */}
                <div className="ledger-table-container">
                  <div className="ledger-table-wrapper">
                    <table className="ledger-strict-table w-100-min">
                      <thead>
                        <tr>
                          <th className="col-12">Date</th>
                          <th className="col-18">Particulars</th>
                          <th className="col-15">Ref No.</th>
                          <th className="col-10">Method</th>
                          <th className="right-align col-15">Bill Amount (+)</th>
                          <th className="right-align col-15">Paid Amount (-)</th>
                          <th className="right-align col-15">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomerStatementData.length ? filteredCustomerStatementData.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={`product-row available ${row.isCashTx ? 'ledger-row-neutral' : ''}`} 
                            onClick={() => handleLedgerRowClick(row)}
                            title="Click to view details"
                          >
                            <td className="fw-bold cell-padded">{row.sortDate.toLocaleDateString('en-GB')}</td>
                            <td className="cell-padded">
                              <span className={`badge ${row.type === 'Payment Received' ? 'btn-success text-white' : (row.type === 'Sale Return' ? 'btn-danger text-white' : 'bg-slate-200')}`}>
                                {row.type}
                              </span>
                            </td>
                            <td className="font-monospace text-muted cell-padded">{row.ref}</td>
                            <td className="cell-padded">{row.method}</td>
                            
                            <td className="right-align fw-bold cell-padded" style={{color: row.debit > 0 ? '#ef4444' : '#94a3b8'}}>
                              {row.debit > 0 ? formatMoney(row.debit) : '-'}
                            </td>
                            
                            <td className="right-align fw-bold cell-padded" style={{color: row.credit > 0 ? '#10b981' : '#94a3b8'}}>
                              {row.credit > 0 ? formatMoney(row.credit) : '-'}
                            </td>
                            
                            <td className="right-align fw-bold fs-lg cell-padded">
                              <span className="text-dark-blue">{formatMoney(Math.abs(row.runningBalance))}</span>
                              <span className={row.runningBalance > 0 ? 'text-dr' : (row.runningBalance < 0 ? 'text-cr' : '')}>
                                {row.runningBalance > 0 ? ' Dr' : (row.runningBalance < 0 ? ' Cr' : '')}
                              </span>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} className="empty-state">No transaction history found for this date range/search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-1-5">
                    <div className="text-muted fs-sm">* Cash transactions show matching Bill & Paid amounts on the same row because they do not change the total outstanding ledger balance. Click any row to preview the full document.</div>
                  </div>
                </div>

                {/* RIGHT SIDE: Instant Sticky Document Preview */}
                {ledgerPreview && (
                  <div className="ledger-preview-sidebar card">
                    <div className="card-header header-actions border-none p-0 mb-1">
                      <h3 className="modal-header-title text-slate mb-0 fs-xl">
                        {ledgerPreview.type === 'receipt' ? 'Payment Receipt' : 'Bill Document'}
                      </h3>
                      <button onClick={() => setLedgerPreview(null)} className="btn btn-secondary btn-sm">Close</button>
                    </div>
                    
                    {ledgerPreview.type === 'receipt' ? (
                      <div className="receipt-panel bg-white receipt-preview-panel">
                        <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                          <div className="info-block">
                            <span className="info-label">Receipt ID</span>
                            <strong className="info-value">{formatReceiptId(ledgerPreview.data.id)}</strong>
                          </div>
                          <div className="info-block mt-1">
                            <span className="info-label">Date</span>
                            <strong className="info-value">{new Date(ledgerPreview.data.receiptDate).toLocaleDateString('en-GB')}</strong>
                          </div>
                          <div className="info-block mt-1">
                            <span className="info-label">Amount Paid</span>
                            <strong className="info-value fs-xxl text-success">{formatMoney(ledgerPreview.data.amount)}</strong>
                          </div>
                          {ledgerPreview.data.discountAmount > 0 && (
                            <div className="info-block mt-1">
                              <span className="info-label">Less (Discount)</span>
                              <strong className="info-value fs-lg text-danger">- {formatMoney(ledgerPreview.data.discountAmount)}</strong>
                            </div>
                          )}
                          <div className="info-block mt-1">
                            <span className="info-label">Payment Mode</span>
                            <strong className="info-value text-slate">{ledgerPreview.data.paymentMode}</strong>
                          </div>
                          <div className="info-block mt-1">
                            <span className="info-label">Remarks</span>
                            <strong className="info-value text-slate">{ledgerPreview.data.remarks || 'N/A'}</strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="invoice-summary-grid single-col-grid mb-1 p-1 mb-2-bg">
                          <div className="info-block">
                            <span className="info-label">Bill ID</span>
                            <strong className="info-value">{formatInvoiceId(ledgerPreview.data.id)}</strong>
                          </div>
                          <div className="info-block mt-1">
                            <span className="info-label">Date</span>
                            <strong className="info-value">{new Date(ledgerPreview.data.orderDate || ledgerPreview.data.purchaseDate).toLocaleDateString('en-GB')}</strong>
                          </div>
                        </div>
                        
                        <h4 className="section-title-spacing fs-sm text-muted">Items List</h4>
                        <div className="table-responsive preview-table-scroll-lg">
                          <table className="data-table mb-0 border-none">
                            <thead className="sticky-th-light">
                              <tr><th>Product</th><th>Qty</th><th className="text-right">Price</th></tr>
                            </thead>
                            <tbody>
                              {ledgerPreview.data.items?.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.product?.name || 'Unknown'}</td>
                                  <td className="fw-bold">{item.quantity}</td>
                                  <td className="text-right">{formatMoney(item.price || item.purchasePrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Bill Summary injected inside the Ledger Sidebar Preview */}
                        <div className="receipt-panel receipt-summary-box">
                          <div className="receipt-row receipt-three-col mb-0-5">
                            <span className="fw-bold text-muted">Subtotal:</span>
                            <span className="text-right text-muted">{formatMoney(ledgerPreview.data.grossTotal || ledgerPreview.data.totalAmount)}</span>
                          </div>
                          {ledgerPreview.data.discountPercent > 0 && (
                            <div className="receipt-row receipt-three-col mb-0-5">
                              <span className="fw-bold text-muted">Discount ({ledgerPreview.data.discountPercent}%):</span>
                              <span className="text-right text-danger">-{formatMoney((ledgerPreview.data.grossTotal || 0) * (ledgerPreview.data.discountPercent / 100))}</span>
                            </div>
                          )}
                          {(ledgerPreview.data.cgst > 0 || ledgerPreview.data.sgst > 0) && (
                            <div className="receipt-row receipt-three-col mb-0-5">
                              <span className="fw-bold text-muted">Tax (CGST+SGST):</span>
                              <span className="text-right text-muted">+{formatMoney((ledgerPreview.data.cgst || 0) + (ledgerPreview.data.sgst || 0))}</span>
                            </div>
                          )}
                          <div className="receipt-total receipt-three-col border-top-light">
                            <span className="fw-bold">Final Total:</span>
                            <span className={`text-right fw-bold fs-lg ${ledgerPreview.isReturn ? 'text-danger' : 'text-success'}`}>
                              {formatMoney(ledgerPreview.data.finalTotal || ledgerPreview.data.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: RECEIPTS GENERATOR --- */}
          {view === 'receipts' && (
            <div className="card bg-transparent">
              <div className="reports-layout">
                {/* Receipt Form Column */}
                <div className="card mb-0">
                  <div className="card-header">
                    <h2 className="card-title">Generate Receipt</h2>
                  </div>
                  <div className="form-group mt-1">
                    <label className="form-label">Select Customer:</label>
                    <div className="dropdown-container">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search customer name or phone..."
                        value={receiptSearch}
                        onFocus={() => setIsReceiptDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsReceiptDropdownOpen(false), 200)}
                        onChange={e => { 
                          setReceiptSearch(e.target.value)
                          setIsReceiptDropdownOpen(true)
                          setReceiptCustomer(null) 
                        }}
                      />
                      {isReceiptDropdownOpen && (
                        <ul className="dropdown-menu">
                          {receiptFilteredCustomers.length > 0 ? receiptFilteredCustomers.map(c => (
                            <li key={c.id} className="dropdown-item" onMouseDown={() => { 
                              setReceiptCustomer(c)
                              setReceiptSearch(c.name)
                              setIsReceiptDropdownOpen(false) 
                            }}>
                              <span className="fw-bold">{c.name}</span>
                              <span className="dropdown-location">
                                {c.balance > 0 ? ` (Due: ${formatMoney(c.balance)})` : ''}
                              </span>
                            </li>
                          )) : <li className="dropdown-empty">No customers found</li>}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Receipt Date:</label>
                    <input
                      type="date" className="form-control"
                      value={receiptDate} onChange={e => setReceiptDate(e.target.value)}
                    />
                  </div>

                  <div className="sales-control-row sales-control-row-transparent">
                    <div className="form-group w-100">
                      <label className="form-label">Amount Received (₹):</label>
                      <input
                        type="number" className="form-control fs-xl fw-bold text-success"
                        value={receiptAmount} onChange={e => setReceiptAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="form-group w-100">
                      <label className="form-label">Discount / Less (₹):</label>
                      <input
                        type="number" className="form-control fs-xl fw-bold text-danger"
                        value={receiptDiscount} onChange={e => setReceiptDiscount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode:</label>
                    <select className="form-control" value={receiptMethod} onChange={e => setReceiptMethod(e.target.value)}>
                      <option value="Cash">Cash</option><option value="PhonePe">PhonePe</option><option value="GPay">GPay</option>
                      <option value="Cheque">Cheque</option><option value="Bank Transfer">Bank Transfer / NEFT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Remarks / Note:</label>
                    <input
                      type="text" className="form-control"
                      value={receiptRemarks} onChange={e => setReceiptRemarks(e.target.value)}
                    />
                  </div>

                  <button className="btn btn-primary w-100 mt-1-5 fs-lg" onClick={handleGenerateReceipt}>
                    Save & Record Payment
                  </button>
                </div>

                {/* Live Preview Column */}
                <div className="card mb-0 flat-dashed-card">
                  <div className="card-header border-none pb-0">
                    <h3 className="text-center w-100 text-slate mb-0">Live Receipt Preview</h3>
                  </div>
                  <div className="receipt-panel shadow-panel">
                    <div className="text-center border-bottom-padded mb-1-5">
                      <h2 className="mb-0 text-slate">PAYMENT RECEIPT</h2>
                      <p className="text-muted mt-1 mb-0">{new Date(receiptDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    
                    <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                      <div className="info-block">
                        <span className="info-label">Received From</span>
                        <strong className="info-value fs-xl text-primary">{receiptCustomer ? receiptCustomer.name : '__________________'}</strong>
                      </div>
                      <div className="info-block mt-1">
                        <span className="info-label">Amount Received</span>
                        <strong className="info-value fs-xxl text-success">
                          {receiptAmount ? formatMoney(receiptAmount) : '₹ 0.00'}
                        </strong>
                      </div>
                      {receiptDiscount > 0 && (
                        <div className="info-block mt-1">
                          <span className="info-label">Less (Discount)</span>
                          <strong className="info-value fs-lg text-danger">
                            - {formatMoney(receiptDiscount)}
                          </strong>
                        </div>
                      )}
                      <div className="info-block mt-1">
                        <span className="info-label">Total Settled on Ledger</span>
                        <strong className="info-value fs-xl text-slate">
                          {formatMoney(Number(receiptAmount) + Number(receiptDiscount))}
                        </strong>
                      </div>
                      <div className="info-block mt-1">
                        <span className="info-label">Payment Mode</span>
                        <strong className="info-value text-slate">{receiptMethod}</strong>
                      </div>
                    </div>

                    <div className="receipt-total receipt-three-col mt-2">
                      <span className="fs-sm text-muted fw-normal">* Computer generated receipt</span>
                      <span className="text-right fs-lg text-slate">Authorized Signatory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: RECEIPTS MASTER LIST --- */}
          {view === 'receipts-list' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Master Receipts List</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search Customer or ID..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Receipt ID</th>
                      <th>Date</th>
                      <th>Customer Name</th>
                      <th>Amount Received</th>
                      <th>Less (Discount)</th>
                      <th>Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReceipts.length ? paginatedReceipts.map(rec => (
                      <tr 
                        key={rec.id} 
                        className="product-row available" 
                        onClick={() => setViewingReceipt(rec)} 
                        title="Click to view receipt document"
                      >
                        <td className="fw-bold cell-padded">{formatReceiptId(rec.id)}</td>
                        <td className="cell-padded">{new Date(rec.receiptDate).toLocaleDateString('en-GB')}</td>
                        <td className="fw-bold cell-padded">{rec.customerName}</td>
                        <td className="price-text text-success fw-bold fs-lg cell-padded">
                          {formatMoney(rec.amount)}
                        </td>
                        <td className="cell-padded text-danger fw-bold">
                          {rec.discountAmount > 0 ? formatMoney(rec.discountAmount) : '-'}
                        </td>
                        <td className="cell-padded">
                          <span className="badge">{rec.paymentMode}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="empty-state">No receipts found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredReceipts.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: NEW PURCHASE ENTRY --- */}
          {view === 'purchase-new' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">{editingPurchaseInvoiceId ? 'Edit Purchase Invoice' : 'New Vendor Purchase'}</h2>
              </div>
              <div className="sales-control-row mt-1 mb-1-5">
                <div className="input-group">
                  <label>Seller / Vendor Name</label>
                  <div className="dropdown-container">
                    <input
                      type="text" className="form-control mb-0" placeholder="Enter or select seller..."
                      value={purchaseSellerName}
                      onFocus={() => setIsSellerDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsSellerDropdownOpen(false), 200)}
                      onChange={e => { setPurchaseSellerName(e.target.value); setIsSellerDropdownOpen(true); }}
                    />
                    {isSellerDropdownOpen && (
                      <ul className="dropdown-menu">
                        {dropdownFilteredSellers.length > 0 ? dropdownFilteredSellers.map((seller, idx) => (
                          <li key={idx} className="dropdown-item fw-bold" onMouseDown={() => { setPurchaseSellerName(seller); setIsSellerDropdownOpen(false); }}>
                            {seller}
                          </li>
                        )) : <li className="dropdown-empty">Type to add new seller</li>}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="input-group">
                  <label>Bill/Invoice Number</label>
                  <input type="text" className="form-control mb-0" placeholder="e.g. INV-2026-99" value={customInvoiceId} onChange={e => setCustomInvoiceId(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Date of Purchase</label>
                  <input type="date" className="form-control mb-0" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
                <div className="action-buttons-right mt-auto">
                  <button className="btn btn-primary" onClick={() => { setSearchQuery(''); setShowAddPurchaseProductModal(true); }}>+ Add Products</button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr><th>S.No</th><th>Product</th><th>Buy Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {purchaseCart.length ? purchaseCart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold">{idx + 1}</td>
                        <td><span className="product-name-large">{item.name}</span></td>
                        <td>
                          <input type="number" className="form-control mb-0 w-100" min="0" step="0.01" value={item.purchasePrice} onChange={e => updatePurchasePrice(idx, Number(e.target.value))} />
                        </td>
                        <td>
                          <input type="number" className="quantity-input form-control mb-0 qty-input-large" min="1" value={item.quantity} onChange={e => updatePurchaseQuantity(idx, e.target.value)} onBlur={e => { if (e.target.value === '' || Number(e.target.value) < 1) updatePurchaseQuantity(idx, 1); }} />
                        </td>
                        <td className="price-text text-warning">{formatMoney((item.purchasePrice || 0) * (Number(item.quantity) || 0))}</td>
                        <td><button className="btn btn-danger" onClick={() => removePurchaseCartItem(idx)}>Remove</button></td>
                      </tr>
                    )) : <tr><td colSpan={6} className="empty-state">Purchase cart is empty.</td></tr>}
                  </tbody>
                </table>
              </div>
              {purchaseCart.length > 0 && (
                <div className="modal-actions mt-2">
                  <button className="btn btn-secondary p-1" onClick={cancelPurchase}>Cancel Purchase</button>
                  <button className="btn btn-success p-1" onClick={proceedToPurchaseSummary}>Proceed to Summary</button>
                </div>
              )}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: PURCHASE SUMMARY/PAYMENT --- */}
          {view === 'purchase-summary-screen' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">Purchase Summary</h2>
                <button className="btn btn-secondary action-buttons-right" onClick={() => setView('purchase-new')}>Back to Edit</button>
              </div>
              
              <div className="invoice-summary-grid margin-top-large">
                <div className="info-block">
                  <span className="info-label">Seller Name</span>
                  <strong className="info-value">{purchaseSellerName}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Invoice Number</span>
                  <strong className="info-value">{customInvoiceId}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Purchase Date</span>
                  <strong className="info-value">{new Date(purchaseDate).toLocaleDateString()}</strong>
                </div>
              </div>

              <div className="receipt-wrapper mt-2">
                <div className="receipt-panel full-width-panel">
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Subtotal:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right">{formatMoney(purchaseBillingDetails.subtotal)}</span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Discount:</span>
                    <div className="input-with-symbol">
                      <input type="number" min="0" max="100" value={purchaseDiscountPercent} onChange={e => setPurchaseDiscountPercent(Number(e.target.value))} className="form-control discount-input" />
                      <span className="text-muted">%</span>
                    </div>
                    <span className="text-right text-danger">-{formatMoney(purchaseBillingDetails.discountAmount)}</span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Tax:</span>
                    <div className="input-with-symbol">
                      <input type="number" min="0" max="100" value={purchaseTaxPercent} onChange={e => setPurchaseTaxPercent(Number(e.target.value))} className="form-control discount-input" />
                      <span className="text-muted">%</span>
                    </div>
                    <span className="text-right"></span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span>
                    <span className="text-right">{formatMoney(purchaseBillingDetails.taxableAmount)}</span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">CGST:</span>
                    <span className="text-center text-muted">{purchaseBillingDetails.cgstPercent.toFixed(1).replace('.0', '')}%</span>
                    <span className="text-right">+{formatMoney(purchaseBillingDetails.cgst)}</span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">SGST:</span>
                    <span className="text-center text-muted">{purchaseBillingDetails.sgstPercent.toFixed(1).replace('.0', '')}%</span>
                    <span className="text-right">+{formatMoney(purchaseBillingDetails.sgst)}</span>
                  </div>
                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span>
                    <span className="text-right">{purchaseBillingDetails.roundoff > 0 ? '+' : ''}{formatMoney(purchaseBillingDetails.roundoff)}</span>
                  </div>
                  <div className="receipt-total receipt-three-col">
                    <span>Final Total:</span><span className="text-center text-muted"></span>
                    <span className="text-success text-right">{formatMoney(purchaseBillingDetails.finalTotal)}</span>
                  </div>
                  <button className="btn btn-success btn-checkout" onClick={submitPurchaseCart}>
                    {editingPurchaseInvoiceId ? 'Update Purchase Invoice' : 'Confirm & Save Purchase'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: PURCHASES MASTER LIST --- */}
          {view === 'purchases-list' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Purchase List</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search by Seller or ID..." 
                    value={purchaseSearchQuery} 
                    onChange={e => setPurchaseSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr><th>System ID</th><th>Seller Name</th><th>Vendor Bill No</th><th>Total Amount</th><th>Date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {paginatedPurchaseInvoices.length ? paginatedPurchaseInvoices.map(invoice => (
                      <tr key={invoice.id} className="product-row available" onClick={(e) => { if (e.target.tagName !== 'BUTTON') handleViewPurchaseInvoiceDetails(invoice.id); }}>
                        <td className="fw-bold cell-padded">{formatPurchaseInvoiceId(invoice.id)}</td>
                        <td className="cell-padded">{invoice.sellerName}</td>
                        <td className="cell-padded">{invoice.customInvoiceId || 'N/A'}</td>
                        <td className="price-text fw-bold cell-padded">{formatMoney(invoice.finalTotal)}</td>
                        <td className="cell-padded">{new Date(invoice.purchaseDate).toLocaleDateString('en-GB')}</td>
                        <td className="cell-padded">
                          <button className="btn btn-warning" onClick={(e) => { e.stopPropagation(); handleEditPurchase(invoice); }}>Edit</button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={6} className="empty-state">No purchases found for this date range.</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredPurchaseInvoices.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: PURCHASE INVOICE DETAILS --- */}
          {view === 'purchase-invoice-details' && selectedPurchaseInvoice && selectedPurchaseInvoiceMath && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">Purchase {formatPurchaseInvoiceId(selectedPurchaseInvoice.id)} Details</h2>
                <button className="btn btn-secondary action-buttons-right" onClick={() => { setSelectedPurchaseInvoice(null); setView('purchases-list'); }}>Back to Purchases</button>
              </div>
              
              <div className="invoice-summary-grid margin-top-large">
                <div className="info-block">
                  <span className="info-label">Seller Name</span>
                  <strong className="info-value">{selectedPurchaseInvoice.sellerName}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Vendor Bill No</span>
                  <strong className="info-value">{selectedPurchaseInvoice.customInvoiceId || 'N/A'}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Purchase Date</span>
                  <strong className="info-value">{new Date(selectedPurchaseInvoice.purchaseDate).toLocaleDateString('en-GB')}</strong>
                </div>
              </div>
              
              <h4 className="section-title-spacing">Items Received</h4>
              
              <div className="table-responsive table-margin-bottom">
                <table className="data-table">
                  <thead>
                    <tr><th>S.No</th><th>Product</th><th>Buy Price</th><th>Qty</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {selectedPurchaseInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold">{idx + 1}</td>
                        <td><span className="product-name-large">{item.product.name}</span></td>
                        <td>{formatMoney(item.purchasePrice)}</td>
                        <td className="fw-bold fs-lg">{item.quantity}</td>
                        <td className="price-text text-warning">{formatMoney(item.purchasePrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="invoice-math-wrapper">
                <div className="receipt-panel full-width-panel">
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Subtotal:</span><span className="text-center text-muted"></span>
                    <span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.subtotal)}</span>
                  </div>
                  {selectedPurchaseInvoiceMath.discountPercent > 0 && (
                    <div className="receipt-row receipt-three-col highlight-red">
                      <span className="fw-bold">Discount:</span>
                      <span className="text-center text-muted">{selectedPurchaseInvoiceMath.discountPercent}%</span>
                      <span className="text-right text-danger">-{formatMoney(selectedPurchaseInvoiceMath.discountAmount)}</span>
                    </div>
                  )}
                  {selectedPurchaseInvoiceMath.totalTaxPercent > 0 && (
                    <>
                      <div className="receipt-row receipt-three-col">
                        <span className="fw-bold">Total Tax:</span>
                        <span className="text-center text-muted">{selectedPurchaseInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%</span>
                        <span className="text-right"></span>
                      </div>
                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span>
                        <span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.taxableAmount)}</span>
                      </div>
                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">CGST:</span>
                        <span className="text-center text-muted">{selectedPurchaseInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%</span>
                        <span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.cgst)}</span>
                      </div>
                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">SGST:</span>
                        <span className="text-center text-muted">{selectedPurchaseInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%</span>
                        <span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.sgst)}</span>
                      </div>
                    </>
                  )}
                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span>
                    <span className="text-right">{selectedPurchaseInvoiceMath.roundoff > 0 ? '+' : ''}{formatMoney(selectedPurchaseInvoiceMath.roundoff)}</span>
                  </div>
                  <div className="receipt-total receipt-three-col">
                    <span>Final Total:</span><span className="text-center text-muted"></span>
                    <span className="fw-bold text-right text-success">{formatMoney(selectedPurchaseInvoiceMath.finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: MULTI-TAB SALES MARKETPLACE --- */}
          {view === 'list' && (
            <div>
              <div className="tabs-container">
                {salesTabs.map(tab => (
                  <div key={tab.id} className={`tab-button ${tab.id === activeTabId ? 'active' : ''}`} onClick={() => setActiveTabId(tab.id)}>
                    {tab.title}
                    <button className="tab-close" onClick={(e) => closeTab(tab.id, e)}>✕</button>
                  </div>
                ))}
                <button className="tab-add" onClick={() => openNewTab()} title="Open new sale tab">+</button>
              </div>

              <div className="tab-content-panel">
                <div className="sales-control-panel flat-panel">
                  <div className="cancel-btn-wrapper">
                    <button className="btn btn-warning btn-sm" onClick={saveToDrafts}>
                      ⤓ Save to Drafts
                    </button>
                  </div>
                  <div className="sales-control-row">
                    <div className="input-group customer-dropdown-group">
                      <label>Select Customer</label>
                      <div className="dropdown-container">
                        <input
                          type="text"
                          className={`form-control mb-0 ${!activeTab.activeCustomer ? 'customer-input-warning' : ''}`}
                          placeholder="Search or select customer..."
                          value={activeTab.customerSearch}
                          onFocus={() => updateActiveTab({ isDropdownOpen: true })}
                          onBlur={() => setTimeout(() => updateActiveTab({ isDropdownOpen: false }), 200)}
                          onChange={e => updateActiveTab({ customerSearch: e.target.value, isDropdownOpen: true, activeCustomer: null })}
                        />
                        {activeTab.isDropdownOpen && (
                          <ul className="dropdown-menu">
                            {dropdownFilteredCustomers.length > 0 ? dropdownFilteredCustomers.map(c => (
                              <li key={c.id} className="dropdown-item" onMouseDown={() => updateActiveTab({ activeCustomer: c, customerSearch: c.name, isDropdownOpen: false })}>
                                <span className="fw-bold">{c.name}</span>
                                {(c.location || c.city) && <span className="dropdown-location">- {[c.location, c.city].filter(Boolean).join(', ')}</span>}
                              </li>
                            )) : <li className="dropdown-empty">No customers found</li>}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="action-buttons-right">
                      <button className="btn btn-primary" onClick={() => { setSearchQuery(''); setShowAddProductModal(true); }}>
                        + Add Products
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card flat-panel-card">
                  <div className="card-header header-actions">
                    <h2 className="card-title">
                      {activeTab.editingInvoiceId ? `Editing Sale ${formatInvoiceId(activeTab.editingInvoiceId)}` : 'Cart'} - {activeTab.activeCustomer ? activeTab.activeCustomer.name : <span className="text-danger">No Customer Selected</span>}
                    </h2>
                  </div>
                  
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr><th>S.No</th><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {activeTab.cart.length ? activeTab.cart.map((item, idx) => (
                          <tr key={`${item.id}-${idx}`}>
                            <td className="fw-bold">{idx + 1}</td>
                            <td><span className="product-name-large">{item.name}</span></td>
                            <td>{formatMoney(item.price)}</td>
                            <td>
                              <input
                                type="number"
                                className="quantity-input form-control mb-0 qty-input-large"
                                min="1"
                                max={item.stock}
                                value={item.quantity}
                                onChange={e => updateQuantity(idx, e.target.value)}
                                onBlur={e => { if (e.target.value === '' || Number(e.target.value) < 1) updateQuantity(idx, 1); }}
                              />
                              {activeTab.editingInvoiceId && item.originalQuantity !== undefined && (
                                <div className="text-muted fs-sm mt-1">Previous: {item.originalQuantity}</div>
                              )}
                            </td>
                            <td className="price-text">{formatMoney(item.price * (Number(item.quantity) || 0))}</td>
                            <td><button className="btn btn-danger" onClick={() => removeCartItem(idx)}>Remove</button></td>
                          </tr>
                        )) : <tr><td colSpan={6} className="empty-state">Cart is empty. Click "+ Add Products" to begin.</td></tr>}
                      </tbody>
                    </table>
                  </div>

                  {activeTab.cart.length > 0 && (
                    <div className="receipt-wrapper">
                      <div className="receipt-panel full-width-panel">
                        <h3 className="receipt-header">Bill Summary</h3>
                        <div className="receipt-summary-header">
                          <span className="fw-bold text-slate">Total Items: {activeTab.cart.length}</span>
                          <span className="fw-bold text-slate">Total Qty: {activeTab.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="fw-bold">Subtotal:</span>
                          <span className="text-center text-muted"></span>
                          <span className="text-right">{formatMoney(activeBillingDetails.subtotal)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="fw-bold">Discount:</span>
                          <div className="input-with-symbol">
                            <input type="number" min="0" max="100" value={activeTab.discountPercent} onChange={e => updateActiveTab({ discountPercent: Number(e.target.value) })} className="form-control discount-input" />
                            <span className="text-muted">%</span>
                          </div>
                          <span className="text-right text-danger">-{formatMoney(activeBillingDetails.discountAmount)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="fw-bold">Total Tax:</span>
                          <div className="input-with-symbol">
                            <input type="number" min="0" max="100" value={activeTab.taxPercent} onChange={e => updateActiveTab({ taxPercent: Number(e.target.value) })} className="form-control discount-input" />
                            <span className="text-muted">%</span>
                          </div>
                          <span className="text-right"></span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span>
                          <span className="text-right">{formatMoney(activeBillingDetails.taxableAmount)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="text-muted">CGST:</span>
                          <span className="text-center text-muted">{activeBillingDetails.cgstPercent.toFixed(1).replace('.0', '')}%</span>
                          <span className="text-right">+{formatMoney(activeBillingDetails.cgst)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="text-muted">SGST:</span>
                          <span className="text-center text-muted">{activeBillingDetails.sgstPercent.toFixed(1).replace('.0', '')}%</span>
                          <span className="text-right">+{formatMoney(activeBillingDetails.sgst)}</span>
                        </div>
                        <div className="receipt-row receipt-three-col">
                          <span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span>
                          <span className="text-right">{activeBillingDetails.roundoff > 0 ? '+' : ''}{formatMoney(activeBillingDetails.roundoff)}</span>
                        </div>
                        <div className="receipt-total receipt-three-col">
                          <span>Final Total:</span><span className="text-center text-muted"></span>
                          <span className="text-success text-right">{formatMoney(activeBillingDetails.finalTotal)}</span>
                        </div>
                        <button className="btn btn-success btn-checkout" onClick={proceedToPayment}>Proceed to Payment</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: DRAFTS LIST --- */}
          {view === 'drafts-list' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title mb-0">Saved Drafts ({drafts.length})</h2>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Saved On</th>
                      <th>Draft Name</th>
                      <th>Items</th>
                      <th>Customer Selected</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.length ? drafts.map(draft => (
                      <tr key={draft.draftId} className="product-row available">
                        <td className="cell-padded">{new Date(draft.savedAt).toLocaleString()}</td>
                        <td className="fw-bold cell-padded">{draft.draftName}</td>
                        <td className="cell-padded">{draft.cart.length} item(s)</td>
                        <td className="cell-padded">{draft.activeCustomer ? draft.activeCustomer.name : <span className="text-muted">None</span>}</td>
                        <td className="cell-padded">
                          <div className="btn-group">
                            <button className="btn btn-primary" onClick={() => resumeDraft(draft)}>Resume Sale</button>
                            <button className="btn btn-danger" onClick={() => deleteDraft(draft.draftId)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={5} className="empty-state">No saved drafts found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: NEW PAYMENT / CHECKOUT PAGE --- */}
          {view === 'payment-screen' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Checkout & Payment - {activeTab.activeCustomer ? activeTab.activeCustomer.name : 'Customer'}
                </h2>
                <button className="btn btn-secondary action-buttons-right" onClick={() => setView('list')}>Back to Cart</button>
              </div>
              <div className="form-container payment-container">
                <div className="form-group">
                  <label className="form-label">Date of Sale:</label>
                  <input
                    type="date" className="form-control payment-input"
                    value={activeTab.saleDate}
                    onChange={e => updateActiveTab({ saleDate: e.target.value })}
                    disabled={!!activeTab.editingInvoiceId} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Final Payable Amount:</label>
                  <input type="text" className="form-control fw-bold price-text fs-xxl" value={`${formatMoney(activeBillingDetails.finalTotal)}`} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method:</label>
                  <div className="payment-method-row">
                    <select 
                      className={`form-control mb-0 payment-input pay-later-select ${activeTab.isPayLater ? 'pay-later-disabled' : 'pay-later-active'}`} 
                      value={activeTab.paymentMethod} 
                      onChange={e => updateActiveTab({ paymentMethod: e.target.value })}
                      disabled={activeTab.isPayLater}
                    >
                      <option value="Cash">Cash</option><option value="PhonePe">PhonePe</option><option value="GPay">GPay</option>
                      <option value="Cheque">Cheque</option><option value="DD">DD</option><option value="Debit Card">Debit Card</option><option value="Credit Card">Credit Card</option>
                    </select>
                    <button 
                      className={`btn btn-pay-later ${activeTab.isPayLater ? 'btn-warning' : 'btn-secondary'}`}
                      onClick={() => updateActiveTab({ isPayLater: !activeTab.isPayLater })} type="button"
                    >
                      {activeTab.isPayLater ? '✓ Marked as Unpaid' : 'Pay Later (Khata)'}
                    </button>
                  </div>
                  {activeTab.isPayLater && <div className="pay-later-warning">* This bill will be recorded as an unpaid balance.</div>}
                </div>
                <div className="modal-actions payment-actions">
                  <button className={`btn btn-checkout ${activeTab.isPayLater ? 'btn-warning' : 'btn-success'}`} onClick={submitFinalSale}>
                    {activeTab.editingInvoiceId ? 'Save Edits' : 'Complete & Save Sale'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: OUTBOUND REVENUE HISTORY --- */}
          {view === 'invoices' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Sales List</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search by Bill ID or Customer..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Customer Name</th>
                      <th>Payment Method</th>
                      <th>Final Total</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.length ? paginatedInvoices.map(invoice => (
                      <tr 
                        key={invoice.id} 
                        className="product-row available"
                        onClick={(e) => {
                          if (e.target.tagName !== 'BUTTON') {
                            handleViewInvoiceDetails(invoice.id);
                          }
                        }}
                      >
                        <td className="fw-bold cell-padded">{formatInvoiceId(invoice.id)}</td>
                        <td className="cell-padded">{invoice.customerName}</td>
                        <td className={`fw-bold cell-padded ${invoice.paymentMethod === 'Pay Later' ? 'text-warning' : ''}`}>
                          {invoice.paymentMethod || 'Cash'}
                        </td>
                        <td className={`price-text fw-bold cell-padded ${invoice.isReturn ? 'text-danger' : 'text-success'}`}>
                          {formatMoney(invoice.finalTotal || invoice.totalAmount)}
                        </td>
                        <td className="cell-padded">{new Date(invoice.orderDate).toLocaleDateString('en-GB')}</td>
                        <td className="cell-padded">
                          <div className="btn-group">
                            {!invoice.isReturn && (
                              <>
                                <button 
                                  className="btn btn-warning" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleEditSale(invoice); 
                                  }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleInitiateReturn(invoice); 
                                  }}
                                >
                                  Return
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="empty-state">No sales found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredInvoices.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: EDIT HISTORY LOGS --- */}
          {view === 'edit-history' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Sales Edit History</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search customer or ID..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Edit Date</th>
                      <th>Original Bill ID</th>
                      <th>Customer Name</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoiceHistory.length ? paginatedInvoiceHistory.map(log => (
                      <tr key={log.id} className="product-row available">
                        <td className="cell-padded">{new Date(log.editDate).toLocaleDateString('en-GB')}</td>
                        <td className="fw-bold cell-padded">{formatInvoiceId(log.originalInvoiceId)}</td>
                        <td className="cell-padded">{log.customerName}</td>
                        <td className="cell-padded">
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => {
                              setHistoryCompareData(log);
                              setView('sale-edit-compare');
                            }}
                          >
                            View Comparison
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="empty-state">No edit history found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredInvoiceHistory.length)}
            </div>
          )}

          {/* 🚀 NEW FULL PAGE: SALES EDIT COMPARISON */}
          {view === 'sale-edit-compare' && historyCompareData && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Compare Edits: {formatInvoiceId(historyCompareData.originalInvoiceId)}
                </h2>
                <button 
                  className="btn btn-secondary action-buttons-right" 
                  onClick={() => { setHistoryCompareData(null); setView('edit-history'); }}
                >
                  Back to Edit History
                </button>
              </div>
              <div className="mb-2-bg">
                <span className="fw-bold text-slate">Customer: </span> {historyCompareData.customerName} &nbsp;|&nbsp;
                <span className="fw-bold text-slate"> Edited On: </span> {new Date(historyCompareData.editDate).toLocaleString('en-GB')}
              </div>

              <div className="comparison-grid">
                {/* OLD SNAPSHOT (TINTED RED) */}
                <div className="snapshot-old-wrapper">
                  <h3 className="snapshot-title-old">
                    Old Bill Snapshot
                  </h3>
                  <div className="table-res-old">
                    <table className="data-table comparison-table mb-0 border-none bg-transparent">
                      <thead className="sticky-th-light-no-z">
                        <tr><th className="th-old th-old-tinted">Product</th><th className="th-old th-old-tinted">Qty</th><th className="th-old th-old-tinted">Price</th></tr>
                      </thead>
                      <tbody>
                        {renderHistoryItems(historyCompareData.oldItemsJson)}
                      </tbody>
                    </table>
                  </div>
                  {renderHistorySummary(historyCompareData.oldItemsJson, historyCompareData.oldFinalTotal)}
                </div>

                {/* NEW SNAPSHOT (TINTED GREEN) */}
                <div className="snapshot-new-wrapper">
                  <h3 className="snapshot-title-new">
                    New Bill Snapshot
                  </h3>
                  <div className="table-res-new">
                    <table className="data-table comparison-table mb-0 border-none bg-transparent">
                      <thead className="sticky-th-light-no-z">
                        <tr><th className="th-new th-new-tinted">Product</th><th className="th-new th-new-tinted">Qty</th><th className="th-new th-new-tinted">Price</th></tr>
                      </thead>
                      <tbody>
                        {renderHistoryItems(historyCompareData.newItemsJson)}
                      </tbody>
                    </table>
                  </div>
                  {renderHistorySummary(historyCompareData.newItemsJson, historyCompareData.newFinalTotal)}
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: PURCHASE EDIT HISTORY LOGS --- */}
          {view === 'purchase-edit-history' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Purchase Edit History</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search seller or ID..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Edit Date</th>
                      <th>Original Purchase ID</th>
                      <th>Seller Name</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPurchaseInvoiceHistory.length ? paginatedPurchaseInvoiceHistory.map(log => (
                      <tr key={log.id} className="product-row available">
                        <td className="cell-padded">{new Date(log.editDate).toLocaleDateString('en-GB')}</td>
                        <td className="fw-bold cell-padded">{formatPurchaseInvoiceId(log.originalPurchaseInvoiceId)}</td>
                        <td className="cell-padded">{log.sellerName}</td>
                        <td className="cell-padded">
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => {
                              setHistoryCompareData(log);
                              setView('purchase-edit-compare');
                            }}
                          >
                            View Comparison
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="empty-state">No purchase edit history found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredPurchaseInvoiceHistory.length)}
            </div>
          )}

          {/* 🚀 NEW FULL PAGE: PURCHASE EDIT COMPARISON */}
          {view === 'purchase-edit-compare' && historyCompareData && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Compare Edits: {formatPurchaseInvoiceId(historyCompareData.originalPurchaseInvoiceId)}
                </h2>
                <button 
                  className="btn btn-secondary action-buttons-right" 
                  onClick={() => { setHistoryCompareData(null); setView('purchase-edit-history'); }}
                >
                  Back to Edit History
                </button>
              </div>
              <div className="mb-2-bg">
                <span className="fw-bold text-slate">Seller: </span> {historyCompareData.sellerName} &nbsp;|&nbsp;
                <span className="fw-bold text-slate"> Edited On: </span> {new Date(historyCompareData.editDate).toLocaleString('en-GB')}
              </div>

              <div className="comparison-grid">
                {/* OLD SNAPSHOT (TINTED RED) */}
                <div className="snapshot-old-wrapper">
                  <h3 className="snapshot-title-old">
                    Old Purchase Snapshot
                  </h3>
                  <div className="table-res-old">
                    <table className="data-table comparison-table mb-0 border-none bg-transparent">
                      <thead className="sticky-th-light-no-z">
                        <tr><th className="th-old th-old-tinted">Product</th><th className="th-old th-old-tinted">Qty</th><th className="th-old th-old-tinted">Price</th></tr>
                      </thead>
                      <tbody>
                        {renderHistoryItems(historyCompareData.oldItemsJson)}
                      </tbody>
                    </table>
                  </div>
                  {renderHistorySummary(historyCompareData.oldItemsJson, historyCompareData.oldFinalTotal)}
                </div>

                {/* NEW SNAPSHOT (TINTED GREEN) */}
                <div className="snapshot-new-wrapper">
                  <h3 className="snapshot-title-new">
                    New Purchase Snapshot
                  </h3>
                  <div className="table-res-new">
                    <table className="data-table comparison-table mb-0 border-none bg-transparent">
                      <thead className="sticky-th-light-no-z">
                        <tr><th className="th-new th-new-tinted">Product</th><th className="th-new th-new-tinted">Qty</th><th className="th-new th-new-tinted">Price</th></tr>
                      </thead>
                      <tbody>
                        {renderHistoryItems(historyCompareData.newItemsJson)}
                      </tbody>
                    </table>
                  </div>
                  {renderHistorySummary(historyCompareData.newItemsJson, historyCompareData.newFinalTotal)}
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: INVENTORY HISTORY LOGS --- */}
          {view === 'inventory-history' && (
            <div className="card">
              <div className="card-header header-actions header-actions-wrap">
                <h2 className="card-title mb-0">Inventory Movement History</h2>
                <div className="header-filters-group">
                  <input 
                    type="text" 
                    className="form-control mb-0 search-input-md" 
                    placeholder="Search products or actions..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  {renderDateFilter()}
                </div>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Product</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Qty Changed</th>
                      <th>Final Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventoryHistory.length ? paginatedInventoryHistory.map(log => (
                      <tr key={log.id} className="product-row available">
                        <td className="cell-padded">{new Date(log.timestamp).toLocaleDateString('en-GB')}</td>
                        <td className="fw-bold cell-padded">{log.productName}</td>
                        <td className="cell-padded"><span className="badge">{log.actionType}</span></td>
                        <td className="text-muted cell-padded">{log.description}</td>
                        <td className={`fw-bold cell-padded ${log.quantityChanged > 0 ? 'text-success' : 'text-danger'}`}>
                          {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                        </td>
                        <td className="fw-bold cell-padded">{log.finalStock}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="empty-state">No inventory history found for this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredInventoryHistory.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: RETURN BILL PROCESSOR --- */}
          {view === 'return-sale' && returnSaleData && returnMath && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title text-danger">
                  Process Return: Bill {formatInvoiceId(returnSaleData.id)}
                </h2>
                <button 
                  className="btn btn-secondary action-buttons-right" 
                  onClick={() => { 
                    setReturnSaleData(null)
                    setView('invoices') 
                  }}
                >
                  Cancel Return
                </button>
              </div>

              <div className="invoice-summary-grid margin-top-large">
                <div className="info-block">
                  <span className="info-label">Customer</span>
                  <strong className="info-value">{returnSaleData.customerName}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Original Date</span>
                  <strong className="info-value">{new Date(returnSaleData.orderDate).toLocaleDateString('en-GB')}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Original Total</span>
                  <strong className="info-value text-success">{formatMoney(returnSaleData.finalTotal)}</strong>
                </div>
              </div>

              <div className="table-responsive table-margin-bottom">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Purchased Qty</th>
                      <th>Return Qty</th>
                      <th>Return Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnSaleData.returnItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="product-name-large">
                            {item.product.name}
                          </span>
                        </td>
                        <td>{formatMoney(item.price)}</td>
                        <td className="fw-bold fs-lg">{item.quantity}</td>
                        <td>
                          <input
                            type="number"
                            className="quantity-input form-control mb-0 qty-input-large"
                            min="0"
                            max={item.quantity}
                            value={item.returnQty}
                            onChange={e => {
                              let val = e.target.value;
                              if (val !== '') {
                                val = Number(val);
                                if (val > item.quantity) val = item.quantity;
                                if (val < 0) val = 0;
                              }
                              setReturnSaleData(prev => {
                                const newItems = [...prev.returnItems];
                                newItems[idx].returnQty = val;
                                return { ...prev, returnItems: newItems };
                              });
                            }}
                            onBlur={e => {
                              if (e.target.value === '' || Number(e.target.value) < 0) {
                                setReturnSaleData(prev => {
                                  const newItems = [...prev.returnItems];
                                  newItems[idx].returnQty = 0;
                                  return { ...prev, returnItems: newItems };
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="price-text text-danger fw-bold">
                          -{formatMoney(item.price * (Number(item.returnQty) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="invoice-math-wrapper">
                <div className="receipt-panel full-width-panel border-danger">
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Return Subtotal:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right text-danger">-{formatMoney(returnMath.subtotal)}</span>
                  </div>
                  
                  {returnSaleData.discountPercent > 0 && (
                    <div className="receipt-row receipt-three-col highlight-red">
                      <span className="fw-bold">Return Discount:</span>
                      <span className="text-center text-muted">{returnSaleData.discountPercent}%</span>
                      <span className="text-right text-success">
                        +{formatMoney(returnMath.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Subtotal (Excl. Tax):</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right text-danger">-{formatMoney(returnMath.taxableAmount)}</span>
                  </div>

                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Return CGST / SGST:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right text-danger">
                      -{formatMoney(returnMath.cgst + returnMath.sgst)}
                    </span>
                  </div>

                  <div className="receipt-total receipt-three-col border-top-danger">
                    <span>Total Refund Amount:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right text-danger">-{formatMoney(returnMath.finalTotal)}</span>
                  </div>

                  <div className="modal-actions return-actions">
                    <button 
                      className="btn btn-warning p-1" 
                      onClick={handleReturnAllItems}
                    >
                      Select All Items (Return All)
                    </button>
                    <button 
                      className="btn btn-danger btn-checkout mt-0 flex-1" 
                      onClick={submitReturn}
                      disabled={returnMath.finalTotal === 0}
                    >
                      Confirm & Process Return
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: OUTBOUND INVOICE DETAILS PAGE --- */}
          {view === 'invoice-details' && selectedInvoice && selectedInvoiceMath && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Sale {formatInvoiceId(selectedInvoice.id)} Details
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* PRINT BUTTON */}
                  <button 
                    className="btn btn-primary" 
                    onClick={() => window.print()}
                  >
                    🖨️ Print Bill (A4)
                  </button>
                  <button 
                    className="btn btn-secondary action-buttons-right" 
                    onClick={() => { 
                      setSelectedInvoice(null)
                      setView('invoices') 
                    }}
                  >
                    Back to Sales List
                  </button>
                </div>
              </div>
              
              <div className="invoice-summary-grid margin-top-large">
                <div className="info-block">
                  <span className="info-label">Customer</span>
                  <strong className="info-value">{selectedInvoice.customerName}</strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Payment Method</span>
                  <strong className={`info-value ${selectedInvoice.paymentMethod === 'Pay Later' ? 'text-warning' : 'text-primary'}`}>
                    {selectedInvoice.paymentMethod || 'Cash'}
                  </strong>
                </div>
                <div className="info-block">
                  <span className="info-label">Date</span>
                  <strong className="info-value">{new Date(selectedInvoice.orderDate).toLocaleDateString('en-GB')}</strong>
                </div>
              </div>
              
              <h4 className="section-title-spacing">Items Purchased</h4>
              
              <div className="table-responsive table-margin-bottom">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold">{idx + 1}</td>
                        <td>
                          <span className="product-name-large">
                            {item.product.name}
                          </span>
                        </td>
                        <td>{formatMoney(item.price)}</td>
                        <td className="fw-bold fs-lg">{item.quantity}</td>
                        <td className="price-text">{formatMoney(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="invoice-math-wrapper">
                <div className="receipt-panel full-width-panel">
                  <div className="receipt-row receipt-three-col">
                    <span className="fw-bold">Subtotal:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right">{formatMoney(selectedInvoiceMath.subtotal)}</span>
                  </div>
                  
                  {selectedInvoiceMath.discountPercent > 0 && (
                    <div className="receipt-row receipt-three-col highlight-red">
                      <span className="fw-bold">Discount:</span>
                      <span className="text-center text-muted">{selectedInvoiceMath.discountPercent}%</span>
                      <span className="text-right text-danger">
                        -{formatMoney(selectedInvoiceMath.discountAmount)}
                      </span>
                    </div>
                  )}
                  
                  {selectedInvoiceMath.totalTaxPercent > 0 && (
                    <>
                      <div className="receipt-row receipt-three-col">
                        <span className="fw-bold">Total Tax:</span>
                        <span className="text-center text-muted">
                          {selectedInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%
                        </span>
                        <span className="text-right"></span>
                      </div>

                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">Subtotal (Excl. Tax):</span>
                        <span className="text-center text-muted"></span>
                        <span className="text-right">{formatMoney(selectedInvoiceMath.taxableAmount)}</span>
                      </div>

                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">CGST:</span>
                        <span className="text-center text-muted">
                          {selectedInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%
                        </span>
                        <span className="text-right">+{formatMoney(selectedInvoiceMath.cgst)}</span>
                      </div>
                      
                      <div className="receipt-row receipt-three-col">
                        <span className="text-muted">SGST:</span>
                        <span className="text-center text-muted">
                          {selectedInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%
                        </span>
                        <span className="text-right">+{formatMoney(selectedInvoiceMath.sgst)}</span>
                      </div>
                    </>
                  )}

                  <div className="receipt-row receipt-three-col">
                    <span className="text-muted">Roundoff:</span>
                    <span className="text-center text-muted"></span>
                    <span className="text-right">
                      {selectedInvoiceMath.roundoff > 0 ? '+' : ''}
                      {formatMoney(selectedInvoiceMath.roundoff)}
                    </span>
                  </div>
                  
                  <div className="receipt-total receipt-three-col">
                    <span>Final Total:</span>
                    <span className="text-center text-muted"></span>
                    <span className={`fw-bold text-right ${selectedInvoice.isReturn ? 'text-danger' : 'text-success'}`}>
                      {formatMoney(selectedInvoiceMath.finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => { 
                  setSelectedInvoice(null)
                  setView('invoices') 
                }} 
                className="btn btn-secondary w-100 close-btn-padding"
              >
                Back to Sales List
              </button>
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: MASTER STOCK BALANCE SHEET --- */}
          {view === 'inventory' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title mb-0">Inventory</h2>
                <input 
                  type="text" 
                  className="form-control header-search" 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Product Name</th>
                      <th>HSN Code</th>
                      <th>Current Stock</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length ? paginatedProducts.map((product) => (
                      <tr key={product.id} className="product-row available">
                        <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                        <td className="fw-bold cell-padded">{product.name}</td>
                        <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                        <td className={`fw-bold fs-lg cell-padded ${product.stock > 10 ? 'text-success' : (product.stock > 0 ? 'text-warning' : 'text-danger')}`}>
                          {product.stock} {product.stock <= 0 && '(Out of Stock)'}
                        </td>
                        <td className="cell-padded">
                          <button 
                            className="btn btn-warning" 
                            onClick={() => openInventoryModal(product)}
                          >
                            Update Stock
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="empty-state">No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredProducts.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: CUSTOMER RELATIONSHIP MANAGER --- */}
          {view === 'customers-manage' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title mb-0">Customer Management</h2>
                <input 
                  type="text" 
                  className="form-control header-search search-expanded" 
                  placeholder="Search name, phone, GST, location..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => { 
                    setIsCustomerEditMode(false)
                    setCustomerForm({ 
                      name: '', 
                      gstno: '', 
                      mobile: '', 
                      city: '', 
                      location: '', 
                      state: '' 
                    })
                    setShowCustomerModal(true) 
                  }}
                >
                  + Add New Customer
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer Name</th>
                      <th>Contact</th>
                      <th>Location Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.length ? paginatedCustomers.map((c, index) => (
                      <tr key={c.id} className="product-row available">
                        <td className="cell-padded">{indexOfFirstItem + index + 1}</td>
                        <td className="fw-bold cell-padded">
                          {c.name}
                          {c.gstno && <div className="text-muted fs-sm">GST: {c.gstno}</div>}
                        </td>
                        <td className="cell-padded">{c.mobile}</td>
                        <td className="cell-padded">
                          {c.city || 'No City'}
                          {(c.location || c.state) && (
                            <div className="text-muted fs-sm">
                              {[c.location, c.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="cell-padded">
                          <div className="btn-group">
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => setViewingCustomer(c)}
                            >
                              View Details
                            </button>
                            <button 
                              className="btn btn-warning" 
                              onClick={() => { 
                                setIsCustomerEditMode(true)
                                setEditingCustomerId(c.id)
                                setCustomerForm({ 
                                  name: c.name, 
                                  gstno: c.gstno || '', 
                                  mobile: c.mobile || '', 
                                  city: c.city || '',
                                  location: c.location || '',
                                  state: c.state || ''
                                })
                                setShowCustomerModal(true) 
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="empty-state">No customers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredCustomers.length)}
            </div>
          )}

          {/* --- INTERFACE PATH TARGET: ITEM DEFINITION CONTROL CATALOG --- */}
          {view === 'products' && (
            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title mb-0">Product Details</h2>
                <input 
                  type="text" 
                  className="form-control header-search search-expanded" 
                  placeholder="Search products or HSN..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => { 
                    setIsEditMode(false)
                    setProductForm({ 
                      name: '', 
                      hsnCode: '', 
                      purchasePrice: '', 
                      mrp: '', 
                      price: '', 
                      stock: '' 
                    })
                    setShowProductModal(true) 
                  }}
                >
                  + Add New Product
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Product Name</th>
                      <th>HSN Code</th>
                      <th>Purchase Price</th>
                      <th>Selling Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length ? paginatedProducts.map((product) => (
                      <tr key={product.id} className="product-row available">
                        <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                        <td className="fw-bold cell-padded">{product.name}</td>
                        <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                        <td className="price-text text-warning cell-padded">{formatMoney(product.purchasePrice)}</td>
                        <td className="price-text text-success cell-padded">{formatMoney(product.price)}</td>
                        <td className="cell-padded">
                          <div className="btn-group">
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => setViewingProduct(product)}
                            >
                              View
                            </button>
                            <button 
                              className="btn btn-warning" 
                              onClick={() => { 
                                setIsEditMode(true)
                                setEditingProductId(product.id)
                                setProductForm({ 
                                  name: product.name, 
                                  hsnCode: product.hsnCode || '',
                                  purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                                  mrp: product.mrp ? product.mrp.toString() : product.price.toString(),
                                  price: product.price.toString(), 
                                  stock: product.stock.toString() 
                                })
                                setShowProductModal(true) 
                              }}
                            >
                              Edit Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="empty-state">No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(filteredProducts.length)}
            </div>
          )}
        </main>
      </div>
      
      {/* =========================================
          --- HIDDEN A4 PRINTABLE TEMPLATE ---
          ========================================= */}
      <div className="print-only">
        {view === 'invoice-details' && selectedInvoice && selectedInvoiceMath && renderPrintableInvoice()}
      </div>

      {/* =========================================
          --- SYSTEM INTERACTIVE OVERLAYS ---
          ========================================= */}

      {/* Standalone Receipt Preview Modal (From Receipts List) */}
      {viewingReceipt && (
        <div className="modal-overlay modal-overlay-top no-print">
          <div className="modal-content modal-small">
            <h3 className="modal-header-title text-slate">Payment Receipt</h3>
            
            <div className="receipt-panel bg-white receipt-preview-panel">
              <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                <div className="info-block">
                  <span className="info-label">Receipt ID</span>
                  <strong className="info-value">{formatReceiptId(viewingReceipt.id)}</strong>
                </div>
                <div className="info-block mt-1">
                  <span className="info-label">Date</span>
                  <strong className="info-value">{new Date(viewingReceipt.receiptDate).toLocaleDateString('en-GB')}</strong>
                </div>
                <div className="info-block mt-1">
                  <span className="info-label">Customer Name</span>
                  <strong className="info-value">{viewingReceipt.customerName}</strong>
                </div>
                <div className="info-block mt-1">
                  <span className="info-label">Amount Paid</span>
                  <strong className="info-value fs-xxl text-success">{formatMoney(viewingReceipt.amount)}</strong>
                </div>
                {viewingReceipt.discountAmount > 0 && (
                  <div className="info-block mt-1">
                    <span className="info-label">Less (Discount)</span>
                    <strong className="info-value fs-lg text-danger">- {formatMoney(viewingReceipt.discountAmount)}</strong>
                  </div>
                )}
                <div className="info-block mt-1">
                  <span className="info-label">Payment Mode</span>
                  <strong className="info-value text-slate">{viewingReceipt.paymentMode}</strong>
                </div>
                <div className="info-block mt-1">
                  <span className="info-label">Remarks</span>
                  <strong className="info-value text-slate">{viewingReceipt.remarks || 'N/A'}</strong>
                </div>
              </div>
            </div>

            <div className="modal-actions center-actions mt-2 pt-1 border-top">
              <button onClick={() => setViewingReceipt(null)} className="btn btn-secondary w-100 fs-lg">Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {viewingCustomer && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Customer Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block">
                <span className="info-label">Name</span>
                <strong className="info-value">{viewingCustomer.name}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">GST No</span>
                <strong className="info-value">{viewingCustomer.gstno || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Mobile</span>
                <strong className="info-value">{viewingCustomer.mobile || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">City</span>
                <strong className="info-value">{viewingCustomer.city || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Location</span>
                <strong className="info-value">{viewingCustomer.location || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">State</span>
                <strong className="info-value">{viewingCustomer.state || 'N/A'}</strong>
              </div>
            </div>
            <div className="modal-actions center-actions mt-1">
              <button 
                onClick={() => setViewingCustomer(null)} 
                className="btn btn-secondary w-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Product Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block">
                <span className="info-label">Product ID</span>
                <strong className="info-value">{formatProductId(viewingProduct.id)}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Name</span>
                <strong className="info-value">{viewingProduct.name}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">HSN Code</span>
                <strong className="info-value">{viewingProduct.hsnCode || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Purchase Price</span>
                <strong className="info-value text-warning">
                  {formatMoney(viewingProduct.purchasePrice)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">MRP (Max Retail Price)</span>
                <strong className="info-value text-muted">
                  {formatMoney(viewingProduct.mrp || viewingProduct.price)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">Selling Price</span>
                <strong className="info-value text-success">
                  {formatMoney(viewingProduct.price)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">Current Stock</span>
                <strong className={`info-value ${viewingProduct.stock > 10 ? 'text-success' : 'text-danger'}`}>
                  {viewingProduct.stock} Units
                </strong>
              </div>
            </div>
            <div className="modal-actions center-actions mt-1">
              <button 
                onClick={() => setViewingProduct(null)} 
                className="btn btn-secondary w-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Add Product To Sales Cart Modal */}
      {showAddProductModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-large">
            <div className="card-header header-actions border-none pb-0">
              <h3 className="modal-header-title mb-0">Select Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setShowAddProductModal(false); 
                  setSearchQuery(''); 
                }}
              >
                Close
              </button>
            </div>
            <div className="form-group mt-1">
              <input 
                type="text" 
                className="form-control mb-0" 
                placeholder="Search product name, HSN code or Product ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="table-responsive modal-scroll-area-nobottom">
              <table className="block-table data-table table-fixed">
                <thead>
                  <tr>
                    <th className="col-15">ID</th>
                    <th className="col-30">Product Name</th>
                    <th className="col-15">HSN Code</th>
                    <th className="col-10">MRP</th>
                    <th className="col-15">Selling Price</th>
                    <th className="col-15">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const cartItem = activeTab.cart.find(c => c.id === product.id)
                    const inCartQty = cartItem ? (Number(cartItem.quantity) || 0) : 0
                    const availableStock = product.stock - inCartQty
                    const isOutOfStock = availableStock <= 0
                    
                    return (
                      <tr 
                        key={product.id} 
                        className={`product-row ${isOutOfStock ? 'out-of-stock' : 'available'}`} 
                        onClick={() => { if (!isOutOfStock) addToCart(product) }} 
                        title={isOutOfStock ? 'Out of stock' : 'Click block to add to cart'}
                      >
                        <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                        <td className="col-product-name cell-padded">{product.name}</td>
                        <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                        <td className="text-muted cell-padded">
                          {formatMoney(product.mrp || product.price)}
                        </td>
                        <td className="price-text cell-padded">{formatMoney(product.price)}</td>
                        <td className={`fw-bold cell-padded ${isOutOfStock ? 'text-danger' : 'text-success'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${availableStock} Units`}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Product To Purchase Cart Modal */}
      {showAddPurchaseProductModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-large">
            <div className="card-header header-actions border-none pb-0">
              <h3 className="modal-header-title mb-0">Select Purchase Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setShowAddPurchaseProductModal(false); 
                  setSearchQuery('');
                }}
              >
                Close
              </button>
            </div>
            <div className="form-group mt-1">
              <input 
                type="text" 
                className="form-control mb-0" 
                placeholder="Search product name, HSN code or Product ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="table-responsive modal-scroll-area-nobottom">
              <table className="block-table data-table table-fixed">
                <thead>
                  <tr>
                    <th className="col-20">ID</th>
                    <th className="col-35">Product Name</th>
                    <th className="col-15">HSN Code</th>
                    <th className="col-15">Buy Price</th>
                    <th className="col-15">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr 
                      key={product.id} 
                      className="product-row available" 
                      onClick={() => addToPurchaseCart(product)} 
                      title="Click block to add to purchase cart"
                    >
                      <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                      <td className="col-product-name cell-padded">{product.name}</td>
                      <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                      <td className="price-text text-warning cell-padded">
                        {formatMoney(product.purchasePrice)}
                      </td>
                      <td className="fw-bold cell-padded text-dark-muted">{product.stock} Units</td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quick Stock Editor Modal */}
      {showInventoryModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Update Inventory</h3>
            <p className="text-dark-muted form-group">
              Updating stock for: <strong>{products.find(p => p.id === editingInventoryId)?.name}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">New Total Stock:</label>
              <input 
                type="number" 
                className="form-control" 
                value={inventoryForm.stock} 
                onChange={e => setInventoryForm({ stock: e.target.value })} 
                min="0" 
              />
            </div>
            <div className="modal-actions mt-1">
              <button 
                onClick={closeInventoryModal} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInventory} 
                className="btn btn-success"
              >
                Save Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Global Catalog Product Configurator Modal */}
      {showProductModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">
              {isEditMode ? 'Edit Product Details' : 'Add New Product'}
            </h3>
            
            <div className="modal-scroll-area">
              <div className="form-group">
                <label className="form-label">Product Name:</label>
                <input 
                  className="form-control" 
                  value={productForm.name} 
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">HSN Code:</label>
                <input 
                  className="form-control" 
                  value={productForm.hsnCode} 
                  placeholder="e.g. 6203" 
                  onChange={e => setProductForm({ ...productForm, hsnCode: e.target.value })} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Purchase Price (Wholesale):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.purchasePrice} 
                  onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">MRP (Max Retail Price):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.mrp} 
                  onChange={e => setProductForm({ ...productForm, mrp: e.target.value })} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Selling Price (Our Price):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.price} 
                  onChange={e => setProductForm({ ...productForm, price: e.target.value })} 
                />
              </div>
              
              {!isEditMode && (
                <div className="form-group">
                  <label className="form-label">Initial Stock:</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={productForm.stock} 
                    onChange={e => setProductForm({ ...productForm, stock: e.target.value })} 
                  />
                </div>
              )}
            </div>
            
            <div className={`modal-actions modal-footer-actions ${isEditMode ? 'justify-between' : 'justify-end'}`}>
              {isEditMode && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteProduct(editingProductId, productForm.name)}
                >
                  Delete
                </button>
              )}
              <div className="flex-gap-1">
                <button 
                  onClick={closeProductModal} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProduct} 
                  className="btn btn-success"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Global CRM Identity Overlay */}
      {showCustomerModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">
              {isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            
            <div className="modal-scroll-area">
              <div className="form-group">
                <label className="form-label">Customer Name:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.name} 
                  onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} 
                  placeholder="Enter customer name" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">GST No:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.gstno} 
                  onChange={e => setCustomerForm({ ...customerForm, gstno: e.target.value })} 
                  placeholder="Enter GST Number" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Mobile:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.mobile} 
                  onChange={e => setCustomerForm({ ...customerForm, mobile: e.target.value })} 
                  placeholder="Enter Mobile Number" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">City:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.city} 
                  onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })} 
                  placeholder="Enter City" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.location} 
                  onChange={e => setCustomerForm({ ...customerForm, location: e.target.value })} 
                  placeholder="Enter Location/Area" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">State:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.state} 
                  onChange={e => setCustomerForm({ ...customerForm, state: e.target.value })} 
                  placeholder="Enter State" 
                />
              </div>
            </div>
            
            <div className={`modal-actions modal-footer-actions ${isCustomerEditMode ? 'justify-between' : 'justify-end'}`}>
              {isCustomerEditMode && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteCustomer(editingCustomerId, customerForm.name)}
                >
                  Delete
                </button>
              )}
              <div className="flex-gap-1">
                <button 
                  onClick={closeCustomerModal} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCustomer} 
                  className="btn btn-success"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}