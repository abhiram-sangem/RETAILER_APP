import React, { useState, useEffect, useMemo } from 'react'; 
import { purchaseInvoiceService } from '../services/api'; 

export default function PurchaseManager({ 
  view, setView, products, purchaseInvoices, purchaseInvoiceHistory, vendors, 
  loadProducts, loadPurchaseInvoices, loadHistory 
}) { 
  // Formatters built-in to prevent missing import errors 
  const formatProductId = (id) => id ? `PR${String(id).padStart(4, '0')}` : 'N/A'; 
  const formatPurchaseInvoiceId = (id) => id ? `PINV-${String(id).padStart(4, '0')}` : 'N/A'; 
  const formatMoney = (amount) => { 
    const num = Number(amount) || 0; 
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
  }; 

  const [searchQuery, setSearchQuery] = useState(''); 
  const [dateFilterRange, setDateFilterRange] = useState('all'); 
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [itemsPerPage, setItemsPerPage] = useState(20); 
  const [editingPurchaseInvoiceId, setEditingPurchaseInvoiceId] = useState(null); 
  const [purchaseSellerName, setPurchaseSellerName] = useState(''); 
  const [customInvoiceId, setCustomInvoiceId] = useState(''); 
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); 
  const [purchaseDiscountPercent, setPurchaseDiscountPercent] = useState(0); 
  const [purchaseTaxPercent, setPurchaseTaxPercent] = useState(5); 
  const [showAddPurchaseProductModal, setShowAddPurchaseProductModal] = useState(false); 
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false); 
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState(null); 
  const [historyCompareData, setHistoryCompareData] = useState(null); 
  const [purchaseCart, setPurchaseCart] = useState(() => { 
    try { return JSON.parse(localStorage.getItem('purchaseCart')) || []; } 
    catch { return []; } 
  }); 

  useEffect(() => { 
    localStorage.setItem('purchaseCart', JSON.stringify(purchaseCart)); 
  }, [purchaseCart]); 

  useEffect(() => { 
    setCurrentPage(1); 
  }, [searchQuery, dateFilterRange, startDate, endDate, itemsPerPage]); 

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
  }; 

  const renderDateFilter = () => ( 
    <div className="date-filter-group"> 
      <select className="form-control mb-0 date-select-sm" value={dateFilterRange} onChange={e => setDateFilterRange(e.target.value)}> 
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

  const purchaseBillingDetails = useMemo(() => { 
    const subtotal = purchaseCart.reduce((sum, item) => sum + (item.purchasePrice || 0) * (Number(item.quantity) || 0), 0); 
    const discountAmount = subtotal * (purchaseDiscountPercent / 100); 
    const taxableAmount = subtotal - discountAmount; 
    const cgstPercent = purchaseTaxPercent / 2; 
    const sgstPercent = purchaseTaxPercent / 2; 
    const cgst = taxableAmount * (cgstPercent / 100); 
    const sgst = taxableAmount * (sgstPercent / 100); 
    const exactTotal = taxableAmount + cgst + sgst; 
    const finalTotal = Math.round(exactTotal); 
    const roundoff = finalTotal - exactTotal; 
    return { subtotal, discountAmount, taxableAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal }; 
  }, [purchaseCart, purchaseDiscountPercent, purchaseTaxPercent]); 

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

  // --- Search & Filter Logic ---
  const safeSearch = (searchQuery || '').toLowerCase(); 
  const safeSellerSearch = (purchaseSellerName || '').toLowerCase(); 

  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) || 
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) || 
    formatProductId(p.id).toLowerCase().includes(safeSearch) 
  ); 

  // MERGE VENDORS + HISTORICAL PURCHASES FOR DROPDOWN
  const allSellers = useMemo(() => {
    const sellerMap = new Map();
    // 1. Add historical names from past bills
    (purchaseInvoices || []).forEach(inv => {
        if (inv.sellerName && !sellerMap.has(inv.sellerName)) {
            sellerMap.set(inv.sellerName, { id: `hist-${inv.id}`, name: inv.sellerName, city: 'Legacy Entry' });
        }
    });
    // 2. Add registered vendors (overwrites legacy if name matches, bringing in city details)
    (vendors || []).forEach(v => {
        if (v.name) sellerMap.set(v.name, { ...v });
    });
    
    const combined = Array.from(sellerMap.values());
    if (combined.length === 0) {
        return [
            { id: 'def-1', name: 'Wholesale Market', city: '' },
            { id: 'def-2', name: 'Direct Distributor', city: '' },
            { id: 'def-3', name: 'Local Supplier', city: '' }
        ];
    }
    return combined;
  }, [purchaseInvoices, vendors]);

  const dropdownFilteredSellers = allSellers.filter(v => 
    v && v.name && v.name.toLowerCase().includes(safeSellerSearch) 
  ); 

  const filteredPurchaseInvoices = purchaseInvoices.filter(i => 
    ((i.sellerName && i.sellerName.toLowerCase().includes(safeSearch)) || 
    (i.id && i.id.toString().includes(safeSearch)) || 
    (i.customInvoiceId && i.customInvoiceId.toLowerCase().includes(safeSearch))) && 
    isWithinDateRange(i.purchaseDate) 
  ); 

  const filteredPurchaseInvoiceHistory = purchaseInvoiceHistory.filter(log => 
    ((log.sellerName && log.sellerName.toLowerCase().includes(safeSearch)) || 
    formatPurchaseInvoiceId(log.originalPurchaseInvoiceId).toLowerCase().includes(safeSearch)) && 
    isWithinDateRange(log.editDate) 
  ); 

  const indexOfLastItem = currentPage * itemsPerPage; 
  const indexOfFirstItem = indexOfLastItem - itemsPerPage; 
  const paginatedPurchaseInvoices = filteredPurchaseInvoices.slice(indexOfFirstItem, indexOfLastItem); 
  const paginatedPurchaseInvoiceHistory = filteredPurchaseInvoiceHistory.slice(indexOfFirstItem, indexOfLastItem); 

  // Pagination Renderer 
  function renderPagination(totalItems) { 
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1; 
    return ( 
      <div className="pagination-wrapper"> 
        <div> 
          <label className="fw-bold">Rows per page:</label> 
          <select className="form-control mb-0 pagination-select" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}> 
            <option value={10}>10</option><option value={20}>20</option><option value={40}>40</option> 
          </select> 
        </div> 
        <div className="pagination-info"> 
          <span className="pagination-text">Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems}</span> 
          <div className="btn-group"> 
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button> 
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button> 
          </div> 
        </div> 
      </div> 
    ) 
  }

  // --- HANDLERS --- 
  function addToPurchaseCart(product) { 
    setPurchaseCart(current => { 
      const existing = current.find(item => item.id === product.id) 
      if (existing) return current.map(item => item.id === product.id ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } : item) 
      return [...current, { ...product, quantity: 1, purchasePrice: product.purchasePrice || 0 }] 
    }); 
  }

  function updatePurchaseQuantity(index, val) { 
    setPurchaseCart(current => { 
      if (val === '') return current.map((itm, idx) => idx === index ? { ...itm, quantity: '' } : itm) 
      const quantity = Number(val) 
      if (quantity < 0) return current 
      return current.map((itm, idx) => idx === index ? { ...itm, quantity } : itm) 
    }); 
  }

  function updatePurchasePrice(index, price) { 
    if (price < 0) return 
    setPurchaseCart(current => current.map((itm, idx) => idx === index ? { ...itm, purchasePrice: price } : itm)); 
  }

  function removePurchaseCartItem(index) { 
    setPurchaseCart(current => current.filter((_, idx) => idx !== index)); 
  }

  function proceedToPurchaseSummary() { 
    if (!purchaseCart.length) return window.alert('Purchase cart is empty.') 
    if (!purchaseSellerName.trim()) return window.alert('Please select or enter a Vendor Name before proceeding.') 
    if (!customInvoiceId.trim()) return window.alert('Please enter the Purchase Invoice ID given by the seller.') 
    if (!purchaseDate) return window.alert('Please select the Date of Purchase.') 
    setView('purchase-summary-screen'); 
  }

  function submitPurchaseCart() { 
    if (editingPurchaseInvoiceId) { 
      purchaseInvoiceService.update( 
        editingPurchaseInvoiceId, purchaseSellerName, purchaseDate, customInvoiceId, purchaseCart, 
        purchaseBillingDetails.subtotal, purchaseDiscountPercent, purchaseBillingDetails.cgst, 
        purchaseBillingDetails.sgst, purchaseBillingDetails.finalTotal, null, null 
      ).then(() => { 
        window.alert(`Purchase Invoice updated successfully!`); resetPurchaseState() 
      }).catch(err => window.alert('Failed to update purchase. ' + err.message)); 
    } else { 
      purchaseInvoiceService.create( 
        purchaseSellerName, purchaseDate, customInvoiceId, purchaseCart, 
        purchaseBillingDetails.subtotal, purchaseDiscountPercent, purchaseBillingDetails.cgst, 
        purchaseBillingDetails.sgst, purchaseBillingDetails.finalTotal, null, null 
      ).then(() => { 
        window.alert(`Purchase Invoice recorded successfully!`); resetPurchaseState() 
      }).catch(err => window.alert('Failed to complete purchase. ' + err.message)); 
    } 
  }

  function resetPurchaseState() { 
    setPurchaseCart([]); 
    setPurchaseSellerName(''); 
    setCustomInvoiceId(''); 
    setPurchaseDate(new Date().toISOString().split('T')[0]); 
    setPurchaseDiscountPercent(0); 
    setPurchaseTaxPercent(5); 
    setEditingPurchaseInvoiceId(null); 
    setView('purchases-list'); 
    loadProducts(); loadPurchaseInvoices(); loadHistory(); 
  }

  function cancelPurchase() { 
    if (window.confirm("Are you sure you want to cancel the current purchase entry?")) resetPurchaseState(); 
  }

  function handleViewPurchaseInvoiceDetails(invoiceId) { 
    purchaseInvoiceService.getPurchaseInvoiceById(invoiceId).then(data => { 
      setSelectedPurchaseInvoice(data); 
      setView('purchase-invoice-details'); 
    }); 
  }

  function handleEditPurchase(invoice) { 
    setEditingPurchaseInvoiceId(invoice.id); 
    setPurchaseSellerName(invoice.sellerName || ''); 
    setCustomInvoiceId(invoice.customInvoiceId || ''); 
    setPurchaseDate(invoice.purchaseDate ? invoice.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0]); 
    setPurchaseDiscountPercent(invoice.discountPercent || 0); 
    const subtotal = invoice.grossTotal || 0; 
    const discountAmt = subtotal * ((invoice.discountPercent || 0) / 100); 
    const taxableAmt = subtotal - discountAmt; 
    const totalTaxPercent = taxableAmt > 0 ? ((invoice.cgst + invoice.sgst) / taxableAmt) * 100 : 5; 
    
    setPurchaseTaxPercent(Math.round(totalTaxPercent)); 
    setPurchaseCart(invoice.items.map(item => ({ 
      ...item.product, id: item.product?.id || item.id, name: item.product?.name || item.name || 'Unknown Product', 
      purchasePrice: item.purchasePrice, quantity: item.quantity, originalQuantity: item.quantity 
    }))); 
    setView('purchase-new'); 
  }

  // Edit History Helpers 
  const parseItems = (json) => { try { return JSON.parse(json) || []; } catch { return []; } }; 
  const renderHistoryItems = (jsonString) => { 
    const items = parseItems(jsonString); 
    if (!items.length) return <tr><td colSpan="3" className="text-muted">No items</td></tr>; 
    return items.map((item, idx) => ( 
      <tr key={idx} className="bg-transparent"> 
        <td className="fw-bold">{item.name || 'Unknown Product'}</td> 
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
        <div className="receipt-row receipt-three-col mb-0-5"><span className="fw-bold text-muted">Total Items:</span><span className="text-right text-muted">{items.length} (Qty: {totalQty})</span></div> 
        <div className="receipt-row receipt-three-col mb-0-5"><span className="fw-bold text-muted">Est. Subtotal:</span><span className="text-right text-muted">{formatMoney(calcSubtotal)}</span></div> 
        <div className="receipt-total receipt-three-col border-top-light"><span className="fw-bold">Final Total:</span><span className="text-right fw-bold text-success fs-lg">{formatMoney(finalTotal)}</span></div> 
      </div> 
    ); 
  }; 

  return ( 
    <> 
      {/* 1. VIEW: NEW PURCHASE ENTRY */} 
      {view === 'purchase-new' && ( 
        <div className="card"> 
          <div className="card-header header-actions"> 
            <h2 className="card-title">{editingPurchaseInvoiceId ? 'Edit Purchase Invoice' : 'New Vendor Purchase'}</h2> 
          </div> 
          
          <div className="sales-control-row mt-1 mb-1-5"> 
            <div className="input-group" style={{ flex: 2 }}> 
              <label>Select Master Vendor / Supplier</label> 
              <div className="dropdown-container"> 
                <input 
                  type="text" className="form-control mb-0" placeholder="Search or select vendor..." 
                  value={purchaseSellerName} 
                  onFocus={() => setIsSellerDropdownOpen(true)} 
                  onBlur={() => setTimeout(() => setIsSellerDropdownOpen(false), 200)} 
                  onChange={e => { setPurchaseSellerName(e.target.value); setIsSellerDropdownOpen(true); }} 
                /> 
                {isSellerDropdownOpen && ( 
                  <ul className="dropdown-menu"> 
                    {dropdownFilteredSellers.length > 0 ? dropdownFilteredSellers.map((vendor) => ( 
                      <li key={vendor.id} className="dropdown-item fw-bold" onMouseDown={() => { setPurchaseSellerName(vendor.name); setIsSellerDropdownOpen(false); }}> 
                        {vendor.name} {vendor.city && <span className="text-muted fs-sm" style={{fontWeight: 'normal'}}>| {vendor.city}</span>} 
                      </li> 
                    )) : <li className="dropdown-empty">Type to add a new seller</li>} 
                  </ul> 
                )} 
              </div> 
            </div> 
            <div className="input-group" style={{ flex: 1 }}> 
              <label>Bill/Invoice Number</label> 
              <input type="text" className="form-control mb-0" placeholder="e.g. INV-2026-99" value={customInvoiceId} onChange={e => setCustomInvoiceId(e.target.value)} /> 
            </div> 
            <div className="input-group" style={{ flex: 1 }}> 
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
                    <td><span className="product-name-large">{item.name || 'Unknown Product'}</span></td> 
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

      {/* 2. VIEW: PURCHASE SUMMARY/PAYMENT */} 
      {view === 'purchase-summary-screen' && ( 
        <div className="card"> 
          <div className="card-header header-actions"> 
            <h2 className="card-title">Purchase Summary</h2> 
            <button className="btn btn-secondary action-buttons-right" onClick={() => setView('purchase-new')}>Back to Edit</button> 
          </div> 
          
          <div className="invoice-summary-grid margin-top-large"> 
            <div className="info-block"><span className="info-label">Vendor Name</span><strong className="info-value">{purchaseSellerName}</strong></div> 
            <div className="info-block"><span className="info-label">Invoice Number</span><strong className="info-value">{customInvoiceId}</strong></div> 
            <div className="info-block"><span className="info-label">Purchase Date</span><strong className="info-value">{new Date(purchaseDate).toLocaleDateString()}</strong></div> 
          </div> 
          <div className="receipt-wrapper mt-2"> 
            <div className="receipt-panel full-width-panel"> 
              <div className="receipt-row receipt-three-col"><span className="fw-bold">Subtotal:</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(purchaseBillingDetails.subtotal)}</span></div> 
              <div className="receipt-row receipt-three-col"> 
                <span className="fw-bold">Discount:</span> 
                <div className="input-with-symbol"><input type="number" min="0" max="100" value={purchaseDiscountPercent} onChange={e => setPurchaseDiscountPercent(Number(e.target.value))} className="form-control discount-input" /><span className="text-muted">%</span></div> 
                <span className="text-right text-danger">-{formatMoney(purchaseBillingDetails.discountAmount)}</span> 
              </div> 
              <div className="receipt-row receipt-three-col"> 
                <span className="fw-bold">Tax:</span> 
                <div className="input-with-symbol"><input type="number" min="0" max="100" value={purchaseTaxPercent} onChange={e => setPurchaseTaxPercent(Number(e.target.value))} className="form-control discount-input" /><span className="text-muted">%</span></div> 
                <span className="text-right"></span> 
              </div> 
              <div className="receipt-row receipt-three-col"><span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(purchaseBillingDetails.taxableAmount)}</span></div> 
              <div className="receipt-row receipt-three-col"><span className="text-muted">CGST:</span><span className="text-center text-muted">{purchaseBillingDetails.cgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(purchaseBillingDetails.cgst)}</span></div> 
              <div className="receipt-row receipt-three-col"><span className="text-muted">SGST:</span><span className="text-center text-muted">{purchaseBillingDetails.sgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(purchaseBillingDetails.sgst)}</span></div> 
              <div className="receipt-row receipt-three-col"><span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span><span className="text-right">{purchaseBillingDetails.roundoff > 0 ? '+' : ''}{formatMoney(purchaseBillingDetails.roundoff)}</span></div> 
              <div className="receipt-total receipt-three-col"><span>Final Total:</span><span className="text-center text-muted"></span><span className="text-success text-right">{formatMoney(purchaseBillingDetails.finalTotal)}</span></div> 
              <button className="btn btn-success btn-checkout" onClick={submitPurchaseCart}>{editingPurchaseInvoiceId ? 'Update Purchase Invoice' : 'Confirm & Save Purchase'}</button> 
            </div> 
          </div> 
        </div> 
      )} 

      {/* 3. VIEW: PURCHASES MASTER LIST */} 
      {view === 'purchases-list' && ( 
        <div className="card"> 
          <div className="card-header header-actions header-actions-wrap"> 
            <h2 className="card-title mb-0">Purchase List</h2> 
            <div className="header-filters-group"> 
              <input 
                type="text" className="form-control mb-0 search-input-md" placeholder="Search by Seller or ID..." 
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              /> 
              {renderDateFilter()} 
            </div> 
          </div> 
          <div className="table-responsive"> 
            <table className="block-table data-table"> 
              <thead><tr><th>System ID</th><th>Vendor Name</th><th>Vendor Bill No</th><th>Total Amount</th><th>Date</th><th>Action</th></tr></thead> 
              <tbody> 
                {paginatedPurchaseInvoices.length ? paginatedPurchaseInvoices.map(invoice => ( 
                  <tr key={invoice.id} className="product-row available" onClick={(e) => { if (e.target.tagName !== 'BUTTON') handleViewPurchaseInvoiceDetails(invoice.id); }}> 
                    <td className="fw-bold cell-padded">{formatPurchaseInvoiceId(invoice.id)}</td> 
                    <td className="cell-padded">{invoice.sellerName}</td> 
                    <td className="cell-padded">{invoice.customInvoiceId || 'N/A'}</td> 
                    <td className="price-text fw-bold cell-padded">{formatMoney(invoice.finalTotal)}</td> 
                    <td className="cell-padded">{new Date(invoice.purchaseDate).toLocaleDateString('en-GB')}</td> 
                    <td className="cell-padded"><button className="btn btn-warning" onClick={(e) => { e.stopPropagation(); handleEditPurchase(invoice); }}>Edit</button></td> 
                  </tr> 
                )) : <tr><td colSpan={6} className="empty-state">No purchases found for this date range.</td></tr>} 
              </tbody> 
            </table> 
          </div> 
          {renderPagination(filteredPurchaseInvoices.length)} 
        </div> 
      )} 

      {/* 4. VIEW: PURCHASE INVOICE DETAILS */} 
      {view === 'purchase-invoice-details' && selectedPurchaseInvoice && selectedPurchaseInvoiceMath && ( 
        <div className="card"> 
          <div className="card-header header-actions"> 
            <h2 className="card-title">Purchase {formatPurchaseInvoiceId(selectedPurchaseInvoice.id)} Details</h2> 
            <button className="btn btn-secondary action-buttons-right" onClick={() => { setSelectedPurchaseInvoice(null); setView('purchases-list'); }}>Back to Purchases</button> 
          </div> 
          
          <div className="invoice-summary-grid margin-top-large"> 
            <div className="info-block"><span className="info-label">Vendor Name</span><strong className="info-value">{selectedPurchaseInvoice.sellerName}</strong></div> 
            <div className="info-block"><span className="info-label">Vendor Bill No</span><strong className="info-value">{selectedPurchaseInvoice.customInvoiceId || 'N/A'}</strong></div> 
            <div className="info-block"><span className="info-label">Purchase Date</span><strong className="info-value">{new Date(selectedPurchaseInvoice.purchaseDate).toLocaleDateString('en-GB')}</strong></div> 
          </div> 
          
          <h4 className="section-title-spacing">Items Received</h4> 
          <div className="table-responsive table-margin-bottom"> 
            <table className="data-table"> 
              <thead><tr><th>S.No</th><th>Product</th><th>Buy Price</th><th>Qty</th><th>Total</th></tr></thead> 
              <tbody> 
                {selectedPurchaseInvoice.items?.map((item, idx) => ( 
                  <tr key={idx}> 
                    <td className="fw-bold">{idx + 1}</td> 
                    <td><span className="product-name-large">{item.product?.name || item.name || 'Unknown Product'}</span></td> 
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
              <div className="receipt-row receipt-three-col"><span className="fw-bold">Subtotal:</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.subtotal)}</span></div> 
              {selectedPurchaseInvoiceMath.discountPercent > 0 && ( 
                <div className="receipt-row receipt-three-col highlight-red"><span className="fw-bold">Discount:</span><span className="text-center text-muted">{selectedPurchaseInvoiceMath.discountPercent}%</span><span className="text-right text-danger">-{formatMoney(selectedPurchaseInvoiceMath.discountAmount)}</span></div> 
              )} 
              {selectedPurchaseInvoiceMath.totalTaxPercent > 0 && ( 
                <> 
                  <div className="receipt-row receipt-three-col"><span className="fw-bold">Total Tax:</span><span className="text-center text-muted">{selectedPurchaseInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right"></span></div> 
                  <div className="receipt-row receipt-three-col"><span className="text-muted">Subtotal (Excl. Tax):</span><span className="text-center text-muted"></span><span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.taxableAmount)}</span></div> 
                  <div className="receipt-row receipt-three-col"><span className="text-muted">CGST:</span><span className="text-center text-muted">{selectedPurchaseInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.cgst)}</span></div> 
                  <div className="receipt-row receipt-three-col"><span className="text-muted">SGST:</span><span className="text-center text-muted">{selectedPurchaseInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%</span><span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.sgst)}</span></div> 
                </> 
              )} 
              <div className="receipt-row receipt-three-col"><span className="text-muted">Roundoff:</span><span className="text-center text-muted"></span><span className="text-right">{selectedPurchaseInvoiceMath.roundoff > 0 ? '+' : ''}{formatMoney(selectedPurchaseInvoiceMath.roundoff)}</span></div> 
              <div className="receipt-total receipt-three-col"><span>Final Total:</span><span className="text-center text-muted"></span><span className="fw-bold text-right text-success">{formatMoney(selectedPurchaseInvoiceMath.finalTotal)}</span></div> 
            </div> 
          </div> 
        </div> 
      )} 

      {/* 5. VIEW: PURCHASE EDIT HISTORY LOGS */} 
      {view === 'purchase-edit-history' && ( 
        <div className="card"> 
          <div className="card-header header-actions header-actions-wrap"> 
            <h2 className="card-title mb-0">Purchase Edit History</h2> 
            <div className="header-filters-group"> 
              <input 
                type="text" className="form-control mb-0 search-input-md" placeholder="Search seller or ID..." 
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
              /> 
              {renderDateFilter()} 
            </div> 
          </div> 
          
          <div className="table-responsive"> 
            <table className="block-table data-table"> 
              <thead><tr><th>Edit Date</th><th>Original Purchase ID</th><th>Vendor Name</th><th>Details</th></tr></thead> 
              <tbody> 
                {paginatedPurchaseInvoiceHistory.length ? paginatedPurchaseInvoiceHistory.map(log => ( 
                  <tr key={log.id} className="product-row available"> 
                    <td className="cell-padded">{new Date(log.editDate).toLocaleDateString('en-GB')}</td> 
                    <td className="fw-bold cell-padded">{formatPurchaseInvoiceId(log.originalPurchaseInvoiceId)}</td> 
                    <td className="cell-padded">{log.sellerName}</td> 
                    <td className="cell-padded"> 
                      <button className="btn btn-secondary" onClick={() => { setHistoryCompareData(log); setView('purchase-edit-compare'); }}>View Comparison</button> 
                    </td> 
                  </tr> 
                )) : <tr><td colSpan={4} className="empty-state">No purchase edit history found for this date range.</td></tr>} 
              </tbody> 
            </table> 
          </div> 
          {renderPagination(filteredPurchaseInvoiceHistory.length)} 
        </div> 
      )} 

      {/* 6. VIEW: PURCHASE EDIT COMPARISON */} 
      {view === 'purchase-edit-compare' && historyCompareData && ( 
        <div className="card"> 
          <div className="card-header header-actions"> 
            <h2 className="card-title">Compare Edits: {formatPurchaseInvoiceId(historyCompareData.originalPurchaseInvoiceId)}</h2> 
            <button className="btn btn-secondary action-buttons-right" onClick={() => { setHistoryCompareData(null); setView('purchase-edit-history'); }}>Back to Edit History</button> 
          </div> 
          <div className="mb-2-bg"> 
            <span className="fw-bold text-slate">Vendor: </span> {historyCompareData.sellerName} &nbsp;|&nbsp; 
            <span className="fw-bold text-slate"> Edited On: </span> {new Date(historyCompareData.editDate).toLocaleString('en-GB')} 
          </div> 
          <div className="comparison-grid"> 
            <div className="snapshot-old-wrapper"> 
              <h3 className="snapshot-title-old">Old Purchase Snapshot</h3> 
              <div className="table-res-old"> 
                <table className="data-table comparison-table mb-0 border-none bg-transparent"> 
                  <thead className="sticky-th-light-no-z"><tr><th className="th-old th-old-tinted">Product</th><th className="th-old th-old-tinted">Qty</th><th className="th-old th-old-tinted">Price</th></tr></thead> 
                  <tbody>{renderHistoryItems(historyCompareData.oldItemsJson)}</tbody> 
                </table> 
              </div> 
              {renderHistorySummary(historyCompareData.oldItemsJson, historyCompareData.oldFinalTotal)} 
            </div> 
            <div className="snapshot-new-wrapper"> 
              <h3 className="snapshot-title-new">New Purchase Snapshot</h3> 
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

      {/* --- MODAL: Add Product To Purchase Cart --- */} 
      {showAddPurchaseProductModal && ( 
        <div className="modal-overlay no-print"> 
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}> 
            <div className="card-header header-actions border-none" style={{ paddingBottom: '0', marginBottom: '10px' }}> 
              <h3 className="modal-header-title mb-0">Select Purchase Products</h3> 
              <button className="btn btn-secondary action-buttons-right btn-sm" onClick={() => { setShowAddPurchaseProductModal(false); setSearchQuery(''); }}>Close</button> 
            </div> 
            
            <div className="form-group" style={{ marginBottom: '10px' }}> 
              <input 
                type="text" className="form-control mb-0" placeholder="Search product name, HSN code or Product ID..." 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                style={{ padding: '0.6rem' }} 
              /> 
            </div> 
            
            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', margin: 0 }}> 
              <table className="data-table table-fixed" style={{ fontSize: '0.9rem' }}> 
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}> 
                  <tr> 
                    <th className="col-15" style={{ padding: '0.5rem' }}>ID</th> 
                    <th className="col-30" style={{ padding: '0.5rem' }}>Product Name</th> 
                    <th className="col-15" style={{ padding: '0.5rem' }}>HSN Code</th> 
                    <th className="col-15" style={{ padding: '0.5rem' }}>Buy Price</th> 
                    <th className="col-15" style={{ padding: '0.5rem' }}>Stock</th> 
                  </tr> 
                </thead> 
                <tbody> 
                  {filteredProducts.map(product => { 
                    return ( 
                      <tr key={product.id} className="clickable-row available" onClick={() => addToPurchaseCart(product)} title="Click block to add to purchase cart"> 
                        <td className="fw-bold" style={{ padding: '0.4rem 0.5rem' }}>{formatProductId(product.id)}</td> 
                        <td className="col-product-name" style={{ padding: '0.4rem 0.5rem', fontSize: '1rem' }}>{product.name}</td> 
                        <td style={{ padding: '0.4rem 0.5rem' }}>{product.hsnCode || 'N/A'}</td> 
                        <td className="price-text text-warning" style={{ padding: '0.4rem 0.5rem' }}>{formatMoney(product.purchasePrice)}</td> 
                        <td className="fw-bold text-dark-muted" style={{ padding: '0.4rem 0.5rem' }}>{product.stock} Units</td> 
                      </tr> 
                    ) 
                  })} 
                  {filteredProducts.length === 0 && <tr><td colSpan={5} className="empty-state" style={{ padding: '2rem' }}>No products found.</td></tr>} 
                </tbody> 
              </table> 
            </div> 
          </div> 
        </div> 
      )} 
    </> 
  ); 
}