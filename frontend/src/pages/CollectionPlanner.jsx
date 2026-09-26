import React, { useState, useMemo } from 'react';
import { formatInvoiceId, formatMoney } from '../utils/formatters';

export default function CollectionPlanner({ customers, invoices = [] }) {
  const [selectedCities, setSelectedCities] = useState([]);

  // 1. Find all unique cities where customers actually have a pending balance
  const availableCities = useMemo(() => {
    const cities = customers
      .filter(c => Number(c.balance) > 0 && c.city)
      .map(c => c.city.trim().toUpperCase());
    return [...new Set(cities)].sort();
  }, [customers]);

  const toggleCity = (city) => {
    setSelectedCities(prev => 
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  // 2. Build the exact collection data using the perfect Reverse FIFO math
  const collectionData = useMemo(() => {
    if (selectedCities.length === 0) return {};

    const dataByCity = {};

    selectedCities.forEach(city => {
      // Find customers in this city who owe money
      const cityCustomers = customers.filter(c => 
        c.city && c.city.trim().toUpperCase() === city && Number(c.balance) > 0
      );

      if (cityCustomers.length === 0) return;

      const customersWithBills = [];

      cityCustomers.forEach(customer => {
        const targetNameNorm = (customer.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Get Pay Later bills for this customer, sorted NEWEST first
        const payLaterBills = invoices
          .filter(inv => !inv.isReturn && inv.paymentMethod === 'Pay Later' && ((inv.customerName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === targetNameNorm))
          .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

        let remainingBalanceToAttribute = Number(customer.balance);
        const pending = [];

        // Apply true balance to newest bills
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

        // Reverse to show Oldest bills first
        const sortedPending = pending.reverse();

        if (sortedPending.length > 0) {
          customersWithBills.push({
            ...customer,
            pendingBills: sortedPending
          });
        }
      });

      if (customersWithBills.length > 0) {
        dataByCity[city] = customersWithBills;
      }
    });

    return dataByCity;
  }, [selectedCities, customers, invoices]);

  // Helper to calculate invoice age in days
  const calculateAge = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(dateString);
    orderDate.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today - orderDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* CONTROL PANEL (Hidden during printing) */}
      <div className="card no-print">
        <div className="card-header border-bottom-padded mb-1">
          <h2 className="card-title mb-0">Route Collection Planner</h2>
        </div>
        <div className="p-1">
          <p className="text-muted fw-bold mb-1">Select the cities you are visiting today:</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {availableCities.length > 0 ? (
              availableCities.map(city => (
                <button
                  key={city}
                  className={`btn ${selectedCities.includes(city) ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '20px', padding: '8px 16px' }}
                  onClick={() => toggleCity(city)}
                >
                  {selectedCities.includes(city) ? '✓ ' : '+ '}{city}
                </button>
              ))
            ) : (
              <span className="text-muted">No cities with pending balances found in customer data.</span>
            )}
          </div>

          <div className="mt-2 border-top pt-1 text-right">
            <button 
              className="btn btn-success fs-lg px-2" 
              disabled={selectedCities.length === 0}
              onClick={handlePrint}
            >
              🖨️ Print Route Plan
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT AREA */}
      {selectedCities.length > 0 && (
        <div className="card" style={{ backgroundColor: '#fff', color: '#000' }}>
          <div className="no-print mb-2">
            <h3 className="text-slate">Report Preview</h3>
          </div>
          
          <div className="print-report-container">
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
              <h1 style={{ margin: '0', fontSize: '24px' }}>Daily Collection Route Plan</h1>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>

            {selectedCities.map(city => {
              const cityCustomers = collectionData[city];
              if (!cityCustomers) return null;

              return (
                <div key={city} style={{ marginBottom: '30px' }}>
                  {/* CITY HEADER */}
                  <h2 style={{ backgroundColor: '#f1f5f9', padding: '10px', borderLeft: '4px solid #3b82f6', marginTop: '0', fontSize: '20px' }}>
                    📍 {city}
                  </h2>

                  {/* CUSTOMER LOOP */}
                  {cityCustomers.map(customer => (
                    <div key={customer.id} style={{ marginBottom: '25px', paddingLeft: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                          👤 {customer.name}
                          {customer.mobile && <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '10px' }}>📞 {customer.mobile}</span>}
                        </h3>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          Total Due: <span style={{ color: '#ef4444' }}>{formatMoney(customer.balance)}</span>
                        </div>
                      </div>

                      {/* BILLS TABLE */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#e2e8f0', color: '#334155' }}>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Invoice No</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>Invoice Date</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Actual Bill Amount</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Paid Amount</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Balance</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>Age (Days)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customer.pendingBills.map(bill => (
                            <tr key={bill.id}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>{formatInvoiceId(bill.id)}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{new Date(bill.orderDate).toLocaleDateString('en-GB')}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(bill.originalAmount)}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{bill.previouslyPaid > 0 ? formatMoney(bill.previouslyPaid) : '-'}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>{formatMoney(bill.dueAmount)}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{calculateAge(bill.orderDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })}
            
            {Object.keys(collectionData).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                No pending bills found for the selected cities.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}