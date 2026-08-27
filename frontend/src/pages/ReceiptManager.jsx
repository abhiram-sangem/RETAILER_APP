import React, { useState, useEffect } from 'react';
import { formatReceiptId, formatMoney } from '../utils/formatters';
import { receiptService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ReceiptManager({ view, setView, customers, receipts, loadCustomers, loadReceipts }) {
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

  return (
    <>
      {/* 1. VIEW: GENERATE RECEIPT */}
      {view === 'receipts' && (
        <div className="card bg-transparent">
          <div className="reports-layout">
            <div className="card mb-0">
              <div className="card-header"><h2 className="card-title">Generate Receipt</h2></div>
              <div className="form-group mt-1">
                <label className="form-label">Select Customer:</label>
                <div className="dropdown-container">
                  <input
                    type="text" className="form-control" placeholder="Search customer name or phone..."
                    value={receiptSearch} onFocus={() => setIsReceiptDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsReceiptDropdownOpen(false), 200)}
                    onChange={e => { setReceiptSearch(e.target.value); setIsReceiptDropdownOpen(true); setReceiptCustomer(null); }}
                  />
                  {isReceiptDropdownOpen && (
                    <ul className="dropdown-menu">
                      {receiptFilteredCustomers.length > 0 ? receiptFilteredCustomers.map(c => (
                        <li key={c.id} className="dropdown-item" onMouseDown={() => { setReceiptCustomer(c); setReceiptSearch(c.name); setIsReceiptDropdownOpen(false); }}>
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

            <div className="card mb-0 flat-dashed-card">
              <div className="card-header border-none pb-0"><h3 className="text-center w-100 text-slate mb-0">Live Receipt Preview</h3></div>
              <div className="receipt-panel shadow-panel">
                <div className="text-center border-bottom-padded mb-1-5">
                  <h2 className="mb-0 text-slate">PAYMENT RECEIPT</h2>
                  <p className="text-muted mt-1 mb-0">{new Date(receiptDate).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                  <div className="info-block"><span className="info-label">Received From</span><strong className="info-value fs-xl text-primary">{receiptCustomer ? receiptCustomer.name : '__________________'}</strong></div>
                  <div className="info-block mt-1"><span className="info-label">Amount Received</span><strong className="info-value fs-xxl text-success">{receiptAmount ? formatMoney(receiptAmount) : '₹ 0.00'}</strong></div>
                  {receiptDiscount > 0 && <div className="info-block mt-1"><span className="info-label">Less (Discount)</span><strong className="info-value fs-lg text-danger">- {formatMoney(receiptDiscount)}</strong></div>}
                  <div className="info-block mt-1"><span className="info-label">Total Settled on Ledger</span><strong className="info-value fs-xl text-slate">{formatMoney(Number(receiptAmount) + Number(receiptDiscount))}</strong></div>
                  <div className="info-block mt-1"><span className="info-label">Payment Mode</span><strong className="info-value text-slate">{receiptMethod}</strong></div>
                </div>
                <div className="receipt-total receipt-three-col mt-2"><span className="fs-sm text-muted fw-normal">* Computer generated receipt</span><span className="text-right fs-lg text-slate">Authorized Signatory</span></div>
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
          <Pagination totalItems={filteredReceipts.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
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