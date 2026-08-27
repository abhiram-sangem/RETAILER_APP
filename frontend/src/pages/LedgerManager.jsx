import React, { useState, useMemo, useEffect } from 'react';
import { formatMoney, formatInvoiceId, formatReceiptId } from '../utils/formatters';
import { invoiceService } from '../services/api';
import Pagination from '../components/Pagination';

export default function LedgerManager({ view, setView, customers, invoices, receipts }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [dateFilterRange, setDateFilterRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [viewingCustomerStatement, setViewingCustomerStatement] = useState(null);
  const [ledgerPreview, setLedgerPreview] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ledgerSearchQuery, dateFilterRange, startDate, endDate, itemsPerPage]);

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

  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(safeSearch)) ||
    (c.mobile && c.mobile.includes(safeSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeSearch)) ||
    (c.location && c.location.toLowerCase().includes(safeSearch)) ||
    (c.gstno && c.gstno.toLowerCase().includes(safeSearch))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

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

  return (
    <>
      {/* 1. VIEW: LEDGERS DIRECTORY */}
      {view === 'ledgers' && (
        <div className="card">
          <div className="card-header header-actions">
            <h2 className="card-title mb-0">Customer Ledgers</h2>
            <input 
              type="text" className="form-control header-search" placeholder="Search customers..." 
              value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
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
              <thead><tr><th>Customer Name</th><th>Contact</th><th>Location</th><th>Current Balance</th></tr></thead>
              <tbody>
                {paginatedCustomers.map(c => (
                  <tr key={c.id} className="product-row available" onClick={() => { setViewingCustomerStatement(c); setView('ledger-statement'); }}>
                    <td className="fw-bold cell-padded">{c.name}</td>
                    <td className="cell-padded">{c.mobile || 'N/A'}</td>
                    <td className="cell-padded">{c.location || c.city || 'N/A'}</td>
                    <td className={`fw-bold cell-padded ${c.balance > 0 ? 'text-danger' : (c.balance < 0 ? 'text-success' : 'text-muted')}`}>
                      {formatMoney(Math.abs(c.balance))} {c.balance > 0 ? '(Due)' : (c.balance < 0 ? '(Advance)' : '')}
                    </td>
                  </tr>
                ))}
                {paginatedCustomers.length === 0 && <tr><td colSpan={4} className="empty-state">No customers found.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination totalItems={filteredCustomers.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
      )}

      {/* 2. VIEW: SPLIT LEDGER STATEMENT */}
      {view === 'ledger-statement' && viewingCustomerStatement && (
        <div className="card">
          <div className="card-header header-actions header-actions-wrap">
            <h2 className="card-title mb-0">Statement of Account</h2>
            <div className="header-filters-group">
              <input 
                type="text" className="form-control mb-0 search-input-md" placeholder="Search ref, method..." 
                value={ledgerSearchQuery} onChange={e => setSearchQuery(e.target.value)} 
              />
              {renderDateFilter()}
              <button className="btn btn-secondary" onClick={() => { setViewingCustomerStatement(null); setLedgerPreview(null); setView('ledgers'); }}>Back to Ledgers</button>
            </div>
          </div>
          
          <div className="invoice-summary-grid mt-1 invoice-summary-bg">
            <div className="info-block"><span className="info-label">Customer Name</span><strong className="info-value text-primary fs-xxl">{viewingCustomerStatement.name}</strong></div>
            <div className="info-block"><span className="info-label">Contact / Location</span><strong className="info-value fs-lg">{viewingCustomerStatement.mobile || 'N/A'} <br/> {viewingCustomerStatement.city || viewingCustomerStatement.location || ''}</strong></div>
            <div className="info-block"><span className="info-label">Total Outstanding Balance</span><strong className={`info-value fs-xxl ${viewingCustomerStatement.balance > 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(viewingCustomerStatement.balance)}</strong></div>
          </div>

          <div className="ledger-split-layout">
            {/* LEFT SIDE: Ledger Table */}
            <div className="ledger-table-container">
              <div className="ledger-table-wrapper">
                <table className="ledger-strict-table w-100-min">
                  <thead>
                    <tr><th className="col-12">Date</th><th className="col-18">Particulars</th><th className="col-15">Ref No.</th><th className="col-10">Method</th><th className="right-align col-15">Bill Amount (+)</th><th className="right-align col-15">Paid Amount (-)</th><th className="right-align col-15">Balance</th></tr>
                  </thead>
                  <tbody>
                    {filteredCustomerStatementData.length ? filteredCustomerStatementData.map((row, idx) => (
                      <tr key={idx} className={`product-row available ${row.isCashTx ? 'ledger-row-neutral' : ''}`} onClick={() => handleLedgerRowClick(row)} title="Click to view details">
                        <td className="fw-bold cell-padded">{row.sortDate.toLocaleDateString('en-GB')}</td>
                        <td className="cell-padded"><span className={`badge ${row.type === 'Payment Received' ? 'btn-success text-white' : (row.type === 'Sale Return' ? 'btn-danger text-white' : 'bg-slate-200')}`}>{row.type}</span></td>
                        <td className="font-monospace text-muted cell-padded">{row.ref}</td>
                        <td className="cell-padded">{row.method}</td>
                        <td className="right-align fw-bold cell-padded" style={{color: row.debit > 0 ? '#ef4444' : '#94a3b8'}}>{row.debit > 0 ? formatMoney(row.debit) : '-'}</td>
                        <td className="right-align fw-bold cell-padded" style={{color: row.credit > 0 ? '#10b981' : '#94a3b8'}}>{row.credit > 0 ? formatMoney(row.credit) : '-'}</td>
                        <td className="right-align fw-bold fs-lg cell-padded">
                          <span className="text-dark-blue">{formatMoney(Math.abs(row.runningBalance))}</span>
                          <span className={row.runningBalance > 0 ? 'text-dr' : (row.runningBalance < 0 ? 'text-cr' : '')}>{row.runningBalance > 0 ? ' Dr' : (row.runningBalance < 0 ? ' Cr' : '')}</span>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={7} className="empty-state">No transaction history found for this date range/search.</td></tr>}
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
                  <h3 className="modal-header-title text-slate mb-0 fs-xl">{ledgerPreview.type === 'receipt' ? 'Payment Receipt' : 'Bill Document'}</h3>
                  <button onClick={() => setLedgerPreview(null)} className="btn btn-secondary btn-sm">Close</button>
                </div>
                
                {ledgerPreview.type === 'receipt' ? (
                  <div className="receipt-panel bg-white receipt-preview-panel">
                    <div className="receipt-row receipt-three-col single-col-grid grid-1fr">
                      <div className="info-block"><span className="info-label">Receipt ID</span><strong className="info-value">{formatReceiptId(ledgerPreview.data.id)}</strong></div>
                      <div className="info-block mt-1"><span className="info-label">Date</span><strong className="info-value">{new Date(ledgerPreview.data.receiptDate).toLocaleDateString('en-GB')}</strong></div>
                      <div className="info-block mt-1"><span className="info-label">Amount Paid</span><strong className="info-value fs-xxl text-success">{formatMoney(ledgerPreview.data.amount)}</strong></div>
                      {ledgerPreview.data.discountAmount > 0 && <div className="info-block mt-1"><span className="info-label">Less (Discount)</span><strong className="info-value fs-lg text-danger">- {formatMoney(ledgerPreview.data.discountAmount)}</strong></div>}
                      <div className="info-block mt-1"><span className="info-label">Payment Mode</span><strong className="info-value text-slate">{ledgerPreview.data.paymentMode}</strong></div>
                      <div className="info-block mt-1"><span className="info-label">Remarks</span><strong className="info-value text-slate">{ledgerPreview.data.remarks || 'N/A'}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="invoice-summary-grid single-col-grid mb-1 p-1 mb-2-bg">
                      <div className="info-block"><span className="info-label">Bill ID</span><strong className="info-value">{formatInvoiceId(ledgerPreview.data.id)}</strong></div>
                      <div className="info-block mt-1"><span className="info-label">Date</span><strong className="info-value">{new Date(ledgerPreview.data.orderDate || ledgerPreview.data.purchaseDate).toLocaleDateString('en-GB')}</strong></div>
                    </div>
                    
                    <h4 className="section-title-spacing fs-sm text-muted">Items List</h4>
                    <div className="table-responsive preview-table-scroll-lg">
                      <table className="data-table mb-0 border-none">
                        <thead className="sticky-th-light"><tr><th>Product</th><th>Qty</th><th className="text-right">Price</th></tr></thead>
                        <tbody>
                          {ledgerPreview.data.items?.map((item, idx) => (
                            <tr key={idx}><td>{item.product?.name || 'Unknown'}</td><td className="fw-bold">{item.quantity}</td><td className="text-right">{formatMoney(item.price || item.purchasePrice)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="receipt-panel receipt-summary-box">
                      <div className="receipt-row receipt-three-col mb-0-5"><span className="fw-bold text-muted">Subtotal:</span><span className="text-right text-muted">{formatMoney(ledgerPreview.data.grossTotal || ledgerPreview.data.totalAmount)}</span></div>
                      {ledgerPreview.data.discountPercent > 0 && <div className="receipt-row receipt-three-col mb-0-5"><span className="fw-bold text-muted">Discount ({ledgerPreview.data.discountPercent}%):</span><span className="text-right text-danger">-{formatMoney((ledgerPreview.data.grossTotal || 0) * (ledgerPreview.data.discountPercent / 100))}</span></div>}
                      {(ledgerPreview.data.cgst > 0 || ledgerPreview.data.sgst > 0) && <div className="receipt-row receipt-three-col mb-0-5"><span className="fw-bold text-muted">Tax (CGST+SGST):</span><span className="text-right text-muted">+{formatMoney((ledgerPreview.data.cgst || 0) + (ledgerPreview.data.sgst || 0))}</span></div>}
                      <div className="receipt-total receipt-three-col border-top-light"><span className="fw-bold">Final Total:</span><span className={`text-right fw-bold fs-lg ${ledgerPreview.isReturn ? 'text-danger' : 'text-success'}`}>{formatMoney(ledgerPreview.data.finalTotal || ledgerPreview.data.totalAmount)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}