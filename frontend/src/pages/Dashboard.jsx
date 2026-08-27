import React, { useState } from 'react';
import { formatMoney, formatInvoiceId } from '../utils/formatters';

export default function Dashboard({ salesStats, invoices, handleViewInvoiceDetails, setView }) {
  // We moved this state here because ONLY the dashboard uses it!
  const [expandedStats, setExpandedStats] = useState({
    daily: false, weekly: false, monthly: false, yearly: false
  });

  return (
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
                  <td className={`price-text cell-padded ${inv.isReturn ? 'text-danger' : 'text-success'}`}>
                    {formatMoney(inv.finalTotal || inv.totalAmount)}
                  </td>
                  <td className="cell-padded">{new Date(inv.orderDate).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan="4" className="empty-state">No recent sales found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}