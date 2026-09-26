import React, { useState, useEffect } from 'react'; 
import { formatProductId } from '../utils/formatters'; 
import { productService } from '../services/api'; 
import Pagination from '../components/Pagination'; 

export default function InventoryManager({ view, products, inventoryHistory, loadProducts, loadHistory }) { 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [dateFilterRange, setDateFilterRange] = useState('all'); 
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [itemsPerPage, setItemsPerPage] = useState(20); 
  
  const [showInventoryModal, setShowInventoryModal] = useState(false); 
  const [editingInventoryId, setEditingInventoryId] = useState(null); 
  
  // UPDATED: Replaced single stock string with dual box/piece state
  const [inventoryForm, setInventoryForm] = useState({ boxes: '', pieces: '' }); 

  useEffect(() => { 
    setCurrentPage(1); 
  }, [searchQuery, dateFilterRange, startDate, endDate, itemsPerPage]); 

  // --- Date Range Engine ---
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

  // --- Filtering & Pagination ---
  const safeSearch = (searchQuery || '').toLowerCase(); 
  const filteredProducts = products.filter(p =>  
    (p.name && p.name.toLowerCase().includes(safeSearch)) || 
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) || 
    formatProductId(p.id).toLowerCase().includes(safeSearch) 
  ); 
  const filteredInventoryHistory = inventoryHistory.filter(log =>  
    ((log.productName && log.productName.toLowerCase().includes(safeSearch)) || 
    (log.actionType && log.actionType.toLowerCase().includes(safeSearch))) && 
    isWithinDateRange(log.timestamp) 
  ); 
  const indexOfLastItem = currentPage * itemsPerPage; 
  const indexOfFirstItem = indexOfLastItem - itemsPerPage; 
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem); 
  const paginatedInventoryHistory = filteredInventoryHistory.slice(indexOfFirstItem, indexOfLastItem); 

  // --- DISPLAY FORMATTERS FOR BOXES & PIECES ---
  const formatStockDisplay = (stock, piecesPerBox) => {
    const numStock = Number(stock) || 0;
    if (numStock <= 0) return '0 Boxes';
    
    const pPerBox = Number(piecesPerBox) || 0;
    // If pieces aren't configured, just show boxes
    if (pPerBox <= 0) {
      return `${numStock.toFixed(2).replace(/\.00$/, '')} Boxes`;
    }
    
    const boxes = Math.floor(numStock);
    const fraction = numStock - boxes;
    const pieces = Math.round(fraction * pPerBox);
    
    let display = [];
    if (boxes > 0) display.push(`${boxes} Box${boxes > 1 ? 'es' : ''}`);
    if (pieces > 0) display.push(`${pieces} Piece${pieces > 1 ? 's' : ''}`);
    
    return display.length > 0 ? display.join(', ') : '0 Boxes';
  };

  const formatChangeDisplay = (change, piecesPerBox) => {
    const numChange = Number(change) || 0;
    if (numChange === 0) return '0';
    const sign = numChange > 0 ? '+' : '-';
    const absVal = Math.abs(numChange);
    return `${sign} ${formatStockDisplay(absVal, piecesPerBox)}`;
  };

  // --- HANDLERS ---
  function openInventoryModal(product) { 
    setEditingInventoryId(product.id); 
    
    const pPerBox = Number(product.piecesPerBox) || 0;
    let boxes = 0;
    let pieces = 0;
    
    if (pPerBox > 0) {
      boxes = Math.floor(product.stock || 0);
      pieces = Math.round(((product.stock || 0) - boxes) * pPerBox);
    } else {
      boxes = product.stock || 0;
    }
    
    setInventoryForm({ boxes: boxes.toString(), pieces: pieces.toString() }); 
    setShowInventoryModal(true); 
  } 

  function closeInventoryModal() { 
    setShowInventoryModal(false); 
    setEditingInventoryId(null); 
    setInventoryForm({ boxes: '', pieces: '' }); 
  } 

  function handleSaveInventory() { 
    const product = products.find(p => p.id === editingInventoryId); 
    const pPerBox = Number(product.piecesPerBox) || 0;
    
    const boxes = parseFloat(inventoryForm.boxes) || 0;
    const pieces = parseFloat(inventoryForm.pieces) || 0;
    
    let newStock = 0;
    if (pPerBox > 0) {
      newStock = boxes + (pieces / pPerBox);
    } else {
      newStock = boxes;
    }
    
    if (isNaN(newStock) || newStock < 0) return window.alert('Stock must be 0 or greater.'); 
    
    // CRITICAL: We pass all fields back so we don't accidentally overwrite piece prices to null
    productService.updateProduct( 
      product.id, 
      product.name, 
      product.purchasePrice, 
      product.mrp || product.price, 
      product.price, 
      newStock, 
      product.hsnCode,
      product.piecesPerBox,
      product.piecePurchasePrice,
      product.pieceMrp,
      product.piecePrice
    ).then(() => { 
      loadProducts(); 
      loadHistory(); 
      closeInventoryModal(); 
    }).catch(err => window.alert("Failed to update stock: " + err.message)); 
  } 

  return ( 
    <> 
      {/* 1. VIEW: STOCK BALANCE */} 
      {view === 'inventory' && ( 
        <div className="card"> 
          <div className="card-header header-actions"> 
            <h2 className="card-title mb-0">Inventory Stock Balance</h2> 
            <input type="text" className="form-control header-search" placeholder="Search products..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} /> 
          </div> 
          <div className="table-responsive"> 
            <table className="block-table data-table"> 
              <thead><tr><th>Product ID</th><th>Product Name</th><th>HSN Code</th><th>Current Stock</th><th>Action</th></tr></thead> 
              <tbody> 
                {paginatedProducts.length ? paginatedProducts.map((product) => ( 
                  <tr key={product.id} className="product-row available"> 
                    <td className="fw-bold cell-padded text-slate">{formatProductId(product.id)}</td> 
                    <td className="fw-bold cell-padded">{product.name}</td> 
                    <td className="cell-padded text-muted">{product.hsnCode || 'N/A'}</td> 
                    <td className={`fw-bold fs-lg cell-padded ${product.stock > 10 ? 'text-success' : (product.stock > 0 ? 'text-warning' : 'text-danger')}`}> 
                      {formatStockDisplay(product.stock, product.piecesPerBox)} 
                      {product.stock <= 0 && <span className="fs-sm text-danger d-block mt-0-5">(Out of Stock)</span>} 
                    </td> 
                    <td className="cell-padded"><button className="btn btn-warning" onClick={() => openInventoryModal(product)}>Update Stock</button></td> 
                  </tr> 
                )) : <tr><td colSpan={5} className="empty-state">No products found.</td></tr>} 
              </tbody> 
            </table> 
          </div> 
          <Pagination totalItems={filteredProducts.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} /> 
        </div> 
      )} 

      {/* 2. VIEW: INVENTORY HISTORY LOGS */} 
      {view === 'inventory-history' && ( 
        <div className="card"> 
          <div className="card-header header-actions header-actions-wrap"> 
            <h2 className="card-title mb-0">Inventory Movement History</h2> 
            <div className="header-filters-group"> 
              <input type="text" className="form-control mb-0 search-input-md" placeholder="Search products or actions..." style={{ width: '200px' }} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} /> 
              {renderDateFilter()} 
            </div> 
          </div> 
          <div className="table-responsive"> 
            <table className="block-table data-table"> 
              <thead><tr><th>Date & Time</th><th>Product</th><th>Action</th><th>Description</th><th>Qty Changed</th><th>Final Stock</th></tr></thead> 
              <tbody> 
                {paginatedInventoryHistory.length ? paginatedInventoryHistory.map(log => {
                  // Find product to get piecesPerBox for formatting
                  const product = products.find(p => p.id === log.productId || p.name === log.productName);
                  const pPerBox = product ? product.piecesPerBox : 0;
                  
                  return ( 
                    <tr key={log.id} className="product-row available"> 
                      <td className="cell-padded">{new Date(log.timestamp).toLocaleDateString('en-GB')}</td> 
                      <td className="fw-bold cell-padded text-slate">{log.productName}</td> 
                      <td className="cell-padded"><span className="badge">{log.actionType}</span></td> 
                      <td className="text-muted cell-padded">{log.description}</td> 
                      <td className={`fw-bold cell-padded ${log.quantityChanged > 0 ? 'text-success' : 'text-danger'}`}>
                        {formatChangeDisplay(log.quantityChanged, pPerBox)}
                      </td> 
                      <td className="fw-bold cell-padded text-primary">
                        {formatStockDisplay(log.finalStock, pPerBox)}
                      </td> 
                    </tr> 
                  )
                }) : <tr><td colSpan={6} className="empty-state">No inventory history found for this date range.</td></tr>} 
              </tbody> 
            </table> 
          </div> 
          <Pagination totalItems={filteredInventoryHistory.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} /> 
        </div> 
      )} 

      {/* MODAL: QUICK STOCK EDITOR (WITH BOX/PIECE SUPPORT) */} 
      {showInventoryModal && (() => {
        const activeProduct = products.find(p => p.id === editingInventoryId);
        const pPerBox = Number(activeProduct?.piecesPerBox) || 0;

        return (
          <div className="modal-overlay no-print"> 
            <div className="modal-content"> 
              <h3 className="modal-header-title">Update Inventory</h3> 
              <p className="text-dark-muted form-group mb-1-5">Updating stock for: <strong className="text-primary">{activeProduct?.name}</strong></p> 
              
              <div className="sales-control-row">
                <div className="form-group w-100">
                  <label className="form-label">Total Boxes:</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={inventoryForm.boxes} 
                    onChange={e => setInventoryForm({ ...inventoryForm, boxes: e.target.value })} 
                    min="0" 
                  />
                </div>
                
                {pPerBox > 0 && (
                  <div className="form-group w-100">
                    <label className="form-label">Loose Pieces:</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={inventoryForm.pieces} 
                      onChange={e => setInventoryForm({ ...inventoryForm, pieces: e.target.value })} 
                      min="0" 
                      max={pPerBox - 1} 
                    />
                  </div>
                )}
              </div>
              
              {pPerBox > 0 && (
                <div className="text-muted fs-sm mb-1">* This product has a configured ratio of {pPerBox} pieces per box.</div>
              )}

              <div className="modal-actions mt-1 pt-1 border-top-light"> 
                <button onClick={closeInventoryModal} className="btn btn-secondary">Cancel</button> 
                <button onClick={handleSaveInventory} className="btn btn-success">Save Adjusted Stock</button> 
              </div> 
            </div> 
          </div> 
        );
      })()} 
    </> 
  ); 
}