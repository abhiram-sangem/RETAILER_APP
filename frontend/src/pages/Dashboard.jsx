import React, { useState, useMemo } from 'react';
import { formatMoney, formatInvoiceId } from '../utils/formatters';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Dashboard({ invoices = [], setView }) {
  // =========================================
  // 1. STATE: INDEPENDENT DATE FILTERS
  // =========================================
  const [globalTime, setGlobalTime] = useState('this_month'); 
  const [globalStart, setGlobalStart] = useState('');
  const [globalEnd, setGlobalEnd] = useState('');

  const [ov1Time, setOv1Time] = useState('this_month');
  const [ov1Start, setOv1Start] = useState('');
  const [ov1End, setOv1End] = useState('');
  const [ov1Tab, setOv1Tab] = useState('daily'); 

  const [ov2Time, setOv2Time] = useState('last_month');
  const [ov2Start, setOv2Start] = useState('');
  const [ov2End, setOv2End] = useState('');
  const [ov2Tab, setOv2Tab] = useState('daily'); 

  // =========================================
  // 2. CORE FILTERING ENGINE
  // =========================================
  const applyDateFilter = (invoicesToFilter, filterType, startD, endD) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoicesToFilter.filter(inv => {
      const invDate = new Date(inv.orderDate);
      invDate.setHours(0, 0, 0, 0);

      if (filterType === 'this_month') {
        return invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
      }
      if (filterType === 'last_month') {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return invDate >= lastMonthStart && invDate <= lastMonthEnd;
      }
      if (filterType === 'last_6_months') {
        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
        return invDate >= sixMonthsAgo && invDate <= today;
      }
      if (filterType === 'this_year') {
        return invDate.getFullYear() === today.getFullYear();
      }
      if (filterType === 'this_financial_year') {
        const currentMonth = today.getMonth();
        const startYear = currentMonth >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const fyStart = new Date(startYear, 3, 1);
        return invDate >= fyStart;
      }
      if (filterType === 'custom') {
        if (startD && invDate < new Date(startD).setHours(0,0,0,0)) return false;
        if (endD && invDate > new Date(endD).setHours(23,59,59,999)) return false;
      }
      return true;
    });
  };

  const globalFiltered = useMemo(() => applyDateFilter(invoices, globalTime, globalStart, globalEnd), [invoices, globalTime, globalStart, globalEnd]);
  const ov1Filtered = useMemo(() => applyDateFilter(invoices, ov1Time, ov1Start, ov1End), [invoices, ov1Time, ov1Start, ov1End]);
  const ov2Filtered = useMemo(() => applyDateFilter(invoices, ov2Time, ov2Start, ov2End), [invoices, ov2Time, ov2Start, ov2End]);

  // =========================================
  // 3. TABULAR AGGREGATION ENGINE
  // =========================================
  const buildOverviewData = (filtered) => {
    const dailyMap = {}; const monthlyMap = {};
    let totalRevenue = 0;

    filtered.forEach(inv => {
      if (inv.isReturn) return;
      const amount = inv.finalTotal || inv.totalAmount || 0;
      totalRevenue += amount;

      const d = new Date(inv.orderDate);
      const dayKey = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!dailyMap[dayKey]) dailyMap[dayKey] = { label: d.toLocaleDateString('en-GB'), total: 0, sortDate: d };
      dailyMap[dayKey].total += amount;

      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { label: d.toLocaleString('en-GB', { month: 'short', year: 'numeric' }), total: 0, sortDate: new Date(d.getFullYear(), d.getMonth(), 1) };
      monthlyMap[monthKey].total += amount;
    });

    const toSortedArray = (map) => Object.values(map).sort((a, b) => b.sortDate - a.sortDate);
    return { daily: toSortedArray(dailyMap), monthly: toSortedArray(monthlyMap), totalRevenue };
  };

  const ov1Data = useMemo(() => buildOverviewData(ov1Filtered), [ov1Filtered]);
  const ov2Data = useMemo(() => buildOverviewData(ov2Filtered), [ov2Filtered]);

  // =========================================
  // 4. GLOBAL KPIS
  // =========================================
  const kpis = useMemo(() => {
    let revenue = 0; let returns = 0; let orderCount = 0;
    globalFiltered.forEach(inv => {
      const amount = inv.finalTotal || inv.totalAmount || 0;
      if (inv.isReturn) returns += amount;
      else { revenue += amount; orderCount++; }
    });
    return { revenue, returns, orderCount, aov: orderCount > 0 ? (revenue / orderCount) : 0 };
  }, [globalFiltered]);

  // =========================================
  // 5. CHART ENGINES
  // =========================================
  const salesTrendData = useMemo(() => {
    const dailySales = {};
    globalFiltered.forEach(inv => {
      if (inv.isReturn) return;
      const d = new Date(inv.orderDate).toISOString().split('T')[0];
      dailySales[d] = (dailySales[d] || 0) + (inv.finalTotal || inv.totalAmount || 0);
    });

    const sortedDates = Object.keys(dailySales).sort(); 
    if (sortedDates.length === 0) return [];

    const chartData = sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      Actual: dailySales[date],
      Predicted: null
    }));

    if (sortedDates.length >= 3) {
      const last3 = sortedDates.slice(-3).map(d => dailySales[d]);
      const avg = last3.reduce((a, b) => a + b, 0) / 3;
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);

      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        const variance = avg * (Math.random() * 0.1 - 0.05); 
        
        chartData.push({
          date: nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          Actual: null,
          Predicted: Math.round(avg + variance)
        });
      }
    }
    return chartData;
  }, [globalFiltered]);

  const orderVolumeData = useMemo(() => {
    const dailyOrders = {};
    globalFiltered.forEach(inv => {
      if (inv.isReturn) return;
      const d = new Date(inv.orderDate).toISOString().split('T')[0];
      dailyOrders[d] = (dailyOrders[d] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyOrders).sort();
    return sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      Orders: dailyOrders[date]
    }));
  }, [globalFiltered]);

  const topProductsData = useMemo(() => {
    const productCounts = {};
    globalFiltered.forEach(inv => {
      if (inv.isReturn) return;
      inv.items?.forEach(item => {
        const name = item.product?.name || 'Unknown';
        productCounts[name] = (productCounts[name] || 0) + item.quantity;
      });
    });
    return Object.entries(productCounts).map(([name, qty]) => ({ name, Sales: qty })).sort((a, b) => b.Sales - a.Sales).slice(0, 5);
  }, [globalFiltered]);

  const paymentData = useMemo(() => {
    const methods = {};
    globalFiltered.forEach(inv => {
      if (inv.isReturn) return;
      const method = inv.paymentMethod || 'Cash';
      methods[method] = (methods[method] || 0) + (inv.finalTotal || inv.totalAmount || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [globalFiltered]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  // =========================================
  // REUSABLE UI HELPERS
  // =========================================
  const renderTimeDropdown = (val, setVal) => (
    <select className="form-control mb-0" style={{ padding: '4px', fontSize: '13px', width: 'auto' }} value={val} onChange={e => setVal(e.target.value)}>
      <option value="this_month">This Month</option>
      <option value="last_month">Last Month</option>
      <option value="last_6_months">Last 6 Months</option>
      <option value="this_year">This Year</option>
      <option value="this_financial_year">Financial Year</option>
      <option value="all">All Time</option>
      <option value="custom">Custom Range...</option>
    </select>
  );

  const renderOverviewCard = (title, data, tab, setTab, time, setTime, start, setStart, end, setEnd) => (
    <div className="card mb-0" style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header pb-1 border-none" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <h3 className="card-title mb-0 fs-lg">{title}</h3>
          {renderTimeDropdown(time, setTime)}
        </div>
        
        {time === 'custom' && (
          <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
            <input type="date" className="form-control mb-0" style={{ padding: '4px', fontSize: '12px' }} value={start} onChange={e => setStart(e.target.value)} />
            <input type="date" className="form-control mb-0" style={{ padding: '4px', fontSize: '12px' }} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        )}

        <div className="btn-group w-100 mt-1">
          <button className={`btn ${tab === 'daily' ? 'btn-primary' : 'btn-secondary'} flex-1 mb-0 py-1`} onClick={() => setTab('daily')}>Daily</button>
          <button className={`btn ${tab === 'monthly' ? 'btn-primary' : 'btn-secondary'} flex-1 mb-0 py-1`} onClick={() => setTab('monthly')}>Monthly</button>
        </div>
      </div>
      
      <div style={{ padding: '0 1.5rem', paddingBottom: '0.5rem' }}>
        <div className="text-muted fs-sm fw-bold">Period Revenue: <span className="text-success">{formatMoney(data.totalRevenue)}</span></div>
      </div>

      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem' }}>
        <table className="summary-table w-100">
          <tbody>
            {data[tab].length === 0 ? (
              <tr><td className="text-dark-muted text-center pt-2">No records found</td></tr>
            ) : (
              data[tab].map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="py-1 fw-bold text-slate">{item.label}</td>
                  <td className="py-1 text-success text-right fw-bold">{formatMoney(item.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      
      {/* GLOBAL HEADER & FILTER */}
      <div className="card-header header-actions header-actions-wrap mb-2 pb-1" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <h2 className="card-title mb-0">Business Intelligence Dashboard</h2>
        <div className="header-filters-group">
          <label className="fw-bold text-primary mr-1 mb-0" style={{ alignSelf: 'center' }}>Global Filter (Applies to KPIs & Charts):</label>
          {renderTimeDropdown(globalTime, setGlobalTime)}
          {globalTime === 'custom' && (
            <div style={{ display: 'flex', gap: '5px' }}>
              <input type="date" className="form-control mb-0 date-input-sm" value={globalStart} onChange={e => setGlobalStart(e.target.value)} />
              <input type="date" className="form-control mb-0 date-input-sm" value={globalEnd} onChange={e => setGlobalEnd(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* 🚀 TOP ROW: TWO WIDE SALES OVERVIEWS (Left) + COMPACT VERTICAL KPIS (Right) */}
      <div className="reports-layout mb-2" style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        
        {renderOverviewCard("Sales Overview 1", ov1Data, ov1Tab, setOv1Tab, ov1Time, setOv1Time, ov1Start, setOv1Start, ov1End, setOv1End)}
        {renderOverviewCard("Sales Overview 2", ov2Data, ov2Tab, setOv2Tab, ov2Time, setOv2Time, ov2Start, setOv2Start, ov2End, setOv2End)}

        {/* Compact Vertical KPI Column */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card stat-card mb-0" style={{ borderLeft: '4px solid #10b981', padding: '12px 15px' }}>
            <h4 className="text-muted mb-0 fs-sm">Global Revenue</h4>
            <div className="fs-xl fw-bold text-success mt-0-5">{formatMoney(kpis.revenue)}</div>
          </div>
          <div className="card stat-card mb-0" style={{ borderLeft: '4px solid #3b82f6', padding: '12px 15px' }}>
            <h4 className="text-muted mb-0 fs-sm">Total Orders</h4>
            <div className="fs-xl fw-bold text-primary mt-0-5">{kpis.orderCount}</div>
          </div>
          <div className="card stat-card mb-0" style={{ borderLeft: '4px solid #8b5cf6', padding: '12px 15px' }}>
            <h4 className="text-muted mb-0 fs-sm">Avg. Order Value</h4>
            <div className="fs-xl fw-bold text-purple mt-0-5">{formatMoney(kpis.aov)}</div>
          </div>
          <div className="card stat-card mb-0" style={{ borderLeft: '4px solid #ef4444', padding: '12px 15px' }}>
            <h4 className="text-muted mb-0 fs-sm">Total Returns</h4>
            <div className="fs-xl fw-bold text-danger mt-0-5">{formatMoney(kpis.returns)}</div>
          </div>
        </div>
      </div>

      {/* SECOND ROW: CHARTS */}
      <div className="reports-layout mb-2" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card mb-0" style={{ flex: '1.8', minWidth: '400px' }}>
          <div className="card-header border-none pb-0">
            <h3 className="card-title">Revenue Forecast & Historical Trend</h3>
          </div>
          <div style={{ width: '100%', height: 320, padding: '10px' }}>
            {salesTrendData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={salesTrendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Predicted" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (<div className="empty-state">No sales data available.</div>)}
          </div>
        </div>

        <div className="card mb-0" style={{ flex: '1.2', minWidth: '300px' }}>
          <div className="card-header border-none pb-0">
            <h3 className="card-title">Order Volume Trend</h3>
          </div>
          <div style={{ width: '100%', height: 320, padding: '10px' }}>
            {orderVolumeData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={orderVolumeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Legend />
                  <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="empty-state">No order data available.</div>)}
          </div>
        </div>
      </div>

      {/* THIRD ROW: PIE / BAR CHARTS */}
      <div className="reports-layout mb-2" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="card mb-0" style={{ flex: '1.5', minWidth: '350px' }}>
          <div className="card-header border-none pb-0"><h3 className="card-title">Top 5 Products</h3></div>
          <div style={{ width: '100%', height: 300 }}>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fill: '#475569', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="Sales" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {topProductsData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="empty-state">No product data available.</div>)}
          </div>
        </div>

        <div className="card mb-0" style={{ flex: '1', minWidth: '300px' }}>
          <div className="card-header border-none pb-0"><h3 className="card-title">Revenue by Payment Mode</h3></div>
          <div style={{ width: '100%', height: 300 }}>
            {paymentData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="empty-state">No payment data available.</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}