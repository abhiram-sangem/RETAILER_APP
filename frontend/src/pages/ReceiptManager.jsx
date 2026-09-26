import React, { useState, useEffect, useMemo } from 'react';
import { formatReceiptId, formatInvoiceId, formatMoney } from '../utils/formatters';
import { receiptService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ReceiptManager({ view, setView, customers, receipts, invoices = [], loadCustomers, loadReceipts }) {
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

  // Row-level payment inputs: { [billId]: { amount: '', discount: '' } }
  const [rowPayments, setRowPayments] = useState({});
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilterRange, startDate, endDate, itemsPerPage]);

  // REACTIVE CUSTOMER LINK: Guarantees the balance is always perfectly in sync
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(indexOfFirstItem, indexOfLastItem);

  // ============================================================================
  // 🚀 BULLETPROOF REVERSE FIFO ALLOCATION (Math Sync)
  // Maps the absolute true customer balance onto the newest unpaid bills.
  // ============================================================================
  const pendingBills = useMemo(() => {
    if (!activeCustomer || Number(activeCustomer.balance) <= 0) return [];
    
    const targetNameNorm = (activeCustomer.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Sort Pay Later bills NEWEST first
    const payLaterBills = invoices
      .filter(inv => !inv.isReturn && inv.paymentMethod === 'Pay Later' && ((inv.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === targetNameNorm))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    let remainingBalanceToAttribute = Number(activeCustomer.balance);
    const pending = [];

    // Loop backwards: Assign the true remaining balance to the newest bills
    for (const bill of payLaterBills) {
      if (remainingBalanceToAttribute <= 0) break;

      const originalAmount = Number(bill.finalTotal || bill.totalAmount || 0);

      if (remainingBalanceToAttribute >= originalAmount) {
        pending.push({ ...bill, originalAmount, previouslyPaid: 0, dueAmount: originalAmount });
        remainingBalanceToAttribute -= originalAmount;
      } else {
        const prevPaid = originalAmount - remainingBalanceToAttribute;
        pending.push({ ...bill, originalAmount, previouslyPaid: prevPaid, dueAmount: remainingBalanceToAttribute });
        remainingBalanceToAttribute = 0;
      }
    }

    return pending; // Returns array with NEWEST bill at index 0
  }, [activeCustomer, invoices]);

  // ============================================================================
  // 🚀 LIVE GLOBAL AUTO-ALLOCATION
  // If the user types a global amount, this cascades it from OLDEST to NEWEST
  // ============================================================================
  const liveAutoAllocation = useMemo(() => {
    const currentPayment = Number(globalAmount || 0) + Number(globalDiscount || 0);
    let remainingPayment = currentPayment;

    // pendingBills is Newest First. We reverse it so we pay the OLDEST first.
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

    // Reverse it back so the UI displays Newest First
    return allocatedReversed.reverse();
  }, [pendingBills, globalAmount, globalDiscount]);

  // --- SUBMISSION HANDLERS ---

  const submitGlobalPayment = () => {
    if (!activeCustomer) return window.alert("Please select a customer.");
    if (!globalAmount || Number(globalAmount) <= 0) return window.alert("Please enter a valid amount.");

    const finalRemarks = globalRemarks || 'Auto-allocated payment';

    receiptService.create(activeCustomer.id, globalAmount, globalDiscount, receiptMethod, receiptDate, finalRemarks, customReceiptId)
      .then(() => {
        window.alert(`Payment of ${formatMoney(globalAmount)} successfully applied to ${activeCustomer.name}!`);
        setGlobalAmount(''); setGlobalDiscount(''); setGlobalRemarks(''); setCustomReceiptId('');
        loadCustomers(); loadReceipts(); 
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
  };

  const handleRowInputChange = (billId, field, value) => {
    setRowPayments(prev => ({
      ...prev,
      [billId]: {
        ...prev[billId],
        [field]: value
      }
    }));
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
    if (totalRowPayment > bill.dueAmount) return window.alert(`Cannot pay more than the remaining due amount (${formatMoney(bill.dueAmount)}).`);

    const finalRemarks = `Auto-Allocated to ${formatInvoiceId(bill.id)}`;

    receiptService.create(activeCustomer.id, inputAmt, inputDisc, receiptMethod, receiptDate, finalRemarks, customReceiptId)
      .then(() => {
        window.alert(`Payment securely logged specifically against ${formatInvoiceId(bill.id)}!`);
        setRowPayments(prev => ({ ...prev, [bill.id]: { amount: '', discount: '' } }));
        setCustomReceiptId('');
        loadCustomers(); loadReceipts(); 
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
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
      {/* 1. VIEW: GENERATE RECEIPT */}
      {view === 'receipts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TOP CONFIG & GLOBAL PAYMENT PANEL */}
          <div className="card mb-0">
            <div className="card-header border-bottom-padded mb-1">
              <h2 className="card-title mb-0">Receipt Configuration</h2>
            </div>
            
            <div className="sales-control-panel bg-transparent p-0 border-none shadow-none mt-1">
              {/* Row 1: Customer & Settings */}
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
                            setSelectedCustomerId(c.id); 
                            setReceiptSearch(c.name); 
                            setIsReceiptDropdownOpen(false); 
                            setRowPayments({});
                            setGlobalAmount('');
                          }}>
                            <span className="fw-bold">{c.name}</span>
                            <span className="dropdown-location">{c.balance > 0 ? ` (Due: ${formatMoney(c.balance)})` : ''}</span>
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

              {/* Row 2: Global Amount Inputs */}
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

          {/* BOTTOM FULL WIDTH ALLOCATION TABLE */}
          <div className="card mb-0">
            <div className="card-header border-none pb-0">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="text-slate mb-0">Invoice Payment Allocation</h3>
                  <p className="text-muted mt-0-5 mb-0">
                    {isAutoModeActive 
                      ? "Auto-Allocation Active: Watch your payment cascade from the oldest bill upwards." 
                      : "Surgical Mode: Enter a payment amount directly in the row for a specific invoice."}
                  </p>
                </div>
                {activeCustomer && (
                  <div className="receipt-summary-box p-1 mt-0" style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {isAutoModeActive && (
                      <div><span className="text-muted fw-bold d-block fs-sm">Total Input:</span><strong className="fs-xl text-success">{formatMoney(Number(globalAmount) + Number(globalDiscount))}</strong></div>
                    )}
                    <div style={{ borderLeft: isAutoModeActive ? '1px solid #cbd5e1' : 'none', paddingLeft: isAutoModeActive ? '20px' : '0' }}>
                      <span className="text-muted fw-bold d-block fs-sm">Total Customer Ledger Due:</span>
                      <strong className="fs-lg text-danger">{formatMoney(activeCustomer.balance)}</strong>
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
                                    <button className="btn btn-secondary btn-sm mb-0" onClick={() => handleFullPaymentClick(bill)} title="Auto-fill full due">Fill Full</button>
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
                </tr>
              </thead>
              <tbody>
                {paginatedReceipts.length ? paginatedReceipts.map(rec => {
                  const settledAmount = Number(rec.amount) + Number(rec.discountAmount || 0);
                  return (
                  <tr key={rec.id} className="product-row available" onClick={() => setViewingReceipt(rec)} title="Click to view receipt document">
                    <td className="fw-bold cell-padded text-primary">{rec.customReceiptId || formatReceiptId(rec.id)}</td>
                    <td className="cell-padded">{new Date(rec.receiptDate).toLocaleDateString('en-GB')}</td>
                    <td className="fw-bold cell-padded">{rec.customerName}</td>
                    <td className="price-text text-success fw-bold fs-lg cell-padded">{formatMoney(rec.amount)}</td>
                    <td className="cell-padded text-danger fw-bold">{rec.discountAmount > 0 ? formatMoney(rec.discountAmount) : '-'}</td>
                    <td className="price-text text-slate fw-bold cell-padded">{formatMoney(settledAmount)}</td>
                    <td className="cell-padded"><span className="badge">{rec.paymentMode}</span></td>
                  </tr>
                )}) : <tr><td colSpan={7} className="empty-state">No receipts found for this date range.</td></tr>}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredReceipts.length)}
        </div>
      )}

      {/* MODAL: VIEW RECEIPT DETAILS */}
      {viewingReceipt && (
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