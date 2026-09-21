import React, { useState, useMemo } from 'react'; 
import * as XLSX from 'xlsx'; 
import { formatMoney, formatInvoiceId, formatPurchaseInvoiceId } from '../utils/formatters'; 

export default function ReportsManager({ 
  invoices = [], 
  purchaseInvoices = [], 
  products = [], 
  customers = [] 
}) { 
  // --- Date Range State --- 
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); 
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 

  // --- Tab State --- 
  const [activeTab, setActiveTab] = useState('analytics'); 
  const [gstSubTab, setGstSubTab] = useState('sales'); 

  // --- Core Data Filtering Engine (Indestructible Mode) --- 
  const filteredData = useMemo(() => { 
    // Safely parse dates to prevent Invalid Date crashes 
    const start = startDate ? new Date(startDate) : new Date(0); 
    start.setHours(0, 0, 0, 0); 
    const end = endDate ? new Date(endDate) : new Date(); 
    end.setHours(23, 59, 59, 999); 

    const isWithinRange = (dateStr) => { 
      if (!dateStr) return false; 
      const d = new Date(dateStr); 
      return d >= start && d <= end; 
    }; 

    // Safely filter arrays 
    const validInvoices = (invoices || []).filter(inv => isWithinRange(inv.orderDate)); 
    const validPurchases = (purchaseInvoices || []).filter(pinv => isWithinRange(pinv.purchaseDate)); 

    let grossSales = 0; let salesReturns = 0; 
    let cgstCollected = 0; let sgstCollected = 0; 
    let cogs = 0; 
    let totalPurchases = 0; 
    let cgstPaid = 0; let sgstPaid = 0; 

    const hsnSales = {}; 
    const hsnReturns = {}; 

    // --- ADVANCED ANALYTICS TRACKERS ---
    const productPerformance = {};
    const customerPerformance = {};

    validInvoices.forEach(inv => { 
      const subtotal = Number(inv.grossTotal || inv.totalAmount || 0); 
      const discountRatio = inv.discountPercent ? (1 - (Number(inv.discountPercent) / 100)) : 1; 
      const totalTax = Number(inv.cgst || 0) + Number(inv.sgst || 0); 
      const taxRate = subtotal > 0 ? Math.round((totalTax / (subtotal * discountRatio)) * 100) : 5; 

      if (inv.isReturn) { 
        salesReturns += Number(inv.finalTotal || 0); 
        cgstCollected -= Number(inv.cgst || 0); 
        sgstCollected -= Number(inv.sgst || 0); 
      } else { 
        grossSales += Number(inv.finalTotal || 0); 
        cgstCollected += Number(inv.cgst || 0); 
        sgstCollected += Number(inv.sgst || 0); 

        // Track Customer Performance
        if (!customerPerformance[inv.customerName]) {
          customerPerformance[inv.customerName] = 0;
        }
        customerPerformance[inv.customerName] += Number(inv.finalTotal || 0);
      } 
      
      (inv.items || []).forEach(item => { 
        const hsn = item?.product?.hsnCode || 'N/A'; 
        const qty = Number(item?.quantity || 0); 
        const price = Number(item?.price || 0); 
        const totalVal = price * qty; 
        const itemTaxable = totalVal * discountRatio; 
        const itemCgst = itemTaxable * ((taxRate / 2) / 100); 
        
        const purchasePrice = Number(item?.product?.purchasePrice || 0); 
        const cost = purchasePrice * qty; 

        if (inv.isReturn) cogs -= cost; 
        else cogs += cost; 

        // Track HSN
        const targetMap = inv.isReturn ? hsnReturns : hsnSales; 
        if (!targetMap[hsn]) { 
          targetMap[hsn] = { qty: 0, val: 0, taxable: 0, cgst: 0, sgst: 0, rate: `${taxRate}%` }; 
        } 
        
        if (inv.isReturn) { 
          targetMap[hsn].qty -= qty; 
          targetMap[hsn].val -= (itemTaxable + (itemCgst * 2)); 
          targetMap[hsn].taxable -= itemTaxable; 
          targetMap[hsn].cgst -= itemCgst; 
          targetMap[hsn].sgst -= itemCgst; 
        } else { 
          targetMap[hsn].qty += qty; 
          targetMap[hsn].val += (itemTaxable + (itemCgst * 2)); 
          targetMap[hsn].taxable += itemTaxable; 
          targetMap[hsn].cgst += itemCgst; 
          targetMap[hsn].sgst += itemCgst; 

          // Track Product Performance (Sales Only)
          const pid = item?.product?.id || item?.id;
          const pname = item?.product?.name || item?.name || 'Unknown Product';
          if (!productPerformance[pid]) {
            productPerformance[pid] = { id: pid, name: pname, qtySold: 0, revenue: 0 };
          }
          productPerformance[pid].qtySold += qty;
          productPerformance[pid].revenue += totalVal;
        } 
      }); 
    }); 

    validPurchases.forEach(pinv => { 
      totalPurchases += Number(pinv.finalTotal || 0); 
      cgstPaid += Number(pinv.cgst || 0); 
      sgstPaid += Number(pinv.sgst || 0); 
    }); 

    const netSales = grossSales - salesReturns; 
    const grossProfit = netSales - cogs; 
    const marginPercent = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : 0; 
    const totalInventoryValue = (products || []).reduce((sum, p) => sum + (Number(p?.purchasePrice || 0) * Number(p?.stock || 0)), 0); 
    const totalInventoryMRP = (products || []).reduce((sum, p) => sum + (Number(p?.mrp || p?.price || 0) * Number(p?.stock || 0)), 0); 

    // --- ANALYTICS PROCESSING ---
    const topCustomers = Object.entries(customerPerformance)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const sortedProducts = Object.values(productPerformance).sort((a, b) => b.qtySold - a.qtySold);
    const topProducts = sortedProducts.slice(0, 5);

    // Dead Stock: Cross reference current master products with sales period performance
    const deadStock = (products || [])
      .map(p => {
        const perf = productPerformance[p.id] || { qtySold: 0 };
        return { ...p, qtySold: perf.qtySold };
      })
      .filter(p => p.stock > 0) // Only look at items actually taking up physical space
      .sort((a, b) => a.qtySold - b.qtySold) // Sort lowest sales first
      .slice(0, 5);

    return { 
      validInvoices, validPurchases, 
      grossSales, salesReturns, netSales, cogs, grossProfit, marginPercent, 
      cgstCollected, sgstCollected, totalPurchases, cgstPaid, sgstPaid, 
      totalInventoryValue, totalInventoryMRP, 
      hsnSales, hsnReturns,
      topCustomers, topProducts, deadStock
    }; 
  }, [invoices, purchaseInvoices, products, startDate, endDate]); 

  // --- Export Generators --- 
  const exportToExcel = (data, filename) => { 
    if (!data || !data.length) return window.alert("No data available to export."); 
    const ws = XLSX.utils.json_to_sheet(data); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Report"); 
    XLSX.writeFile(wb, `${filename}_${startDate}_to_${endDate}.xlsx`); 
  }; 

  const generateSalesExport = () => { 
    const data = filteredData.validInvoices.map(inv => ({ 
      'Date': new Date(inv.orderDate).toLocaleDateString('en-GB'), 
      'Bill No': formatInvoiceId(inv.id), 
      'Customer Name': inv.customerName || 'Unknown', 
      'Type': inv.isReturn ? 'Return' : 'Sale', 
      'Payment Mode': inv.paymentMethod || 'Cash', 
      'Total Items': (inv.items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0), 
      'Discount %': inv.discountPercent || 0, 
      'Subtotal': inv.grossTotal || 0, 
      'Tax Amount': Number(inv.cgst || 0) + Number(inv.sgst || 0), 
      'Final Amount': inv.finalTotal || 0 
    })); 
    exportToExcel(data, "Sales_Report"); 
  }; 

  const generatePurchaseExport = () => { 
    const data = filteredData.validPurchases.map(pinv => ({ 
      'Date': new Date(pinv.purchaseDate).toLocaleDateString('en-GB'), 
      'System ID': formatPurchaseInvoiceId(pinv.id), 
      'Vendor Bill No': pinv.customInvoiceId || 'N/A', 
      'Vendor Name': pinv.sellerName || 'Unknown', 
      'Total Items': (pinv.items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0), 
      'Final Amount': pinv.finalTotal || 0 
    })); 
    exportToExcel(data, "Purchase_Report"); 
  }; 

  const generateStockExport = () => { 
    const data = (products || []).map(p => ({ 
      'Product ID': p.id, 
      'Name': p.name || 'Unknown', 
      'HSN': p.hsnCode || '', 
      'In Stock': Number(p.stock || 0), 
      'Unit Purchase Price': Number(p.purchasePrice || 0), 
      'Total Asset Value': (Number(p.stock || 0) * Number(p.purchasePrice || 0)).toFixed(2), 
      'Selling Price': Number(p.price || 0), 
      'Total Retail Value': (Number(p.stock || 0) * Number(p.price || 0)).toFixed(2) 
    })); 
    exportToExcel(data, "Inventory_Valuation"); 
  }; 

  const generateMultiSheetGSTExport = () => { 
    const wb = XLSX.utils.book_new(); 
    const safeCustomers = customers || []; 

    // 1. Sales Sheet 
    const salesData = filteredData.validInvoices.filter(i => !i.isReturn).map((inv, index) => { 
      const cust = safeCustomers.find(c => c.name === inv.customerName); 
      const subtotal = Number(inv.grossTotal || 0); 
      const discount = subtotal * (Number(inv.discountPercent || 0) / 100); 
      const taxable = subtotal - discount; 
      const rate = taxable > 0 ? Math.round(((Number(inv.cgst || 0) + Number(inv.sgst || 0)) / taxable) * 100) : 5; 
      return { 
        'Sl.No': index + 1, 
        'GSTIN of Customer': cust?.gstno || '', 
        'Customer Name': inv.customerName || 'Unknown', 
        'Invoice No': formatInvoiceId(inv.id), 
        'Invoice Date': new Date(inv.orderDate).toLocaleDateString('en-GB').replace(/\//g, '-'), 
        'Invoice Value': inv.finalTotal || 0, 
        'Customer State': cust?.state || 'Telangana', 
        'Rate': `${rate}%`, 
        'Taxable Value': taxable.toFixed(2), 
        'Integrated Tax': 0.0, 
        'Central Tax': Number(inv.cgst || 0).toFixed(2), 
        'State/UT Tax': Number(inv.sgst || 0).toFixed(2), 
        'CESS': 0.0 
      }; 
    }); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData.length ? salesData : [{Message: 'No Sales Data'}]), "Sales"); 

    // 2. Returns 
    const returnData = filteredData.validInvoices.filter(i => i.isReturn).map((inv, index) => { 
      const cust = safeCustomers.find(c => c.name === inv.customerName); 
      const subtotal = Number(inv.grossTotal || 0); 
      const discount = subtotal * (Number(inv.discountPercent || 0) / 100); 
      const taxable = subtotal - discount; 
      const rate = taxable > 0 ? Math.round(((Number(inv.cgst || 0) + Number(inv.sgst || 0)) / taxable) * 100) : 5; 
      return { 
        'Sl.No': index + 1, 
        'GSTIN of Customer': cust?.gstno || '', 
        'Customer Name': inv.customerName || 'Unknown', 
        'Invoice No': `${formatInvoiceId(inv.id)}/RET`, 
        'Invoice Date': new Date(inv.orderDate).toLocaleDateString('en-GB').replace(/\//g, '-'), 
        'Original Invoice No': formatInvoiceId(inv.id), 
        'Original Invoice Date': new Date(inv.orderDate).toLocaleDateString('en-GB').replace(/\//g, '-'), 
        'Reason': 'Return', 
        'Invoice Value': inv.finalTotal || 0, 
        'Customer State': cust?.state || 'Telangana', 
        'Rate': `${rate}%`, 
        'Taxable Value': taxable.toFixed(2), 
        'Integrated Tax': 0.0, 
        'Central Tax': Number(inv.cgst || 0).toFixed(2), 
        'State/UT Tax': Number(inv.sgst || 0).toFixed(2), 
        'CESS': 0.0 
      }; 
    }); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(returnData.length ? returnData : [{Message: 'No Return Data'}]), "Sales Credit(or)Debit Notes"); 

    // 3. Purchases 
    const purchaseData = filteredData.validPurchases.map((pinv, index) => { 
      const subtotal = Number(pinv.grossTotal || 0); 
      const discount = subtotal * (Number(pinv.discountPercent || 0) / 100); 
      const taxable = subtotal - discount; 
      const rate = taxable > 0 ? Math.round(((Number(pinv.cgst || 0) + Number(pinv.sgst || 0)) / taxable) * 100) : 5; 
      return { 
        'Sl.No': index + 1, 
        'GSTIN of Supplier': '',  
        'Supplier Name': pinv.sellerName || 'Unknown', 
        'Invoice No': pinv.customInvoiceId || formatPurchaseInvoiceId(pinv.id), 
        'Invoice Date': new Date(pinv.purchaseDate).toLocaleDateString('en-GB').replace(/\//g, '-'), 
        'Invoice Value': pinv.finalTotal || 0, 
        'Rate': `${rate}%`, 
        'Taxable Value': taxable.toFixed(2), 
        'Integrated Tax': 0.0, 
        'Central Tax': Number(pinv.cgst || 0).toFixed(2), 
        'State/UT Tax': Number(pinv.sgst || 0).toFixed(2), 
        'CESS': 0.0 
      }; 
    }); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseData.length ? purchaseData : [{Message: 'No Purchase Data'}]), "B2B Purchases (GSTR-2)"); 

    // 4. HSN Sales 
    const hsnSalesArray = Object.entries(filteredData.hsnSales).map(([hsn, data]) => ({ 
      'HSN': hsn, 'Total Quantity': data.qty, 'Total Value': data.val.toFixed(2), 
      'Rate': data.rate, 'Taxable Value': data.taxable.toFixed(2), 
      'Integrated Tax': 0, 'Central Tax': data.cgst.toFixed(2), 'State/UT Tax': data.sgst.toFixed(2), 'CESS': 0 
    })); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnSalesArray.length ? hsnSalesArray : [{Message: 'No Data'}]), "Sales HSN Summary"); 

    // 5. HSN Returns 
    const hsnReturnsArray = Object.entries(filteredData.hsnReturns).map(([hsn, data]) => ({ 
      'HSN': hsn, 'Total Quantity': data.qty, 'Total Value': data.val.toFixed(2), 
      'Rate': data.rate, 'Taxable Value': data.taxable.toFixed(2), 
      'Integrated Tax': 0, 'Central Tax': data.cgst.toFixed(2), 'State/UT Tax': data.sgst.toFixed(2), 'CESS': 0 
    })); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnReturnsArray.length ? hsnReturnsArray : [{Message: 'No Data'}]), "Sales CN DN HSN Summary"); 

    XLSX.writeFile(wb, `GSTR_Export_${startDate}_to_${endDate}.xlsx`); 
  }; 

  return ( 
    <div className="card bg-transparent"> 
      {/* HEADER & GLOBAL FILTERS */} 
      <div className="card-header header-actions header-actions-wrap bg-white mb-2" style={{ padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}> 
        <h2 className="card-title mb-0">Business Intelligence & Reports</h2> 
        <div className="header-filters-group"> 
          <label className="fw-bold mr-1">Custom Date Range:</label> 
          <input type="date" className="form-control mb-0" value={startDate} onChange={e => setStartDate(e.target.value)} /> 
          <span className="fw-bold">to</span> 
          <input type="date" className="form-control mb-0" value={endDate} onChange={e => setEndDate(e.target.value)} /> 
        </div> 
      </div> 

      {/* REPORT TABS */} 
      <div className="tabs-container mb-2"> 
        <div className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Advanced Analytics</div> 
        <div className={`tab-button ${activeTab === 'pnl' ? 'active' : ''}`} onClick={() => setActiveTab('pnl')}>Profit & Loss</div> 
        <div className={`tab-button ${activeTab === 'gst' ? 'active' : ''}`} onClick={() => setActiveTab('gst')}>GST Filing Reports</div> 
        <div className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales</div> 
        <div className={`tab-button ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>Purchases</div> 
        <div className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Inventory Value</div> 
      </div> 

      <div className="card"> 
        
        {/* --- 0. ADVANCED ANALYTICS TAB --- */}
        {activeTab === 'analytics' && (
          <div>
            <div className="card-header border-none pb-0 mb-1"> 
              <h3 className="text-primary mb-0">Advanced Store Analytics</h3> 
              <p className="text-muted mt-0-5 mb-0">Performance metrics based on your selected date range.</p>
            </div>
            
            <div className="reports-layout" style={{ gap: '20px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              
              {/* TOP PRODUCTS */}
              <div className="card flat-dashed-card mb-0" style={{ flex: '1', minWidth: '350px' }}>
                <h4 className="border-bottom-padded mb-1"> Top 5 Bestselling Products</h4>
                {filteredData.topProducts.length === 0 ? (
                   <div className="empty-state text-muted">No sales data in this period.</div>
                ) : (
                  <table className="data-table border-none bg-transparent">
                    <thead><tr><th className="text-left">Product</th><th className="text-center">Qty Sold</th><th className="text-right">Revenue</th></tr></thead>
                    <tbody>
                      {filteredData.topProducts.map((p, i) => (
                        <tr key={i}>
                          <td className="fw-bold">{p.name}</td>
                          <td className="text-center"><span className="badge btn-success text-white">{p.qtySold}</span></td>
                          <td className="text-right fw-bold text-success">{formatMoney(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* TOP CUSTOMERS */}
              <div className="card flat-dashed-card mb-0" style={{ flex: '1', minWidth: '350px' }}>
                <h4 className="border-bottom-padded mb-1"> Top 5 Customers by Revenue</h4>
                {filteredData.topCustomers.length === 0 ? (
                   <div className="empty-state text-muted">No sales data in this period.</div>
                ) : (
                  <table className="data-table border-none bg-transparent">
                    <thead><tr><th className="text-left">Customer Name</th><th className="text-right">Total Revenue</th></tr></thead>
                    <tbody>
                      {filteredData.topCustomers.map((c, i) => (
                        <tr key={i}>
                          <td className="fw-bold">{c.name}</td>
                          <td className="text-right fw-bold text-primary">{formatMoney(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* DEAD STOCK */}
              <div className="card flat-dashed-card mb-0" style={{ flex: '1', minWidth: '350px' }}>
                <h4 className="border-bottom-padded mb-1">🧊 Dead Stock / Slow Movers</h4>
                <p className="text-muted fs-sm mb-1 mt-0">Items currently taking up physical shelf space but with the lowest sales in this period.</p>
                {filteredData.deadStock.length === 0 ? (
                   <div className="empty-state text-success fw-bold">Inventory looks healthy!</div>
                ) : (
                  <table className="data-table border-none bg-transparent">
                    <thead><tr><th className="text-left">Product</th><th className="text-center">Current Stock</th><th className="text-center">Qty Sold</th></tr></thead>
                    <tbody>
                      {filteredData.deadStock.map((p, i) => (
                        <tr key={i}>
                          <td className="fw-bold">{p.name}</td>
                          <td className="text-center fw-bold text-warning">{p.stock}</td>
                          <td className="text-center">
                            {p.qtySold === 0 ? <span className="badge btn-danger text-white">0 Sold</span> : p.qtySold}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- 1. GST REPORT TAB --- */} 
        {activeTab === 'gst' && ( 
          <div> 
            <div className="card-header header-actions border-none pb-0 mb-1"> 
              <h3 className="text-primary mb-0">GST Register (GSTR-1 & GSTR-2 Format)</h3> 
              <button className="btn btn-success" onClick={generateMultiSheetGSTExport}>  Download 5-Sheet Excel (GSTR Format)</button> 
            </div> 
            
            <div className="tabs-container mb-1" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0' }}> 
              <div className={`tab-button ${gstSubTab === 'sales' ? 'active border-bottom-active' : ''}`} onClick={() => setGstSubTab('sales')}>B2B / B2C Sales (Output)</div> 
              <div className={`tab-button ${gstSubTab === 'returns' ? 'active border-bottom-active' : ''}`} onClick={() => setGstSubTab('returns')}>Credit/Debit Notes</div> 
              <div className={`tab-button ${gstSubTab === 'purchases' ? 'active border-bottom-active' : ''}`} onClick={() => setGstSubTab('purchases')}>B2B Purchases (Input)</div> 
              <div className={`tab-button ${gstSubTab === 'hsn' ? 'active border-bottom-active' : ''}`} onClick={() => setGstSubTab('hsn')}>HSN Summary</div> 
            </div> 
            <div className="table-responsive"> 
              {gstSubTab === 'sales' && ( 
                <table className="data-table"> 
                  <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Rate</th><th>Taxable Val</th><th>CGST</th><th>SGST</th><th>Total</th></tr></thead> 
                  <tbody> 
                    {filteredData.validInvoices.filter(i => !i.isReturn).map((inv, i) => { 
                       const cust = (customers || []).find(c => c.name === inv.customerName); 
                       const subtotal = Number(inv.grossTotal || 0); 
                       const discount = subtotal * (Number(inv.discountPercent || 0) / 100); 
                       const taxable = subtotal - discount; 
                       const rate = taxable > 0 ? Math.round(((Number(inv.cgst || 0) + Number(inv.sgst || 0)) / taxable) * 100) : 5; 
                       return ( 
                        <tr key={i}> 
                          <td className="fw-bold">{formatInvoiceId(inv.id)}</td> 
                          <td>{new Date(inv.orderDate).toLocaleDateString('en-GB')}</td> 
                          <td>{inv.customerName || 'Unknown'}</td> 
                          <td className="text-muted">{cust?.gstno || 'URD'}</td> 
                          <td>{rate}%</td> 
                          <td className="text-right">{formatMoney(taxable)}</td> 
                          <td className="text-right">{formatMoney(inv.cgst || 0)}</td> 
                          <td className="text-right">{formatMoney(inv.sgst || 0)}</td> 
                          <td className="text-right fw-bold">{formatMoney(inv.finalTotal || 0)}</td> 
                        </tr> 
                       ) 
                    })} 
                  </tbody> 
                </table> 
              )} 
              {gstSubTab === 'returns' && ( 
                <table className="data-table"> 
                  <thead><tr><th>Return ID</th><th>Date</th><th>Customer</th><th>Original Bill</th><th>Taxable Refund</th><th>CGST</th><th>SGST</th><th>Total Refund</th></tr></thead> 
                  <tbody> 
                    {filteredData.validInvoices.filter(i => i.isReturn).map((inv, i) => { 
                       const subtotal = Number(inv.grossTotal || 0); 
                       const discount = subtotal * (Number(inv.discountPercent || 0) / 100); 
                       const taxable = subtotal - discount; 
                       return ( 
                        <tr key={i}> 
                          <td className="fw-bold text-danger">{formatInvoiceId(inv.id)}/RET</td> 
                          <td>{new Date(inv.orderDate).toLocaleDateString('en-GB')}</td> 
                          <td>{inv.customerName || 'Unknown'}</td> 
                          <td className="text-muted">{formatInvoiceId(inv.id)}</td> 
                          <td className="text-right text-danger">-{formatMoney(taxable)}</td> 
                          <td className="text-right text-danger">-{formatMoney(inv.cgst || 0)}</td> 
                          <td className="text-right text-danger">-{formatMoney(inv.sgst || 0)}</td> 
                          <td className="text-right fw-bold text-danger">-{formatMoney(inv.finalTotal || 0)}</td> 
                        </tr> 
                       ) 
                    })} 
                  </tbody> 
                </table> 
              )} 
              {gstSubTab === 'purchases' && ( 
                <table className="data-table"> 
                  <thead><tr><th>Vendor Bill No</th><th>Sys ID</th><th>Date</th><th>Vendor Name</th><th>Rate</th><th>Taxable Val</th><th>CGST</th><th>SGST</th><th>Total</th></tr></thead> 
                  <tbody> 
                    {filteredData.validPurchases.map((pinv, i) => { 
                       const subtotal = Number(pinv.grossTotal || 0); 
                       const discount = subtotal * (Number(pinv.discountPercent || 0) / 100); 
                       const taxable = subtotal - discount; 
                       const rate = taxable > 0 ? Math.round(((Number(pinv.cgst || 0) + Number(pinv.sgst || 0)) / taxable) * 100) : 5; 
                       return ( 
                        <tr key={i}> 
                          <td className="fw-bold text-primary">{pinv.customInvoiceId || 'N/A'}</td> 
                          <td className="text-muted">{formatPurchaseInvoiceId(pinv.id)}</td> 
                          <td>{new Date(pinv.purchaseDate).toLocaleDateString('en-GB')}</td> 
                          <td>{pinv.sellerName || 'Unknown'}</td> 
                          <td>{rate}%</td> 
                          <td className="text-right">{formatMoney(taxable)}</td> 
                          <td className="text-right">{formatMoney(pinv.cgst || 0)}</td> 
                          <td className="text-right">{formatMoney(pinv.sgst || 0)}</td> 
                          <td className="text-right fw-bold">{formatMoney(pinv.finalTotal || 0)}</td> 
                        </tr> 
                       ) 
                    })} 
                  </tbody> 
                </table> 
              )} 
              {gstSubTab === 'hsn' && ( 
                <table className="data-table"> 
                  <thead><tr><th>HSN Code</th><th>Total Quantity</th><th>Total Value</th><th>Taxable Value</th><th>CGST</th><th>SGST</th></tr></thead> 
                  <tbody> 
                    {Object.entries(filteredData.hsnSales).map(([hsn, data], i) => ( 
                      <tr key={i}> 
                        <td className="fw-bold">{hsn}</td> 
                        <td>{data.qty} pcs</td> 
                        <td className="text-right">{formatMoney(data.val)}</td> 
                        <td className="text-right">{formatMoney(data.taxable)}</td> 
                        <td className="text-right">{formatMoney(data.cgst)}</td> 
                        <td className="text-right">{formatMoney(data.sgst)}</td> 
                      </tr> 
                    ))} 
                  </tbody> 
                </table> 
              )} 
            </div> 
          </div> 
        )} 

        {/* --- 2. PROFIT & LOSS TAB --- */} 
        {activeTab === 'pnl' && ( 
          <div> 
            <h3 className="text-primary">Detailed Profit & Loss Statement</h3> 
            <div className="dashboard-stats-grid mt-2 mb-2"> 
              <div className="card stat-card bg-slate-50"> 
                <h4 className="text-muted">Gross Revenue</h4> 
                <div className="fs-xxl fw-bold text-slate">{formatMoney(filteredData.grossSales)}</div> 
              </div> 
              <div className="card stat-card bg-slate-50"> 
                <h4 className="text-muted">Total Returns</h4> 
                <div className="fs-xxl fw-bold text-danger">-{formatMoney(filteredData.salesReturns)}</div> 
              </div> 
              <div className="card stat-card bg-slate-50"> 
                <h4 className="text-muted">Cost of Goods Sold (COGS)</h4> 
                <div className="fs-xxl fw-bold text-warning">{formatMoney(filteredData.cogs)}</div> 
              </div> 
            </div> 
            <div className="receipt-panel full-width-panel border-primary" style={{ maxWidth: '600px', margin: '0 auto' }}> 
              <h3 className="mb-1 border-bottom-padded text-center">Income Statement</h3> 
              <div className="d-flex justify-between mb-0-5 fs-lg"><span className="text-slate">Net Sales Revenue</span><span className="fw-bold">{formatMoney(filteredData.netSales)}</span></div> 
              <div className="d-flex justify-between mb-0-5 fs-lg"><span className="text-slate">Less: COGS (Purchase Cost of Items Sold)</span><span className="text-danger">-{formatMoney(filteredData.cogs)}</span></div> 
              <div className="d-flex justify-between mt-1 pt-1 border-top-light fs-xl"> 
                <span className="fw-bold text-primary">Gross Operating Profit</span> 
                <span className={`fw-bold ${filteredData.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatMoney(filteredData.grossProfit)}</span> 
              </div> 
              <div className="text-center mt-1 text-muted fw-bold">Gross Margin: {filteredData.marginPercent}%</div> 
            </div> 
          </div> 
        )} 

        {/* --- 3. SALES REPORT TAB --- */} 
        {activeTab === 'sales' && ( 
          <div> 
            <div className="card-header header-actions"> 
              <h3 className="text-primary">Detailed Sales Report</h3> 
              <button className="btn btn-success" onClick={generateSalesExport}>  Export Sales</button> 
            </div> 
            <div className="table-responsive mt-1"> 
              <table className="data-table"> 
                <thead><tr><th>Date</th><th>Bill No</th><th>Customer</th><th>Pay Mode</th><th>Items Qty</th><th>Subtotal</th><th>Tax</th><th>Total</th></tr></thead> 
                <tbody> 
                  {filteredData.validInvoices.map((inv, i) => ( 
                    <tr key={i}> 
                      <td>{new Date(inv.orderDate).toLocaleDateString('en-GB')}</td> 
                      <td className="fw-bold">{formatInvoiceId(inv.id)}</td> 
                      <td>{inv.customerName || 'Unknown'} {inv.isReturn && <span className="text-danger fw-bold">(Return)</span>}</td> 
                      <td><span className="badge">{inv.paymentMethod || 'Cash'}</span></td> 
                      <td className="text-center">{(inv.items || []).reduce((s, itm) => s + Number(itm.quantity || 0), 0)}</td> 
                      <td className="text-right">{formatMoney(Number(inv.grossTotal || 0))}</td> 
                      <td className="text-right">{formatMoney(Number(inv.cgst || 0) + Number(inv.sgst || 0))}</td> 
                      <td className={`text-right fw-bold ${inv.isReturn ? 'text-danger' : 'text-success'}`}>{formatMoney(Number(inv.finalTotal || 0))}</td> 
                    </tr> 
                  ))} 
                  {filteredData.validInvoices.length === 0 && <tr><td colSpan="8" className="empty-state">No sales in this date range.</td></tr>} 
                </tbody> 
              </table> 
            </div> 
          </div> 
        )} 

        {/* --- 4. PURCHASE REPORT TAB --- */} 
        {activeTab === 'purchases' && ( 
          <div> 
            <div className="card-header header-actions"> 
              <h3 className="text-primary">Detailed Purchase Report</h3> 
              <button className="btn btn-warning" onClick={generatePurchaseExport}>  Export Purchases</button> 
            </div> 
            <div className="table-responsive mt-1"> 
              <table className="data-table"> 
                <thead><tr><th>Date</th><th>Sys ID</th><th>Vendor Bill No</th><th>Vendor Name</th><th>Items Qty</th><th>Tax Paid</th><th>Total Value</th></tr></thead> 
                <tbody> 
                  {filteredData.validPurchases.map((pinv, i) => ( 
                    <tr key={i}> 
                      <td>{new Date(pinv.purchaseDate).toLocaleDateString('en-GB')}</td> 
                      <td className="fw-bold">{formatPurchaseInvoiceId(pinv.id)}</td> 
                      <td className="text-muted">{pinv.customInvoiceId || 'N/A'}</td> 
                      <td>{pinv.sellerName || 'Unknown'}</td> 
                      <td className="text-center">{(pinv.items || []).reduce((s, itm) => s + Number(itm.quantity || 0), 0)}</td> 
                      <td className="text-right">{formatMoney(Number(pinv.cgst || 0) + Number(pinv.sgst || 0))}</td> 
                      <td className="text-right fw-bold text-primary">{formatMoney(Number(pinv.finalTotal || 0))}</td> 
                    </tr> 
                  ))} 
                  {filteredData.validPurchases.length === 0 && <tr><td colSpan="7" className="empty-state">No purchases in this date range.</td></tr>} 
                </tbody> 
              </table> 
            </div> 
          </div> 
        )} 

        {/* --- 5. INVENTORY VALUATION TAB --- */} 
        {activeTab === 'stock' && ( 
          <div> 
            <div className="card-header header-actions"> 
              <div> 
                <h3 className="text-primary mb-0">Current Inventory Valuation</h3> 
                <p className="text-muted mt-0-5 mb-0">This shows the current value of goods sitting in your shop today.</p> 
              </div> 
              <button className="btn btn-purple" onClick={generateStockExport}>  Export Valuation</button> 
            </div> 
            
            <div className="dashboard-stats-grid single-col mt-1 mb-2"> 
               <div className="card stat-card bg-slate-50 border-primary"> 
                 <h4 className="text-muted">Total Stock Asset Value (Purchase Price)</h4> 
                 <div className="fs-xxl fw-bold text-primary">{formatMoney(filteredData.totalInventoryValue)}</div> 
               </div> 
               <div className="card stat-card bg-slate-50 border-success"> 
                 <h4 className="text-muted">Total Potential Retail Value (Selling Price)</h4> 
                 <div className="fs-xxl fw-bold text-success">{formatMoney(filteredData.totalInventoryMRP)}</div> 
               </div> 
            </div> 
            <div className="table-responsive"> 
              <table className="data-table"> 
                <thead><tr><th>Product ID</th><th>Product Name</th><th>Stock</th><th>Unit Buy Price</th><th>Total Asset Val</th><th>Unit Sell Price</th></tr></thead> 
                <tbody> 
                  {(products || []).map((p, i) => ( 
                    <tr key={i}> 
                      <td className="fw-bold text-muted">{p.id}</td> 
                      <td className="fw-bold">{p.name || 'Unknown'}</td> 
                      <td className={`fw-bold ${Number(p.stock || 0) <= 0 ? 'text-danger' : 'text-success'}`}>{Number(p.stock || 0)}</td> 
                      <td className="text-right">{formatMoney(Number(p.purchasePrice || 0))}</td> 
                      <td className="text-right fw-bold text-primary">{formatMoney(Number(p.purchasePrice || 0) * Number(p.stock || 0))}</td> 
                      <td className="text-right">{formatMoney(Number(p.price || 0))}</td> 
                    </tr> 
                  ))} 
                </tbody> 
              </table> 
            </div> 
          </div> 
        )} 
      </div> 
    </div> 
  ); 
}