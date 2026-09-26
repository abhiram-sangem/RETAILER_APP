import React, { useState, useEffect, useMemo } from 'react';
import { 
  formatProductId, formatInvoiceId, formatMoney 
} from '../utils/formatters';
import { invoiceService } from '../services/api';
import Pagination from '../components/Pagination';
import PrintableInvoice from '../components/PrintableInvoice';

export default function SalesManager({ 
  view, setView, products, customers, invoices, invoiceHistory, 
  loadProducts, loadInvoices, loadHistory, loadCustomers 
}) {
  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [returnSaleData, setReturnSaleData] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [historyCompareData, setHistoryCompareData] = useState(null);

  // --- MULTI-TAB STATE ENGINE ---
  const generateNewTab = (title = 'New Bill') => ({
    id: Date.now() + Math.random(),
    title,
    cart: [],
    activeCustomer: null,
    customerSearch: '',
    discountPercent: 0,
    taxPercent: 5,
    editingInvoiceId: null,
    customInvoiceId: '', 
    isPayLater: false,
    paymentMethod: 'Cash',
    saleDate: new Date().toISOString().split('T')[0],
    dueDays: '', 
    isDropdownOpen: false
  });

  const [salesTabs, setSalesTabs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('salesTabs'));
      return saved?.length ? saved : [generateNewTab()];
    } catch { return [generateNewTab()]; }
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('activeTabId')) || salesTabs[0].id;
    } catch { return salesTabs[0].id; }
  });

  const activeTab = salesTabs.find(t => t.id === activeTabId) || salesTabs[0];

  const updateActiveTab = (updates) => {
    setSalesTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salesDrafts')) || []; } 
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('salesTabs', JSON.stringify(salesTabs));
    localStorage.setItem('activeTabId', JSON.stringify(activeTabId));
  }, [salesTabs, activeTabId]);

  useEffect(() => {
    localStorage.setItem('salesDrafts', JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilterRange, startDate, endDate, itemsPerPage]);

  // --- UTILS & MATH ---
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
      if (startDate && dateToCheck < new Date(startDate).setHours(0,0,0,0)) return false;
      if (endDate && dateToCheck > new Date(endDate).setHours(0,0,0,0)) return false;
    }
    return true; 
  };

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

  const activeBillingDetails = useMemo(() => {
    const subtotal = activeTab.cart.reduce((sum, item) => {
      const currentPrice = item.sellType === 'Piece' ? item.piecePrice : item.price;
      return sum + (currentPrice * (Number(item.quantity) || 0));
    }, 0);
    
    const discountAmount = subtotal * (activeTab.discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgstPercent = activeTab.taxPercent / 2;
    const sgstPercent = activeTab.taxPercent / 2;
    const cgst = taxableAmount * (cgstPercent / 100);
    const sgst = taxableAmount * (sgstPercent / 100);
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = Math.round(exactTotal);
    const roundoff = finalTotal - exactTotal;
    return { subtotal, discountAmount, taxableAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal };
  }, [activeTab.cart, activeTab.discountPercent, activeTab.taxPercent]);

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

  const safeSearch = (searchQuery || '').toLowerCase();
  const safeCustomerSearch = (activeTab?.customerSearch || '').toLowerCase();

  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) ||
    formatProductId(p.id).toLowerCase().includes(safeSearch)
  );

  const dropdownFilteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(safeCustomerSearch)) ||
    (c.location && c.location.toLowerCase().includes(safeCustomerSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeCustomerSearch))
  );

  const filteredInvoices = invoices.filter(i =>
    ((i.customerName && i.customerName.toLowerCase().includes(safeSearch)) || 
    formatInvoiceId(i.id).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(i.orderDate)
  );

  const filteredInvoiceHistory = invoiceHistory.filter(log => 
    ((log.customerName && log.customerName.toLowerCase().includes(safeSearch)) ||
    formatInvoiceId(log.originalInvoiceId).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(log.editDate)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  const paginatedInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedInvoiceHistory = filteredInvoiceHistory.slice(indexOfFirstItem, indexOfLastItem);

  // --- EVENT HANDLERS ---
  const openNewTab = () => {
    const newTab = generateNewTab(`Bill ${salesTabs.length + 1}`);
    setSalesTabs([...salesTabs, newTab]);
    setActiveTabId(newTab.id);
  };

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
  };

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
  };

  const resumeDraft = (draftToResume) => {
    const resumedTab = { ...draftToResume, id: Date.now() }; 
    setSalesTabs([...salesTabs, resumedTab]);
    setActiveTabId(resumedTab.id);
    setDrafts(drafts.filter(d => d.draftId !== draftToResume.draftId));
    setView('list');
  };

  const deleteDraft = (draftId) => {
    if (window.confirm("Are you sure you want to delete this draft?")) {
      setDrafts(drafts.filter(d => d.draftId !== draftId));
    }
  };

  function addToCart(product) {
    if (product.stock <= 0) return window.alert(`Sorry, ${product.name} is currently out of stock!`);
    
    const existingIndex = activeTab.cart.findIndex(item => item.id === product.id && item.sellType === 'Box');
    
    let newCart = [...activeTab.cart];
    if (existingIndex >= 0) {
      const existing = newCart[existingIndex];
      if (existing.quantity >= product.stock) return window.alert(`Cannot add more. We only have ${product.stock} of ${product.name} in stock.`);
      newCart[existingIndex] = { ...existing, quantity: (Number(existing.quantity) || 0) + 1 };
    } else {
      newCart.push({ ...product, quantity: 1, sellType: 'Box' });
    }
    updateActiveTab({ cart: newCart });
  }

  function updateQuantity(index, val) {
    const item = activeTab.cart[index];
    if (val === '') {
      const newCart = [...activeTab.cart];
      newCart[index] = { ...item, quantity: '' };
      return updateActiveTab({ cart: newCart });
    }
    const quantity = Number(val);
    if (quantity < 0) return;
    
    const stockNeeded = item.sellType === 'Piece' ? (quantity / item.piecesPerBox) : quantity;
    if (stockNeeded > item.stock) {
      return window.alert(`Cannot exceed available inventory (${item.stock} boxes left).`);
    }

    const newCart = [...activeTab.cart];
    newCart[index] = { ...item, quantity };
    updateActiveTab({ cart: newCart });
  }

  function updateSellType(index, newType) {
    const item = activeTab.cart[index];
    const newCart = [...activeTab.cart];
    newCart[index] = { ...item, sellType: newType, quantity: 1 }; 
    updateActiveTab({ cart: newCart });
  }

  function removeCartItem(index) {
    updateActiveTab({ cart: activeTab.cart.filter((_, idx) => idx !== index) });
  }

  function proceedToPayment() {
    if (!activeTab.cart.length) return window.alert('Cart is empty.');
    if (!activeTab.activeCustomer) return window.alert('Please select a customer before proceeding to payment.');
    setView('payment-screen');
  }

  function submitFinalSale(isDirectPayLater = false) {
    if (!activeTab.cart.length) return window.alert('Cart is empty.');
    if (!activeTab.activeCustomer) return window.alert('Please select a customer before submitting.');
    
    const finalPaymentMethod = (activeTab.isPayLater || isDirectPayLater) ? 'Pay Later' : activeTab.paymentMethod;

    // VERY IMPORTANT: Format the cart payload so the backend gets the exact piece price if applicable
    const processedCartPayload = activeTab.cart.map(item => ({
      ...item,
      price: item.sellType === 'Piece' ? item.piecePrice : item.price
    }));

    if (activeTab.editingInvoiceId) {
      invoiceService.update(
        activeTab.editingInvoiceId, activeTab.activeCustomer.name, processedCartPayload,
        activeBillingDetails.subtotal, activeTab.discountPercent, activeBillingDetails.cgst,
        activeBillingDetails.sgst, activeBillingDetails.finalTotal, finalPaymentMethod, activeTab.saleDate,
        activeTab.dueDays ? parseInt(activeTab.dueDays, 10) : null, 
        activeTab.customInvoiceId
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} updated successfully!`);
        closeTab(activeTabId, { stopPropagation: () => {} });
        loadProducts(); loadInvoices(); loadHistory(); loadCustomers();
        
        invoiceService.getInvoiceById(invoice.id).then(fullInvoice => {
          setSelectedInvoice(fullInvoice);
          setView('invoice-details');
          setTimeout(() => window.print(), 800); 
        });
      }).catch(err => window.alert('Failed to update sale. ' + err.message));
    } else {
      invoiceService.create(
        activeTab.activeCustomer.name, processedCartPayload, activeBillingDetails.subtotal, 
        activeTab.discountPercent, activeBillingDetails.cgst, activeBillingDetails.sgst,
        activeBillingDetails.finalTotal, finalPaymentMethod, activeTab.saleDate,
        activeTab.dueDays ? parseInt(activeTab.dueDays, 10) : null, 
        activeTab.customInvoiceId
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} completed successfully!`);
        closeTab(activeTabId, { stopPropagation: () => {} });
        loadProducts(); loadInvoices(); loadHistory(); loadCustomers();

        invoiceService.getInvoiceById(invoice.id).then(fullInvoice => {
          setSelectedInvoice(fullInvoice);
          setView('invoice-details');
          setTimeout(() => window.print(), 800);
        });
      }).catch(err => window.alert('Failed to complete sale. ' + err.message));
    }
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale/edit?")) {
      closeTab(activeTabId, { stopPropagation: () => {} });
      setView('list');
    }
  }

  function handleViewInvoiceDetails(invoiceId) { 
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data);
      setView('invoice-details');
    });
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
    editTab.customInvoiceId = invoice.customInvoiceId || '';
    editTab.dueDays = invoice.dueDays ? invoice.dueDays.toString() : ''; 
    editTab.cart = invoice.items.map(item => ({
      ...item.product, 
      id: item.product?.id || item.id, 
      name: item.product?.name || item.name || 'Unknown Product',
      price: item.price, 
      quantity: item.quantity, 
      originalQuantity: item.quantity,
      sellType: item.sellType || 'Box', 
      stock: ((item.product?.stock || 0) + (item.sellType === 'Piece' ? (item.quantity / item.product?.piecesPerBox) : item.quantity)) 
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
      returnSaleData.id, 
      itemsToReturn.map(i => ({ id: i.product?.id || i.id, quantity: Number(i.returnQty), price: i.price })),
      returnMath.subtotal, returnSaleData.discountPercent, returnMath.cgst, returnMath.sgst, returnMath.finalTotal
    ).then(() => {
      window.alert("Return processed successfully!");
      setReturnSaleData(null);
      setView('invoices'); loadInvoices(); loadProducts(); loadHistory(); loadCustomers();
    }).catch(err => window.alert("Failed to process return: " + err.message));
  }

  const parseItems = (json) => {
    try { return JSON.parse(json) || []; } catch { return []; }
  };

  const renderHistoryItems = (jsonString) => {
    const items = parseItems(jsonString);
    if (!items.length) return <tr><td colSpan="3" className="text-muted">No items</td></tr>;
    
    return items.map((item, idx) => (
      <tr key={idx} className="bg-transparent">
        <td className="fw-bold">{item.name || 'Unknown'}</td>
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
    );
  };

  return (
    <>
      <div className="no-print">
        {/* --- VIEW 1: MULTI-TAB CART --- */}
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
                
                <div className="sales-control-row mt-1 mb-1-5" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div className="input-group customer-dropdown-group" style={{ flex: '2', minWidth: '250px' }}>
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

                  <div className="input-group" style={{ flex: '1', minWidth: '130px' }}>
                    <label>Invoice No. (Opt)</label>
                    <input 
                      type="text" className="form-control mb-0" placeholder="Auto" 
                      value={activeTab.customInvoiceId || ''} 
                      onChange={e => updateActiveTab({ customInvoiceId: e.target.value })} 
                    />
                  </div>
                  <div className="input-group" style={{ flex: '1', minWidth: '130px' }}>
                    <label>Sale Date</label>
                    <input 
                      type="date" className="form-control mb-0" 
                      value={activeTab.saleDate} 
                      onChange={e => updateActiveTab({ saleDate: e.target.value })} 
                      disabled={!!activeTab.editingInvoiceId} 
                    />
                  </div>
                  <div className="input-group" style={{ flex: '1', minWidth: '130px' }}>
                    <label>Due In (Days)</label>
                    <input 
                      type="number" className="form-control mb-0" placeholder="e.g. 15"
                      value={activeTab.dueDays || ''} 
                      onChange={e => updateActiveTab({ dueDays: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="d-flex justify-end mt-1">
                  <button className="btn btn-primary" onClick={() => { setSearchQuery(''); setShowAddProductModal(true); }}>
                    + Add Products
                  </button>
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
                      <tr><th>S.No</th><th>Product</th><th>Unit</th><th>Price</th><th>Quantity</th><th>Total</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {activeTab.cart.length ? activeTab.cart.map((item, idx) => {
                        const currentPrice = item.sellType === 'Piece' ? item.piecePrice : item.price;
                        const hasPiecesConfigured = Number(item.piecesPerBox) > 0;
                        return (
                          <tr key={`${item.id}-${idx}`}>
                            <td className="fw-bold">{idx + 1}</td>
                            <td><span className="product-name-large">{item.name || 'Unknown Product'}</span></td>
                            
                            {/* UPDATED: Dropdown is always visible, but disabled if no pieces exist */}
                            <td>
                                <select 
                                  className="form-control mb-0" 
                                  style={{width: '90px', padding: '5px', cursor: hasPiecesConfigured ? 'pointer' : 'not-allowed'}}
                                  value={item.sellType || 'Box'} 
                                  onChange={e => updateSellType(idx, e.target.value)}
                                  disabled={!hasPiecesConfigured}
                                  title={!hasPiecesConfigured ? "Update this product in Inventory to set Pieces Per Box before selling by Piece" : ""}
                                >
                                  <option value="Box">Box</option>
                                  {hasPiecesConfigured && <option value="Piece">Piece</option>}
                                </select>
                            </td>

                            <td>{formatMoney(currentPrice)}</td>
                            <td>
                              <input
                                type="number"
                                className="quantity-input form-control mb-0 qty-input-large"
                                min="1"
                                value={item.quantity}
                                onChange={e => updateQuantity(idx, e.target.value)}
                                onBlur={e => { if (e.target.value === '' || Number(e.target.value) < 1) updateQuantity(idx, 1); }}
                              />
                              {activeTab.editingInvoiceId && item.originalQuantity !== undefined && (
                                <div className="text-muted fs-sm mt-1">Previous: {item.originalQuantity}</div>
                              )}
                            </td>
                            <td className="price-text text-success">{formatMoney(currentPrice * (Number(item.quantity) || 0))}</td>
                            <td><button className="btn btn-danger" onClick={() => removeCartItem(idx)}>Remove</button></td>
                          </tr>
                        );
                      }) : <tr><td colSpan={7} className="empty-state">Cart is empty. Click "+ Add Products" to begin.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* COMPACT PROPORTIONAL BILL SUMMARY */}
                {activeTab.cart.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', marginBottom: '1rem', paddingRight: '1rem' }}>
                    <div className="receipt-panel shadow-panel" style={{ width: '400px', marginTop: 0, padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
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
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button className="btn btn-warning flex-1 btn-checkout mt-0" onClick={() => submitFinalSale(true)}>Submit (Pay Later)</button>
                        <button className="btn btn-success flex-1 btn-checkout mt-0" onClick={proceedToPayment}>Proceed to Pay</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: DRAFTS --- */}
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

        {/* --- VIEW: PAYMENT SCREEN --- */}
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
                <button className={`btn btn-checkout ${activeTab.isPayLater ? 'btn-warning' : 'btn-success'}`} onClick={() => submitFinalSale(false)}>
                  {activeTab.editingInvoiceId ? 'Save Edits & Print' : 'Complete & Print Sale'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: SALES LIST --- */}
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
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
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
                        if (e.target.tagName !== 'BUTTON') handleViewInvoiceDetails(invoice.id);
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
                              <button className="btn btn-warning" onClick={(e) => { e.stopPropagation(); handleEditSale(invoice); }}>Edit</button>
                              <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleInitiateReturn(invoice); }}>Return</button>
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
            <Pagination totalItems={filteredInvoices.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        )}

        {/* --- VIEW: INVOICE DETAILS --- */}
        {view === 'invoice-details' && selectedInvoice && selectedInvoiceMath && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">Sale {formatInvoiceId(selectedInvoice.id)} Details</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Bill (A4)</button>
                <button className="btn btn-secondary action-buttons-right" onClick={() => { setSelectedInvoice(null); setView('invoices'); }}>Back to Sales List</button>
              </div>
            </div>
            
            <div className="invoice-summary-grid margin-top-large">
              <div className="info-block"><span className="info-label">Customer</span><strong className="info-value">{selectedInvoice.customerName}</strong></div>
              <div className="info-block">
                <span className="info-label">Payment Terms</span>
                <strong className={`info-value ${selectedInvoice.paymentMethod === 'Pay Later' ? 'text-warning' : 'text-primary'}`}>
                  {selectedInvoice.paymentMethod === 'Pay Later' && selectedInvoice.dueDays 
                    ? `Net ${selectedInvoice.dueDays} Days` 
                    : selectedInvoice.paymentMethod || 'Cash'}
                </strong>
              </div>
              <div className="info-block"><span className="info-label">Date</span><strong className="info-value">{new Date(selectedInvoice.orderDate).toLocaleDateString('en-GB')}</strong></div>
            </div>
            
            <h4 className="section-title-spacing">Items Purchased</h4>
            <div className="table-responsive table-margin-bottom">
              <table className="data-table">
                <thead><tr><th>S.No</th><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold">{idx + 1}</td>
                      <td><span className="product-name-large">{item.product?.name || item.name || 'Unknown Product'}</span></td>
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
                <div className="receipt-row receipt-three-col"><span className="fw-bold">Subtotal:</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(selectedInvoiceMath.subtotal)}</span></div>
                {selectedInvoiceMath.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red"><span className="fw-bold">Discount:</span><span className="text-center text-muted">{selectedInvoiceMath.discountPercent}%</span><span className="text-right text-danger">-{formatMoney(selectedInvoiceMath.discountAmount)}</span></div>
                )}
                {selectedInvoiceMath.totalTaxPercent > 0 && (
                  <>
                    <div className="receipt-row receipt-three-col"><span className="fw-bold">Total Tax:</span><span className="text-center text-muted">{selectedInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right"></span></div>
                    <div className="receipt-row receipt-three-col"><span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(selectedInvoiceMath.taxableAmount)}</span></div>
                    <div className="receipt-row receipt-three-col"><span className="text-muted">CGST:</span><span className="text-center text-muted">{selectedInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(selectedInvoiceMath.cgst)}</span></div>
                    <div className="receipt-row receipt-three-col"><span className="text-muted">SGST:</span><span className="text-center text-muted">{selectedInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(selectedInvoiceMath.sgst)}</span></div>
                  </>
                )}
                <div className="receipt-row receipt-three-col"><span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span><span className="text-right">{selectedInvoiceMath.roundoff > 0 ? '+' : ''}{formatMoney(selectedInvoiceMath.roundoff)}</span></div>
                <div className="receipt-total receipt-three-col"><span>Final Total:</span><span className="text-center text-muted"></span><span className={`fw-bold text-right ${selectedInvoice.isReturn ? 'text-danger' : 'text-success'}`}>{formatMoney(selectedInvoiceMath.finalTotal)}</span></div>
              </div>
            </div>
            <button onClick={() => { setSelectedInvoice(null); setView('invoices'); }} className="btn btn-secondary w-100 close-btn-padding">Back to Sales List</button>
          </div>
        )}

        {/* --- VIEW: RETURN SALE --- */}
        {view === 'return-sale' && returnSaleData && returnMath && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title text-danger">Process Return: Bill {formatInvoiceId(returnSaleData.id)}</h2>
              <button className="btn btn-secondary action-buttons-right" onClick={() => { setReturnSaleData(null); setView('invoices'); }}>Cancel Return</button>
            </div>
            <div className="invoice-summary-grid margin-top-large">
              <div className="info-block"><span className="info-label">Customer</span><strong className="info-value">{returnSaleData.customerName}</strong></div>
              <div className="info-block"><span className="info-label">Original Date</span><strong className="info-value">{new Date(returnSaleData.orderDate).toLocaleDateString('en-GB')}</strong></div>
              <div className="info-block"><span className="info-label">Original Total</span><strong className="info-value text-success">{formatMoney(returnSaleData.finalTotal)}</strong></div>
            </div>
            <div className="table-responsive table-margin-bottom">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Price</th><th>Purchased Qty</th><th>Return Qty</th><th>Return Amount</th></tr></thead>
                <tbody>
                  {returnSaleData.returnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td><span className="product-name-large">{item.product?.name || item.name || 'Unknown Product'}</span></td>
                      <td>{formatMoney(item.price)}</td>
                      <td className="fw-bold fs-lg">{item.quantity}</td>
                      <td>
                        <input
                          type="number" className="quantity-input form-control mb-0 qty-input-large" min="0" max={item.quantity} value={item.returnQty}
                          onChange={e => {
                            let val = e.target.value;
                            if (val !== '') { val = Number(val); if (val > item.quantity) val = item.quantity; if (val < 0) val = 0; }
                            setReturnSaleData(prev => { const newItems = [...prev.returnItems]; newItems[idx].returnQty = val; return { ...prev, returnItems: newItems }; });
                          }}
                          onBlur={e => {
                            if (e.target.value === '' || Number(e.target.value) < 0) {
                              setReturnSaleData(prev => { const newItems = [...prev.returnItems]; newItems[idx].returnQty = 0; return { ...prev, returnItems: newItems }; });
                            }
                          }}
                        />
                      </td>
                      <td className="price-text text-danger fw-bold">-{formatMoney(item.price * (Number(item.returnQty) || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="invoice-math-wrapper">
              <div className="receipt-panel full-width-panel border-danger">
                <div className="receipt-row receipt-three-col"><span className="fw-bold">Return Subtotal:</span><span className="text-center text-muted"></span><span className="text-right text-danger">-{formatMoney(returnMath.subtotal)}</span></div>
                {returnSaleData.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red"><span className="fw-bold">Return Discount:</span><span className="text-center text-muted">{returnSaleData.discountPercent}%</span><span className="text-right text-success">+{formatMoney(returnMath.discountAmount)}</span></div>
                )}
                <div className="receipt-row receipt-three-col"><span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span><span className="text-right text-danger">-{formatMoney(returnMath.taxableAmount)}</span></div>
                <div className="receipt-row receipt-three-col"><span className="text-muted">Return CGST / SGST:</span><span className="text-center text-muted"></span><span className="text-right text-danger">-{formatMoney(returnMath.cgst + returnMath.sgst)}</span></div>
                <div className="receipt-total receipt-three-col border-top-danger"><span>Total Refund Amount:</span><span className="text-center text-muted"></span><span className="text-right text-danger">-{formatMoney(returnMath.finalTotal)}</span></div>
                <div className="modal-actions return-actions">
                  <button className="btn btn-warning p-1" onClick={handleReturnAllItems}>Select All Items (Return All)</button>
                  <button className="btn btn-danger btn-checkout mt-0 flex-1" onClick={submitReturn} disabled={returnMath.finalTotal === 0}>Confirm & Process Return</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: EDIT HISTORY --- */}
        {view === 'edit-history' && (
          <div className="card">
            <div className="card-header header-actions header-actions-wrap">
              <h2 className="card-title mb-0">Sales Edit History</h2>
              <div className="header-filters-group">
                <input 
                  type="text" className="form-control mb-0 search-input-md" placeholder="Search customer or ID..."
                  value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                />
                {renderDateFilter()}
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="block-table data-table">
                <thead><tr><th>Edit Date</th><th>Original Bill ID</th><th>Customer Name</th><th>Details</th></tr></thead>
                <tbody>
                  {paginatedInvoiceHistory.length ? paginatedInvoiceHistory.map(log => (
                    <tr key={log.id} className="product-row available">
                      <td className="cell-padded">{new Date(log.editDate).toLocaleDateString('en-GB')}</td>
                      <td className="fw-bold cell-padded">{formatInvoiceId(log.originalInvoiceId)}</td>
                      <td className="cell-padded">{log.customerName}</td>
                      <td className="cell-padded">
                        <button className="btn btn-secondary" onClick={() => { setHistoryCompareData(log); setView('sale-edit-compare'); }}>View Comparison</button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={4} className="empty-state">No edit history found for this date range.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination totalItems={filteredInvoiceHistory.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
        )}

        {/* --- VIEW: EDIT HISTORY COMPARE --- */}
        {view === 'sale-edit-compare' && historyCompareData && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">Compare Edits: {formatInvoiceId(historyCompareData.originalInvoiceId)}</h2>
              <button className="btn btn-secondary action-buttons-right" onClick={() => { setHistoryCompareData(null); setView('edit-history'); }}>Back to Edit History</button>
            </div>
            <div className="mb-2-bg">
              <span className="fw-bold text-slate">Customer: </span> {historyCompareData.customerName} &nbsp;|&nbsp;
              <span className="fw-bold text-slate"> Edited On: </span> {new Date(historyCompareData.editDate).toLocaleString('en-GB')}
            </div>
            <div className="comparison-grid">
              <div className="snapshot-old-wrapper">
                <h3 className="snapshot-title-old">Old Bill Snapshot</h3>
                <div className="table-res-old">
                  <table className="data-table comparison-table mb-0 border-none bg-transparent">
                    <thead className="sticky-th-light-no-z"><tr><th className="th-old th-old-tinted">Product</th><th className="th-old th-old-tinted">Qty</th><th className="th-old th-old-tinted">Price</th></tr></thead>
                    <tbody>{renderHistoryItems(historyCompareData.oldItemsJson)}</tbody>
                  </table>
                </div>
                {renderHistorySummary(historyCompareData.oldItemsJson, historyCompareData.oldFinalTotal)}
              </div>
              <div className="snapshot-new-wrapper">
                <h3 className="snapshot-title-new">New Bill Snapshot</h3>
                <div className="table-res-new">
                  <table className="data-table comparison-table mb-0 border-none bg-transparent">
                    <thead className="sticky-th-light-no-z"><tr><th className="th-new th-new-tinted">Product</th><th className="th-new th-new-tinted">Qty</th><th className="th-new th-new-tinted">Price</th></tr></thead>
                    <tbody>{renderHistoryItems(historyCompareData.newItemsJson)}</tbody>
                  </table>
                </div>
                {renderHistorySummary(historyCompareData.newItemsJson, historyCompareData.newFinalTotal)}
              </div>
            </div>
          </div>
        )}

        {/* --- UPGRADED FLOATING TILES MODAL: ADD PRODUCT --- */}
        {showAddProductModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', height: '95vh', display: 'flex', flexDirection: 'column', padding: '1.5rem', backgroundColor: '#f1f5f9' }}>
              <div className="card-header header-actions border-none" style={{ paddingBottom: '0', marginBottom: '10px' }}>
                <h3 className="modal-header-title mb-0">Select Products</h3>
                <button className="btn btn-secondary action-buttons-right btn-sm" onClick={() => { setShowAddProductModal(false); setSearchQuery(''); }}>Close</button>
              </div>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <input 
                  type="text" className="form-control mb-0" placeholder="Search product name, HSN code or Product ID..." 
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                  style={{ padding: '0.8rem', fontSize: '1.1rem' }}
                />
              </div>
              
              <div className="table-responsive modal-scroll-area-nobottom px-1 pb-1">
                <table className="floating-tiles-table w-100">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th className="text-left col-15">ID</th>
                      <th className="text-left col-35">Product Name</th>
                      <th className="text-center col-10">HSN Code</th>
                      <th className="text-right col-15">Box Price</th>
                      <th className="text-right col-15">Piece Price</th>
                      <th className="text-center col-10">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => {
                      const cartItem = activeTab.cart.find(c => c.id === product.id);
                      const inCartQty = cartItem ? (Number(cartItem.quantity) || 0) : 0;
                      const availableStock = product.stock - (cartItem?.sellType === 'Piece' ? (inCartQty / (product.piecesPerBox || 1)) : inCartQty);
                      const isOutOfStock = availableStock <= 0;
                      
                      return (
                        <tr 
                          key={product.id} className={`clickable-row ${isOutOfStock ? 'out-of-stock' : 'available'}`} 
                          onClick={() => { if (!isOutOfStock) addToCart(product); }} title={isOutOfStock ? 'Out of stock' : 'Click block to add to cart'}
                        >
                          <td className="fw-bold text-slate">{formatProductId(product.id)}</td>
                          <td className="product-name-large">{product.name}</td>
                          <td className="text-center text-muted">{product.hsnCode || 'N/A'}</td>
                          <td className="price-text text-right text-success">{formatMoney(product.price)}</td>
                          <td className="price-text text-right text-purple">{product.piecesPerBox > 0 ? formatMoney(product.piecePrice) : '-'}</td>
                          <td className={`fw-bold text-center ${isOutOfStock ? 'text-danger' : 'text-primary'}`}>{isOutOfStock ? 'Out of Stock' : `${Math.floor(availableStock)} Boxes`}</td>
                        </tr>
                      )
                    })}
                    {filteredProducts.length === 0 && <tr><td colSpan={6} className="empty-state border-none">No products found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ONLY THIS BLOCK PRINTS ON THE PAPER */}
      <div className="print-only-block">
        {selectedInvoice && selectedInvoiceMath && (
          <PrintableInvoice 
            selectedInvoice={selectedInvoice} 
            selectedInvoiceMath={selectedInvoiceMath} 
            customers={customers} 
          />
        )}
      </div>
    </>
  );
}