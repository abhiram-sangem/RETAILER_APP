import React, { useState, useEffect, useMemo } from 'react';
import { formatReceiptId, formatInvoiceId, formatMoney } from '../utils/formatters';
import { receiptService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ReceiptManager({ view, setView, customers, receipts, receiptHistory = [], invoices = [], loadCustomers, loadReceipts, loadHistory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Top Level Config
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false);
  const [receiptMethod, setReceiptMethod] = useState('Cash');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [customReceiptId, setCustomReceiptId] = useState('');
  
  // Global Payment Inputs
  const [globalAmount, setGlobalAmount] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [globalRemarks, setGlobalRemarks] = useState('');

  const [rowPayments, setRowPayments] = useState({});
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null, customerId: null, customerName: '', amount: '', discountAmount: '', paymentMode: 'Cash', receiptDate: '', remarks: '', customReceiptId: ''
  });
  const [historyCompareData, setHistoryCompareData] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilterRange, startDate, endDate, itemsPerPage, view]);

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

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

  const safeSearch = (searchQuery || '').toLowerCase();
  const safeReceiptSearch = (receiptSearch || '').toLowerCase();

  // 🚀 NEW: TRUE DYNAMIC BALANCE ENGINE (Matches the Ledger perfectly)
  const trueBalances = useMemo(() => {
    const balances = {};
    customers.forEach(c => balances[c.id] = 0);
    
    invoices.forEach(inv => {
      const normalizeName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const invNameNorm = normalizeName(inv.customerName);
      const cust = customers.find(c => normalizeName(c.name) === invNameNorm);
      
      if (cust && inv.paymentMethod === 'Pay Later') {
        const amount = Math.abs(Number(inv.finalTotal || inv.totalAmount || 0));
        if (!inv.isReturn) balances[cust.id] += amount;
        else balances[cust.id] -= amount; 
      }
    });

    receipts.forEach(rec => {
      const normalizeName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const recNameNorm = normalizeName(rec.customerName);
      const cust = customers.find(c => String(c.id) === String(rec.customerId) || normalizeName(c.name) === recNameNorm);
      
      if (cust) {
        balances[cust.id] -= (Number(rec.amount) + Number(rec.discountAmount || 0));
      }
    });
    
    return balances;
  }, [customers, invoices, receipts]);

  const receiptFilteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(safeReceiptSearch)) ||
    (c.mobile && c.mobile.includes(safeReceiptSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeReceiptSearch))
  );

  const filteredReceipts = receipts.filter(r => 
    ((r.customerName && r.customerName.toLowerCase().includes(safeSearch)) ||
    (r.paymentMode && r.paymentMode.toLowerCase().includes(safeSearch)) ||
    (r.customReceiptId && r.customReceiptId.toLowerCase().includes(safeSearch)) ||
    formatReceiptId(r.id).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(r.receiptDate)
  );

  const filteredReceiptHistory = receiptHistory.filter(log => 
    ((log.customerName && log.customerName.toLowerCase().includes(safeSearch)) ||
    formatReceiptId(log.originalReceiptId).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(log.editDate)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedReceiptHistory = filteredReceiptHistory.slice(indexOfFirstItem, indexOfLastItem);

  // 🚀 UPGRADED: FIFO Math using actual Receipts and Returns, not static DB balances
  const pendingBills = useMemo(() => {
    if (!activeCustomer) return [];
    const targetNameNorm = (activeCustomer.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // 1. Calculate true historical credits (Payments + Returns)
    let totalCredits = 0;
    receipts.forEach(r => {
      const recNameNorm = (r.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (r.customerId === activeCustomer.id || recNameNorm === targetNameNorm) {
        totalCredits += (Number(r.amount) + Number(r.discountAmount || 0));
      }
    });
    invoices.forEach(inv => {
      const invNameNorm = (inv.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (inv.isReturn && invNameNorm === targetNameNorm) {
        totalCredits += Math.abs(Number(inv.finalTotal || inv.totalAmount || 0));
      }
    });

    // 2. Sort Pay Later bills OLDEST first
    const payLaterBills = invoices
      .filter(inv => !inv.isReturn && inv.paymentMethod === 'Pay Later' && ((inv.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === targetNameNorm))
      .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());

    const pending = [];

    // 3. Apply credits progressively to find genuinely unpaid amounts
    for (const bill of payLaterBills) {
      const originalAmount = Number(bill.finalTotal || bill.totalAmount || 0);
      let due = originalAmount;
      let paid = 0;

      if (totalCredits >= due) {
        // Fully paid by past history, skip it
        totalCredits -= due;
      } else if (totalCredits > 0) {
        // Partially paid
        paid = totalCredits;
        due -= totalCredits;
        totalCredits = 0;
        pending.push({ ...bill, originalAmount, previouslyPaid: paid, dueAmount: due });
      } else {
        // Completely unpaid
        pending.push({ ...bill, originalAmount, previouslyPaid: 0, dueAmount: due });
      }
    }
    
    // Reverse so the UI displays newest first
    return pending.reverse();
  }, [activeCustomer, invoices, receipts]);

  const liveAutoAllocation = useMemo(() => {
    const currentPayment = Number(globalAmount || 0) + Number(globalDiscount || 0);
    let remainingPayment = currentPayment;
    
    const reversedPending = [...pendingBills].reverse();
    const allocatedReversed = reversedPending.map(bill => {
      let allocated = 0;
      let status = 'Pending';
      if (remainingPayment >= bill.dueAmount) {
        allocated = bill.dueAmount;
        remainingPayment -= bill.dueAmount;
        status = 'Clearing Now';
      } else if (remainingPayment > 0) {
        allocated = remainingPayment;
        remainingPayment = 0;
        status = 'Partial Clear';
      }
      return { ...bill, allocated, status };
    });
    
    return allocatedReversed.reverse();
  }, [pendingBills, globalAmount, globalDiscount]);

  const submitGlobalPayment = () => {
    if (!activeCustomer) return window.alert("Please select a customer.");
    if (!globalAmount || Number(globalAmount) <= 0) return window.alert("Please enter a valid amount.");

    const finalRemarks = globalRemarks || 'Auto-allocated payment';

    receiptService.create(activeCustomer.id, globalAmount, globalDiscount, receiptMethod, receiptDate, finalRemarks, customReceiptId)
      .then(() => {
        window.alert(`Payment of ${formatMoney(globalAmount)} successfully applied!`);
        setGlobalAmount(''); setGlobalDiscount(''); setGlobalRemarks(''); setCustomReceiptId('');
        loadCustomers(); loadReceipts(); loadHistory();
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
  };

  const handleRowInputChange = (billId, field, value) => {
    setRowPayments(prev => ({ ...prev, [billId]: { ...prev[billId], [field]: value } }));
  };

  const handleFullPaymentClick = (bill) => {
    handleRowInputChange(bill.id, 'amount', bill.dueAmount.toFixed(2));
    handleRowInputChange(bill.id, 'discount', '');
  };

  const submitRowPayment = (bill) => {
    const inputAmt = Number(rowPayments[bill.id]?.amount || 0);
    const inputDisc = Number(rowPayments[bill.id]?.discount || 0);
    const totalRowPayment = inputAmt + inputDisc;

    if (totalRowPayment <= 0) return window.alert("Please enter a payment or discount amount.");
    if (totalRowPayment > bill.dueAmount) return window.alert(`Cannot pay more than the remaining due amount.`);

    const finalRemarks = `Auto-Allocated to ${formatInvoiceId(bill.id)}`;

    receiptService.create(activeCustomer.id, inputAmt, inputDisc, receiptMethod, receiptDate, finalRemarks, customReceiptId)
      .then(() => {
        window.alert(`Payment securely logged specifically against ${formatInvoiceId(bill.id)}!`);
        setRowPayments(prev => ({ ...prev, [bill.id]: { amount: '', discount: '' } }));
        setCustomReceiptId('');
        loadCustomers(); loadReceipts(); loadHistory();
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
  };

  const handleEditClick = (rec, e) => {
    e.stopPropagation();
    setEditForm({
      id: rec.id,
      customerId: rec.customerId,
      customerName: rec.customerName,
      amount: rec.amount,
      discountAmount: rec.discountAmount || '',
      paymentMode: rec.paymentMode || 'Cash',
      receiptDate: rec.receiptDate ? rec.receiptDate.split('T')[0] : new Date().toISOString().split('T')[0],
      remarks: rec.remarks || '',
      customReceiptId: rec.customReceiptId || ''
    });
    setShowEditModal(true);
  };

  const submitReceiptEdit = () => {
    if (!editForm.amount || Number(editForm.amount) <= 0) return window.alert("Amount must be greater than zero.");
    
    receiptService.update(
      editForm.id, editForm.customerId, editForm.amount, editForm.discountAmount, 
      editForm.paymentMode, editForm.receiptDate, editForm.remarks, editForm.customReceiptId
    ).then(() => {
      window.alert("Receipt updated successfully! The customer's ledger balance has been automatically adjusted.");
      setShowEditModal(false);
      loadReceipts(); loadCustomers(); loadHistory();
    }).catch(err => window.alert("Failed to update receipt: " + err.message));
  };

  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    return (
      <div className="pagination-wrapper">
        <div>
          <label className="fw-bold">Rows per page:</label>
          <select className="form-control mb-0 pagination-select" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}>
            <option value={10}>10</option><option value={20}>20</option><option value={40}>40</option><option value={100}>100</option>
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
    );
  }

  const isAutoModeActive = Number(globalAmount) > 0 || Number(globalDiscount) > 0;

  return (
    <>
      {view === 'receipts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card mb-0">
            <div className="card-header border-bottom-padded mb-1">
              <h2 className="card-title mb-0">Receipt Configuration</h2>
            </div>
            
            <div className="sales-control-panel bg-transparent p-0 border-none shadow-none mt-1">
              <div className="sales-control-row">
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="form-label">Select Customer:</label>
                  <div className="dropdown-container">
                    <input
                      type="text" className="form-control mb-0" placeholder="Search customer name or phone..."
                      value={receiptSearch} onFocus={() => setIsReceiptDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsReceiptDropdownOpen(false), 200)}
                      onChange={e => { 
                        setReceiptSearch(e.target.value); 
                        setIsReceiptDropdownOpen(true); 
                        setSelectedCustomerId(null); 
                        setRowPayments({});
                        setGlobalAmount('');
                      }}
                    />
                    {isReceiptDropdownOpen && (
                      <ul className="dropdown-menu">
                        {receiptFilteredCustomers.length > 0 ? receiptFilteredCustomers.map(c => (
                          <li key={c.id} className="dropdown-item" onMouseDown={() => { 
                            setSelectedCustomerId(c.id); setReceiptSearch(c.name); setIsReceiptDropdownOpen(false); 
                            setRowPayments({}); setGlobalAmount('');
                          }}>
                            <span className="fw-bold">{c.name}</span>
                            <span className="dropdown-location">{trueBalances[c.id] > 0 ? ` (Due: ${formatMoney(trueBalances[c.id])})` : ''}</span>
                          </li>
                        )) : <li className="dropdown-empty">No customers found</li>}
                      </ul>
                    )}
                  </div>
                </div>
                
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="form-label">Receipt Date:</label>
                  <input type="date" className="form-control mb-0" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="form-label">Payment Mode:</label>
                  <select className="form-control mb-0" value={receiptMethod} onChange={e => setReceiptMethod(e.target.value)}>
                    <option value="Cash">Cash</option><option value="PhonePe">PhonePe</option><option value="GPay">GPay</option>
                    <option value="Cheque">Cheque</option><option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="form-label">Receipt No (Optional):</label>
                  <input type="text" className="form-control mb-0" value={customReceiptId} onChange={e => setCustomReceiptId(e.target.value)} placeholder="Auto-gen if empty" />
                </div>
              </div>

              <div className="sales-control-row mt-1-5 p-1 bg-slate-50 border-light border-radius-md" style={{ border: '1px solid #cbd5e1' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="form-label text-primary fw-bold">Amount Received (₹):</label>
                  <input type="number" className="form-control mb-0 fs-xl fw-bold text-success" value={globalAmount} onChange={e => setGlobalAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="form-label fw-bold">Discount / Less (₹):</label>
                  <input type="number" className="form-control mb-0 fs-xl fw-bold text-danger" value={globalDiscount} onChange={e => setGlobalDiscount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: 2 }}>
                  <label className="form-label">Remarks / Note:</label>
                  <input type="text" className="form-control mb-0" value={globalRemarks} onChange={e => setGlobalRemarks(e.target.value)} placeholder="e.g. Account settlement" />
                </div>
                <div className="action-buttons-right mt-auto">
                  <button className="btn btn-primary fs-lg px-2" onClick={submitGlobalPayment} disabled={!isAutoModeActive}>Save Payment</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-0">
            <div className="card-header border-none pb-0">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="text-slate mb-0">Invoice Payment Allocation</h3>
                  <p className="text-muted mt-0-5 mb-0">
                    {isAutoModeActive ? "Auto-Allocation Active: Watch your payment cascade from the oldest bill upwards." : "Surgical Mode: Enter a payment amount directly in the row for a specific invoice."}
                  </p>
                </div>
                {activeCustomer && (
                  <div className="receipt-summary-box p-1 mt-0" style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {isAutoModeActive && (
                      <div><span className="text-muted fw-bold d-block fs-sm">Total Input:</span><strong className="fs-xl text-success">{formatMoney(Number(globalAmount) + Number(globalDiscount))}</strong></div>
                    )}
                    <div style={{ borderLeft: isAutoModeActive ? '1px solid #cbd5e1' : 'none', paddingLeft: isAutoModeActive ? '20px' : '0' }}>
                      <span className="text-muted fw-bold d-block fs-sm">Total Customer Ledger Due:</span>
                      <strong className="fs-lg text-danger">{formatMoney(trueBalances[activeCustomer.id] || 0)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-1-5">
              {!activeCustomer ? (
                <div className="empty-state text-muted" style={{ padding: '3rem 1rem' }}>Select a customer to view pending bills.</div>
              ) : pendingBills.length === 0 ? (
                <div className="empty-state text-success fw-bold" style={{ padding: '3rem 1rem' }}>🎉 This customer has no pending 'Pay Later' bills!</div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="data-table border-none mb-0 w-100">
                    <thead className="sticky-th-light">
                      <tr>
                        <th>Bill Date</th>
                        <th>Bill No</th>
                        <th className="text-right">Bill Total</th>
                        <th className="text-right">Prev. Paid</th>
                        <th className="text-right text-danger">Remaining Due</th>
                        {isAutoModeActive ? (
                          <>
                            <th className="text-right text-success">Auto-Allocation</th>
                            <th className="text-center">Status</th>
                          </>
                        ) : (
                          <>
                            <th className="text-center" style={{ width: '130px' }}>Pay Specific Amount</th>
                            <th className="text-center" style={{ width: '110px' }}>Discount</th>
                            <th className="text-center" style={{ width: '160px' }}>Action</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {liveAutoAllocation.map(bill => {
                        const currentAmt = rowPayments[bill.id]?.amount || '';
                        const currentDisc = rowPayments[bill.id]?.discount || '';
                        
                        return (
                          <tr key={bill.id} className="available" style={{ 
                            backgroundColor: bill.status === 'Clearing Now' ? '#f0fdf4' : (bill.status === 'Partial Clear' ? '#fefce8' : 'transparent'),
                            transition: 'background-color 0.3s'
                          }}>
                            <td className="text-muted align-middle">{new Date(bill.orderDate).toLocaleDateString('en-GB')}</td>
                            <td className="fw-bold align-middle">{formatInvoiceId(bill.id)}</td>
                            <td className="text-right fw-bold text-slate align-middle">{formatMoney(bill.originalAmount)}</td>
                            <td className="text-right fw-bold text-warning align-middle">{bill.previouslyPaid > 0 ? formatMoney(bill.previouslyPaid) : '-'}</td>
                            <td className="text-right fw-bold text-danger align-middle fs-lg">{formatMoney(bill.dueAmount)}</td>
                            
                            {isAutoModeActive ? (
                              <>
                                <td className="text-right fw-bold text-success fs-lg">{bill.allocated > 0 ? `+${formatMoney(bill.allocated)}` : '-'}</td>
                                <td className="text-center">
                                  {bill.status === 'Clearing Now' && <span className="badge btn-success text-white">Clearing</span>}
                                  {bill.status === 'Partial Clear' && <span className="badge btn-warning text-dark">Partial</span>}
                                  {bill.status === 'Pending' && <span className="badge bg-slate-200">Pending</span>}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="align-middle">
                                  <input type="number" className="form-control mb-0 text-success fw-bold text-center" placeholder="0.00" 
                                    value={currentAmt} onChange={e => handleRowInputChange(bill.id, 'amount', e.target.value)} />
                                </td>
                                <td className="align-middle">
                                  <input type="number" className="form-control mb-0 text-danger fw-bold text-center" placeholder="0.00" 
                                    value={currentDisc} onChange={e => handleRowInputChange(bill.id, 'discount', e.target.value)} />
                                </td>
                                <td className="text-center align-middle">
                                  <div className="btn-group" style={{ justifyContent: 'center' }}>
                                    <button className="btn btn-secondary btn-sm mb-0" onClick={() => handleFullPaymentClick(bill)}>Fill Full</button>
                                    <button className="btn btn-primary btn-sm mb-0 px-3" onClick={() => submitRowPayment(bill)}>Pay</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. VIEW: MASTER RECEIPTS LIST */}
      {view === 'receipts-list' && (
        <div className="card">
          <div className="card-header header-actions header-actions-wrap">
            <h2 className="card-title mb-0">Master Receipts List</h2>
            <div className="header-filters-group">
              <input type="text" className="form-control mb-0 search-input-md" placeholder="Search Customer or Receipt No..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
              {renderDateFilter()}
            </div>
          </div>
          <div className="table-responsive">
            <table className="block-table data-table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Amount Received</th>
                  <th>Less (Discount)</th>
                  <th>Total Settled</th>
                  <th>Payment Mode</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReceipts.length ? paginatedReceipts.map(rec => {
                  const settledAmount = Number(rec.amount) + Number(rec.discountAmount || 0);
                  return (
                  <tr key={rec.id} className="product-row available" onClick={() => setViewingReceipt(rec)}>
                    <td className="fw-bold cell-padded text-primary">{rec.customReceiptId || formatReceiptId(rec.id)}</td>
                    <td className="cell-padded">{new Date(rec.receiptDate).toLocaleDateString('en-GB')}</td>
                    <td className="fw-bold cell-padded">{rec.customerName}</td>
                    <td className="price-text text-success fw-bold fs-lg cell-padded">{formatMoney(rec.amount)}</td>
                    <td className="cell-padded text-danger fw-bold">{rec.discountAmount > 0 ? formatMoney(rec.discountAmount) : '-'}</td>
                    <td className="price-text text-slate fw-bold cell-padded">{formatMoney(settledAmount)}</td>
                    <td className="cell-padded"><span className="badge">{rec.paymentMode}</span></td>
                    <td className="cell-padded text-center">
                      <button className="btn btn-warning btn-sm" onClick={(e) => handleEditClick(rec, e)}>Edit</button>
                    </td>
                  </tr>
                )}) : <tr><td colSpan={8} className="empty-state">No receipts found for this date range.</td></tr>}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredReceipts.length)}
        </div>
      )}

      {/* 3. VIEW: RECEIPT EDIT HISTORY LOGS */}
      {view === 'receipt-edit-history' && (
        <div className="card">
          <div className="card-header header-actions header-actions-wrap">
            <h2 className="card-title mb-0">Receipt Edit History</h2>
            <div className="header-filters-group">
              <input type="text" className="form-control mb-0 search-input-md" placeholder="Search Customer or ID..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
              {renderDateFilter()}
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="block-table data-table">
              <thead><tr><th>Edit Date</th><th>Original Receipt ID</th><th>Customer Name</th><th>Details</th></tr></thead>
              <tbody>
                {paginatedReceiptHistory.length ? paginatedReceiptHistory.map(log => (
                  <tr key={log.id} className="product-row available">
                    <td className="cell-padded">{new Date(log.editDate).toLocaleDateString('en-GB')}</td>
                    <td className="fw-bold cell-padded">{formatReceiptId(log.originalReceiptId)}</td>
                    <td className="cell-padded">{log.customerName}</td>
                    <td className="cell-padded">
                      <button className="btn btn-secondary" onClick={() => { setHistoryCompareData(log); setView('receipt-edit-compare'); }}>View Comparison</button>
                    </td>
                  </tr>
                )) : <tr><td colSpan={4} className="empty-state">No receipt edit history found for this date range.</td></tr>}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredReceiptHistory.length)}
        </div>
      )}

      {/* 4. VIEW: RECEIPT EDIT COMPARISON */}
      {view === 'receipt-edit-compare' && historyCompareData && (
        <div className="card">
          <div className="card-header header-actions">
            <h2 className="card-title">Compare Edits: {formatReceiptId(historyCompareData.originalReceiptId)}</h2>
            <button className="btn btn-secondary action-buttons-right" onClick={() => { setHistoryCompareData(null); setView('receipt-edit-history'); }}>Back to Edit History</button>
          </div>
          <div className="mb-2-bg">
            <span className="fw-bold text-slate">Customer: </span> {historyCompareData.customerName} &nbsp;|&nbsp;
            <span className="fw-bold text-slate"> Edited On: </span> {new Date(historyCompareData.editDate).toLocaleString('en-GB')}
          </div>

          <div className="comparison-grid">
            <div className="snapshot-old-wrapper" style={{ padding: '20px' }}>
              <h3 className="snapshot-title-old">Old Receipt Values</h3>
              <div className="receipt-panel receipt-summary-box">
                <div className="receipt-row receipt-three-col mb-0-5">
                  <span className="fw-bold text-muted">Amount Received:</span>
                  <span className="text-right fw-bold text-success">{formatMoney(historyCompareData.oldAmount || 0)}</span>
                </div>
                <div className="receipt-row receipt-three-col mb-0-5">
                  <span className="fw-bold text-muted">Less (Discount):</span>
                  <span className="text-right text-danger">{formatMoney(historyCompareData.oldDiscount || 0)}</span>
                </div>
                <div className="receipt-total receipt-three-col border-top-light">
                  <span className="fw-bold">Total Ledger Adjustment:</span>
                  <span className="text-right fw-bold text-slate fs-lg">{formatMoney((historyCompareData.oldAmount || 0) + (historyCompareData.oldDiscount || 0))}</span>
                </div>
              </div>
            </div>

            <div className="snapshot-new-wrapper" style={{ padding: '20px' }}>
              <h3 className="snapshot-title-new">New Edited Values</h3>
              <div className="receipt-panel receipt-summary-box">
                <div className="receipt-row receipt-three-col mb-0-5">
                  <span className="fw-bold text-muted">Amount Received:</span>
                  <span className="text-right fw-bold text-success">{formatMoney(historyCompareData.newAmount || 0)}</span>
                </div>
                <div className="receipt-row receipt-three-col mb-0-5">
                  <span className="fw-bold text-muted">Less (Discount):</span>
                  <span className="text-right text-danger">{formatMoney(historyCompareData.newDiscount || 0)}</span>
                </div>
                <div className="receipt-total receipt-three-col border-top-light">
                  <span className="fw-bold">Total Ledger Adjustment:</span>
                  <span className="text-right fw-bold text-slate fs-lg">{formatMoney((historyCompareData.newAmount || 0) + (historyCompareData.newDiscount || 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RECEIPT */}
      {showEditModal && (
        <div className="modal-overlay modal-overlay-top no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title text-slate">Edit Receipt: {editForm.customReceiptId || formatReceiptId(editForm.id)}</h3>
            <div className="modal-scroll-area">
              <div className="form-group">
                <label className="form-label">Customer Name (Locked):</label>
                <input type="text" className="form-control bg-slate-50" value={editForm.customerName} disabled />
                <small className="text-muted">Cannot change the customer of an existing receipt.</small>
              </div>
              <div className="sales-control-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label fw-bold text-success">Amount Received (₹):</label>
                  <input type="number" className="form-control" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label fw-bold text-danger">Discount / Less (₹):</label>
                  <input type="number" className="form-control" value={editForm.discountAmount} onChange={e => setEditForm({...editForm, discountAmount: e.target.value})} />
                </div>
              </div>
              <div className="sales-control-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Payment Mode:</label>
                  <select className="form-control" value={editForm.paymentMode} onChange={e => setEditForm({...editForm, paymentMode: e.target.value})}>
                    <option value="Cash">Cash</option><option value="PhonePe">PhonePe</option><option value="GPay">GPay</option>
                    <option value="Cheque">Cheque</option><option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Receipt Date:</label>
                  <input type="date" className="form-control" value={editForm.receiptDate} onChange={e => setEditForm({...editForm, receiptDate: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Custom Receipt No:</label>
                <input type="text" className="form-control" value={editForm.customReceiptId} onChange={e => setEditForm({...editForm, customReceiptId: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks:</label>
                <input type="text" className="form-control" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} />
              </div>
            </div>
            <div className="modal-actions justify-end mt-2 pt-1 border-top">
              <button onClick={() => setShowEditModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={submitReceiptEdit} className="btn btn-success">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW RECEIPT DETAILS */}
      {viewingReceipt && !showEditModal && (
        <div className="modal-overlay modal-overlay-top no-print">
          <div className="modal-content modal-small">
            <h3 className="modal-header-title text-slate">Payment Receipt</h3>
            <div className="receipt-panel bg-white receipt-preview-panel">
              <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                <div className="info-block">
                  <span className="info-label">Receipt No.</span>
                  <strong className="info-value text-primary fs-lg">{viewingReceipt.customReceiptId || formatReceiptId(viewingReceipt.id)}</strong>
                </div>
                <div className="info-block mt-1"><span className="info-label">Date</span><strong className="info-value">{new Date(viewingReceipt.receiptDate).toLocaleDateString('en-GB')}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Customer Name</span><strong className="info-value">{viewingReceipt.customerName}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Amount Paid</span><strong className="info-value fs-xxl text-success">{formatMoney(viewingReceipt.amount)}</strong></div>
                {viewingReceipt.discountAmount > 0 && <div className="info-block mt-1"><span className="info-label">Less (Discount)</span><strong className="info-value fs-lg text-danger">- {formatMoney(viewingReceipt.discountAmount)}</strong></div>}
                
                <div className="info-block mt-1 border-top pt-1">
                  <span className="info-label">Total Settled on Ledger</span>
                  <strong className="info-value fs-xl text-slate">
                    {formatMoney(Number(viewingReceipt.amount) + Number(viewingReceipt.discountAmount || 0))}
                  </strong>
                </div>

                <div className="info-block mt-1"><span className="info-label">Payment Mode</span><strong className="info-value text-slate">{viewingReceipt.paymentMode}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Remarks</span><strong className="info-value text-slate">{viewingReceipt.remarks || 'N/A'}</strong></div>
              </div>
            </div>
            <div className="modal-actions center-actions mt-2 pt-1 border-top">
              <button onClick={() => setViewingReceipt(null)} className="btn btn-secondary w-100 fs-lg">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}