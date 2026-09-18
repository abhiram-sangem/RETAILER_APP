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

  const [receiptCustomer, setReceiptCustomer] = useState(null);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptDiscount, setReceiptDiscount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('Cash');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptRemarks, setReceiptRemarks] = useState('Payment received with thanks.');

  // NEW STATE: Track which bills are excluded from this payment
  const [excludedBills, setExcludedBills] = useState(new Set());

  const [viewingReceipt, setViewingReceipt] = useState(null);

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
    formatReceiptId(r.id).toLowerCase().includes(safeSearch)) &&
    isWithinDateRange(r.receiptDate)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(indexOfFirstItem, indexOfLastItem);

  // ============================================================================
  // 🚀 ADVANCED FIFO PAYMENT ALLOCATION ENGINE (WITH DISPUTE EXCLUSION)
  // ============================================================================
  const pendingBills = useMemo(() => {
    if (!receiptCustomer) return [];
    
    // 1. Find all past credits
    let totalCredits = 0;
    receipts.forEach(r => {
      if (r.customerId === receiptCustomer.id || r.customerName === receiptCustomer.name) {
        totalCredits += (Number(r.amount) + Number(r.discountAmount || 0));
      }
    });
    invoices.forEach(inv => {
      if (inv.isReturn && inv.customerName === receiptCustomer.name) {
        totalCredits += Number(inv.finalTotal || inv.totalAmount || 0);
      }
    });

    // 2. Get all 'Pay Later' bills for this customer, sorted Oldest First
    const payLaterBills = invoices
      .filter(inv => !inv.isReturn && inv.paymentMethod === 'Pay Later' && inv.customerName === receiptCustomer.name)
      .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));

    // 3. Apply credits sequentially to figure out what is STILL UNPAID
    const pending = [];
    payLaterBills.forEach(bill => {
      let due = Number(bill.finalTotal || bill.totalAmount || 0);
      
      if (totalCredits >= due) {
        totalCredits -= due; 
      } else if (totalCredits > 0) {
        due -= totalCredits; 
        totalCredits = 0;
        pending.push({ ...bill, dueAmount: due });
      } else {
        pending.push({ ...bill, dueAmount: due }); 
      }
    });

    return pending;
  }, [receiptCustomer, invoices, receipts]);

  // 4. Live visualizer: Applies the typed amount, SKIPPING excluded bills!
  const liveAllocation = useMemo(() => {
    const currentPayment = Number(receiptAmount || 0) + Number(receiptDiscount || 0);
    let remainingPayment = currentPayment;

    return pendingBills.map(bill => {
      let allocated = 0;
      let status = 'Pending';

      if (excludedBills.has(bill.id)) {
        status = 'On Hold (Disputed)';
        allocated = 0; // Completely skip allocation
      } else if (remainingPayment >= bill.dueAmount) {
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
  }, [pendingBills, receiptAmount, receiptDiscount, excludedBills]);

  // Handler to auto-fill the receipt amount to clear up to a specific bill
  const handleClearUpTo = (index) => {
    let totalNeeded = 0;
    for (let i = 0; i <= index; i++) {
      // Ignore excluded bills when calculating "Clear Up To Here" sum
      if (!excludedBills.has(pendingBills[i].id)) {
        totalNeeded += pendingBills[i].dueAmount;
      }
    }
    setReceiptAmount(totalNeeded.toFixed(2));
    setReceiptDiscount(0);
  };

  const toggleExcludeBill = (billId) => {
    setExcludedBills(prev => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };
  // ============================================================================

  function handleGenerateReceipt() {
    if (!receiptCustomer) return window.alert("Please select a customer.");
    if (!receiptAmount || Number(receiptAmount) <= 0) return window.alert("Please enter a valid amount.");
    
    receiptService.create(receiptCustomer.id, receiptAmount, receiptDiscount, receiptMethod, receiptDate, receiptRemarks)
      .then(() => {
        window.alert(`Receipt securely logged! Total Ledger Credit applied for ${receiptCustomer.name}.`);
        loadCustomers(); loadReceipts(); setReceiptCustomer(null);
        setReceiptAmount(''); setReceiptDiscount(''); setReceiptDate(new Date().toISOString().split('T')[0]);
        setReceiptSearch(''); setReceiptRemarks('Payment received with thanks.');
        setExcludedBills(new Set()); // Reset exclusions
      })
      .catch(err => window.alert("Failed to record receipt: " + err.message));
  }

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

  return (
    <>
      {/* 1. VIEW: GENERATE RECEIPT */}
      {view === 'receipts' && (
        <div className="card bg-transparent">
          <div className="reports-layout" style={{ gap: '20px' }}>
            
            {/* Receipt Form Column */}
            <div className="card mb-0" style={{ flex: '1', minWidth: '400px' }}>
              <div className="card-header border-bottom-padded mb-1">
                <h2 className="card-title mb-0">Generate Receipt</h2>
              </div>
              <div className="form-group mt-1">
                <label className="form-label">Select Customer:</label>
                <div className="dropdown-container">
                  <input
                    type="text" className="form-control" placeholder="Search customer name or phone..."
                    value={receiptSearch} onFocus={() => setIsReceiptDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsReceiptDropdownOpen(false), 200)}
                    onChange={e => { 
                      setReceiptSearch(e.target.value); 
                      setIsReceiptDropdownOpen(true); 
                      setReceiptCustomer(null); 
                      setReceiptAmount(''); 
                      setReceiptDiscount('');
                      setExcludedBills(new Set()); 
                    }}
                  />
                  {isReceiptDropdownOpen && (
                    <ul className="dropdown-menu">
                      {receiptFilteredCustomers.length > 0 ? receiptFilteredCustomers.map(c => (
                        <li key={c.id} className="dropdown-item" onMouseDown={() => { setReceiptCustomer(c); setReceiptSearch(c.name); setIsReceiptDropdownOpen(false); setExcludedBills(new Set()); }}>
                          <span className="fw-bold">{c.name}</span>
                          <span className="dropdown-location">{c.balance > 0 ? ` (Due: ${formatMoney(c.balance)})` : ''}</span>
                        </li>
                      )) : <li className="dropdown-empty">No customers found</li>}
                    </ul>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Date:</label>
                <input type="date" className="form-control" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
              </div>

              <div className="sales-control-row sales-control-row-transparent">
                <div className="form-group w-100">
                  <label className="form-label">Amount Received (₹):</label>
                  <input type="number" className="form-control fs-xl fw-bold text-success" value={receiptAmount} onChange={e => setReceiptAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="form-group w-100">
                  <label className="form-label">Discount / Less (₹):</label>
                  <input type="number" className="form-control fs-xl fw-bold text-danger" value={receiptDiscount} onChange={e => setReceiptDiscount(e.target.value)} placeholder="0.00" />
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
                <input type="text" className="form-control" value={receiptRemarks} onChange={e => setReceiptRemarks(e.target.value)} />
              </div>

              <button className="btn btn-primary w-100 mt-1-5 fs-lg" onClick={handleGenerateReceipt}>Save & Record Payment</button>
            </div>

            {/* Live FIFO Allocation Preview Column */}
            <div className="card mb-0 flat-dashed-card" style={{ flex: '1.5' }}>
              <div className="card-header border-none pb-0">
                <h3 className="text-slate mb-0">Live Payment Allocation</h3>
                <p className="text-muted mt-0-5 mb-0">Payments are automatically applied to the oldest pending bills first.</p>
              </div>
              
              <div className="mt-1-5" style={{ padding: '0 1.5rem' }}>
                {!receiptCustomer ? (
                  <div className="empty-state text-muted" style={{ padding: '3rem 1rem' }}>Select a customer to view pending bills.</div>
                ) : liveAllocation.length === 0 ? (
                  <div className="empty-state text-success fw-bold" style={{ padding: '3rem 1rem' }}>🎉 This customer has no pending 'Pay Later' bills!</div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table border-none mb-0">
                      <thead className="sticky-th-light">
                        <tr>
                          <th className="text-center">Exclude</th>
                          <th>Bill Date</th>
                          <th>Bill No</th>
                          <th className="text-right">Due Amount</th>
                          <th className="text-right">Live Allocation</th>
                          <th className="text-center">Status</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveAllocation.map((bill, idx) => (
                          <tr key={bill.id} style={{ 
                            backgroundColor: bill.status === 'Clearing Now' ? '#f0fdf4' : (bill.status === 'Partial Clear' ? '#fefce8' : (bill.status === 'On Hold (Disputed)' ? '#fef2f2' : 'transparent')),
                            transition: 'background-color 0.3s'
                          }}>
                            <td className="text-center" style={{ verticalAlign: 'middle' }}>
                              <input 
                                type="checkbox" 
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                checked={excludedBills.has(bill.id)}
                                onChange={() => toggleExcludeBill(bill.id)}
                                title="Check to exclude this bill from automatic payment deduction"
                              />
                            </td>
                            <td className={`text-muted ${excludedBills.has(bill.id) ? 'text-decoration-line-through' : ''}`}>{new Date(bill.orderDate).toLocaleDateString('en-GB')}</td>
                            <td className={`fw-bold ${excludedBills.has(bill.id) ? 'text-decoration-line-through text-muted' : ''}`}>{formatInvoiceId(bill.id)}</td>
                            <td className={`text-right fw-bold ${excludedBills.has(bill.id) ? 'text-muted text-decoration-line-through' : 'text-danger'}`}>{formatMoney(bill.dueAmount)}</td>
                            <td className="text-right fw-bold text-success">{bill.allocated > 0 ? `+${formatMoney(bill.allocated)}` : '-'}</td>
                            <td className="text-center">
                              {bill.status === 'Clearing Now' && <span className="badge btn-success text-white">Clearing</span>}
                              {bill.status === 'Partial Clear' && <span className="badge btn-warning text-dark">Partial</span>}
                              {bill.status === 'On Hold (Disputed)' && <span className="badge btn-danger text-white">Held</span>}
                              {bill.status === 'Pending' && <span className="badge bg-slate-200">Pending</span>}
                            </td>
                            <td className="text-center">
                              <button 
                                className="btn btn-secondary btn-sm mb-0" 
                                onClick={() => handleClearUpTo(idx)}
                                title="Set receipt amount to clear all non-excluded bills up to this one"
                              >
                                Clear Up To Here
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="receipt-panel shadow-panel" style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px' }}>
                <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                  <div className="info-block"><span className="info-label">Total Amount Input</span><strong className="info-value fs-xxl text-success">{formatMoney(Number(receiptAmount) + Number(receiptDiscount))}</strong></div>
                  <div className="info-block mt-1"><span className="info-label">Total Customer Ledger Due</span><strong className="info-value fs-lg text-danger">{receiptCustomer ? formatMoney(receiptCustomer.balance) : '-'}</strong></div>
                </div>
              </div>
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
              <input type="text" className="form-control mb-0 search-input-md" placeholder="Search Customer or ID..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
              {renderDateFilter()}
            </div>
          </div>
          <div className="table-responsive">
            <table className="block-table data-table">
              <thead><tr><th>Receipt ID</th><th>Date</th><th>Customer Name</th><th>Amount Received</th><th>Less (Discount)</th><th>Payment Mode</th></tr></thead>
              <tbody>
                {paginatedReceipts.length ? paginatedReceipts.map(rec => (
                  <tr key={rec.id} className="product-row available" onClick={() => setViewingReceipt(rec)} title="Click to view receipt document">
                    <td className="fw-bold cell-padded">{formatReceiptId(rec.id)}</td>
                    <td className="cell-padded">{new Date(rec.receiptDate).toLocaleDateString('en-GB')}</td>
                    <td className="fw-bold cell-padded">{rec.customerName}</td>
                    <td className="price-text text-success fw-bold fs-lg cell-padded">{formatMoney(rec.amount)}</td>
                    <td className="cell-padded text-danger fw-bold">{rec.discountAmount > 0 ? formatMoney(rec.discountAmount) : '-'}</td>
                    <td className="cell-padded"><span className="badge">{rec.paymentMode}</span></td>
                  </tr>
                )) : <tr><td colSpan={6} className="empty-state">No receipts found for this date range.</td></tr>}
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
                <div className="info-block"><span className="info-label">Receipt ID</span><strong className="info-value">{formatReceiptId(viewingReceipt.id)}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Date</span><strong className="info-value">{new Date(viewingReceipt.receiptDate).toLocaleDateString('en-GB')}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Customer Name</span><strong className="info-value">{viewingReceipt.customerName}</strong></div>
                <div className="info-block mt-1"><span className="info-label">Amount Paid</span><strong className="info-value fs-xxl text-success">{formatMoney(viewingReceipt.amount)}</strong></div>
                {viewingReceipt.discountAmount > 0 && <div className="info-block mt-1"><span className="info-label">Less (Discount)</span><strong className="info-value fs-lg text-danger">- {formatMoney(viewingReceipt.discountAmount)}</strong></div>}
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