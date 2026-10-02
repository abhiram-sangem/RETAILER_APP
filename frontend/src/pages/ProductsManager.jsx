import React, { useState } from 'react';
import Barcode from 'react-barcode';
import { formatProductId, formatMoney } from '../utils/formatters';
import { productService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ProductsManager({ products, loadProducts, loadHistory }) {
  const [viewState, setViewState] = useState('list'); // 'list', 'add', 'edit', 'print-studio'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  
  const [productForm, setProductForm] = useState({ 
    name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '',
    piecesPerBox: '', piecePurchasePrice: '', pieceMrp: '', piecePrice: '', barcode: ''
  });

  // --- Print Studio State ---
  const [printCopies, setPrintCopies] = useState({}); // { productId: copyCount }
  const [barcodeWidth, setBarcodeWidth] = useState(1.5);
  const [barcodeHeight, setBarcodeHeight] = useState(40);
  const [printColumns, setPrintColumns] = useState(4); // New Column Controller
  
  // Range Selector State
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeCopies, setRangeCopies] = useState(1);

  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) ||
    (p.barcode && p.barcode.toLowerCase().includes(safeSearch)) ||
    formatProductId(p.id).toLowerCase().includes(safeSearch)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handleSaveProduct = () => {
    const name = productForm.name.trim();
    const hsnCode = productForm.hsnCode.trim();
    const purchasePrice = parseFloat(productForm.purchasePrice);
    const mrp = parseFloat(productForm.mrp);
    const price = parseFloat(productForm.price);
    const barcode = productForm.barcode?.trim() || '';
    
    const piecesPerBox = parseInt(productForm.piecesPerBox, 10) || 0;
    const piecePurchasePrice = parseFloat(productForm.piecePurchasePrice) || 0;
    const pieceMrp = parseFloat(productForm.pieceMrp) || 0;
    const piecePrice = parseFloat(productForm.piecePrice) || 0;
    
    if (!name || isNaN(purchasePrice) || isNaN(mrp) || isNaN(price) || purchasePrice < 0 || price <= 0 || mrp <= 0) {
      return window.alert('Invalid details. Ensure all main Box prices are positive numbers.');
    }

    if (viewState === 'edit') {
      const existingProduct = products.find(p => p.id === editingProductId);
      productService.updateProduct(editingProductId, name, purchasePrice, mrp, price, existingProduct ? existingProduct.stock : 0, hsnCode, piecesPerBox, piecePurchasePrice, pieceMrp, piecePrice, barcode)
        .then(() => { loadProducts(); loadHistory(); closeForm(); });
    } else {
      productService.addProduct(name, purchasePrice, mrp, price, parseFloat(productForm.stock) || 0, hsnCode, piecesPerBox, piecePurchasePrice, pieceMrp, piecePrice, barcode)
        .then(() => { loadProducts(); loadHistory(); closeForm(); });
    }
  };

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This cannot be undone.`)) { 
      productService.deleteProduct(id).then(() => { loadProducts(); closeForm(); });
    }
  };

  const closeForm = () => {
    setViewState('list');
    setEditingProductId(null);
    setProductForm({ name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '', piecesPerBox: '', piecePurchasePrice: '', pieceMrp: '', piecePrice: '', barcode: '' });
  };

  const renderStock = (stock, piecesPerBox) => {
    if (!piecesPerBox || piecesPerBox <= 0) return `${stock} Units`;
    const boxes = Math.floor(stock);
    const pieces = Math.round((stock - boxes) * piecesPerBox);
    return `${boxes} Box${boxes !== 1 ? 'es' : ''} ${pieces > 0 ? `, ${pieces} Pcs` : ''}`;
  };

  // --- PRINT STUDIO HANDLERS ---
  const handleCopyChange = (id, val) => {
    const qty = parseInt(val, 10);
    setPrintCopies({ ...printCopies, [id]: isNaN(qty) || qty < 0 ? 0 : qty });
  };

  const handleTileClick = (id) => {
    const current = printCopies[id] || 0;
    setPrintCopies({ ...printCopies, [id]: current === 0 ? 1 : 0 });
  };

  const handleApplyRange = () => {
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    const copies = parseInt(rangeCopies, 10) || 1;
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      return window.alert("Please enter a valid range (e.g., Start: 1, End: 50).");
    }

    const newCopies = { ...printCopies };
    for (let i = start - 1; i < end && i < filteredProducts.length; i++) {
      const p = filteredProducts[i];
      newCopies[p.id] = copies;
    }
    setPrintCopies(newCopies);
    setRangeStart('');
    setRangeEnd('');
  };

  const clearAllSelections = () => {
    if (window.confirm("Clear all barcode selections?")) {
      setPrintCopies({});
    }
  };

  const generateBarcodesToPrint = () => {
    const itemsToPrint = [];
    Object.entries(printCopies).forEach(([idString, copies]) => {
      if (copies > 0) {
        const id = parseInt(idString, 10);
        const product = products.find(p => p.id === id);
        if (product) {
          const codeValue = product.barcode || formatProductId(product.id);
          for (let i = 0; i < copies; i++) {
            itemsToPrint.push({ product, codeValue });
          }
        }
      }
    });
    return itemsToPrint;
  };

  // --- VIEWS ---
  if (viewState === 'add' || viewState === 'edit') {
    return (
      <div className="card form-page-card">
        <div className="card-header header-actions">
          <h2 className="card-title">{viewState === 'edit' ? 'Edit Product Details' : 'Add New Product'}</h2>
          <button className="btn btn-secondary action-buttons-right" onClick={closeForm}>Back to List</button>
        </div>
        
        <div className="form-container p-2">
          {/* BARCODE HIGHLIGHT SECTION */}
          <div className="receipt-panel bg-slate-50 mb-2 border-primary" style={{ padding: '15px' }}>
             <label className="form-label text-primary fw-bold mb-0-5">📱 Manufacturer Barcode (Scan Item Now)</label>
             <p className="text-muted fs-sm mt-0 mb-1">Click the box below and use your barcode scanner, or leave blank to auto-generate a System SKU.</p>
             <input 
                type="text" 
                className="form-control mb-0 fs-lg fw-bold" 
                style={{ borderColor: '#0ea5e9', borderStyle: 'dashed', borderWidth: '2px' }}
                value={productForm.barcode} 
                placeholder="Scan barcode here..." 
                onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} 
                autoFocus
             />
          </div>

          <h4 className="section-title-spacing text-primary border-bottom pb-0-5 mb-1">Standard Info (Box / Main Unit)</h4>
          <div className="sales-control-row">
            <div className="form-group w-100"><label className="form-label">Product Name:</label><input className="form-control" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">HSN Code:</label><input className="form-control" value={productForm.hsnCode} placeholder="e.g. 6203" onChange={e => setProductForm({ ...productForm, hsnCode: e.target.value })} /></div>
            {!editingProductId && <div className="form-group w-100"><label className="form-label">Initial Stock (Total Boxes):</label><input type="number" step="0.01" className="form-control" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} /></div>}
          </div>

          <div className="sales-control-row">
            <div className="form-group w-100"><label className="form-label">Purchase Price (Per Box):</label><input type="number" className="form-control" value={productForm.purchasePrice} onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">MRP (Per Box):</label><input type="number" className="form-control" value={productForm.mrp} onChange={e => setProductForm({ ...productForm, mrp: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">Selling Price (Per Box):</label><input type="number" className="form-control" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></div>
          </div>

          <h4 className="section-title-spacing text-purple border-bottom pb-0-5 mb-1 mt-2">Piece Breakdown (Optional)</h4>
          <p className="text-muted fs-sm mb-1">Fill this out if you sell individual pieces out of a box. The system will track fractional inventory automatically.</p>
          
          <div className="sales-control-row">
            <div className="form-group w-100"><label className="form-label text-purple fw-bold">Pieces per Box:</label><input type="number" className="form-control" placeholder="e.g. 10" value={productForm.piecesPerBox} onChange={e => setProductForm({ ...productForm, piecesPerBox: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">Piece Purchase Price:</label><input type="number" className="form-control" value={productForm.piecePurchasePrice} onChange={e => setProductForm({ ...productForm, piecePurchasePrice: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">Piece MRP:</label><input type="number" className="form-control" value={productForm.pieceMrp} onChange={e => setProductForm({ ...productForm, pieceMrp: e.target.value })} /></div>
            <div className="form-group w-100"><label className="form-label">Piece Selling Price:</label><input type="number" className="form-control" value={productForm.piecePrice} onChange={e => setProductForm({ ...productForm, piecePrice: e.target.value })} /></div>
          </div>

          <div className={`modal-actions mt-2 pt-1 border-top ${viewState === 'edit' ? 'justify-between' : 'justify-end'}`}>
            {viewState === 'edit' && <button className="btn btn-danger" onClick={() => handleDeleteProduct(editingProductId, productForm.name)}>Delete Product</button>}
            <div className="flex-gap-1">
              <button onClick={closeForm} className="btn btn-secondary fs-lg">Cancel</button>
              <button onClick={handleSaveProduct} className="btn btn-success fs-lg">Save Product Details</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ADVANCED TILE-BASED PRINT STUDIO ---
  if (viewState === 'print-studio') {
    const totalToPrint = generateBarcodesToPrint().length;

    return (
      <>
        {/* THIS SECTION IS VISIBLE ON SCREEN, BUT HIDDEN ON PRINT */}
        <div className="card no-print">
          <div className="card-header header-actions border-bottom pb-1">
            <h2 className="card-title">Barcode Print Studio</h2>
            <button className="btn btn-secondary action-buttons-right" onClick={() => { setViewState('list'); setPrintCopies({}); }}>Exit Studio</button>
          </div>
          
          <div className="sales-control-row align-items-center mt-1 mb-1 p-1 bg-slate-50" style={{ borderRadius: '8px' }}>
            <div className="form-group mb-0" style={{ flex: 1 }}>
              <label className="fs-sm text-muted">Filter Products</label>
              <input type="text" className="form-control mb-0" placeholder="Search product to print..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            <div style={{ width: '2px', height: '40px', backgroundColor: '#cbd5e1', margin: '0 10px' }}></div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flex: 2 }}>
              <div className="form-group mb-0">
                <label className="fs-sm text-purple fw-bold">Select Range (e.g. 1 to 50)</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="number" className="form-control mb-0" placeholder="Start" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={{ width: '80px' }}/>
                  <span style={{ alignSelf: 'center' }}>to</span>
                  <input type="number" className="form-control mb-0" placeholder="End" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={{ width: '80px' }}/>
                </div>
              </div>
              <div className="form-group mb-0">
                <label className="fs-sm text-muted">Copies</label>
                <input type="number" className="form-control mb-0" value={rangeCopies} onChange={e => setRangeCopies(e.target.value)} style={{ width: '70px' }}/>
              </div>
              <button className="btn btn-purple mb-0" onClick={handleApplyRange}>Apply Range</button>
              <button className="btn btn-secondary mb-0" onClick={clearAllSelections}>Clear All</button>
            </div>
          </div>

          <div className="sales-control-row align-items-start mt-2">
            <div style={{ flex: 2 }}>
              <h3 className="mb-1 text-slate">Select Products to Print</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
                {filteredProducts.map((p, index) => {
                  const copies = printCopies[p.id] || 0;
                  const isSelected = copies > 0;
                  return (
                    <div 
                      key={p.id} 
                      className="card mb-0 shadow-panel" 
                      style={{ 
                        padding: '12px', cursor: 'pointer', transition: 'all 0.2s',
                        border: isSelected ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f0f9ff' : 'white'
                      }}
                      onClick={() => handleTileClick(p.id)}
                    >
                      <div className="d-flex justify-between mb-0-5">
                        <span className="text-muted fs-sm fw-bold">#{index + 1}</span>
                        <span className="text-muted fs-sm">{p.barcode || formatProductId(p.id)}</span>
                      </div>
                      <div className="fw-bold text-truncate mb-0-5" title={p.name}>{p.name}</div>
                      <div className="text-success fw-bold mb-1">{formatMoney(p.price)}</div>
                      <div onClick={e => e.stopPropagation()}>
                        <label className="fs-sm text-muted">Copies to Print:</label>
                        <input 
                          type="number" min="0" className="form-control mb-0" placeholder="0" 
                          value={copies === 0 ? '' : copies} 
                          onChange={e => handleCopyChange(p.id, e.target.value)} 
                          style={{ textAlign: 'center', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && <div className="text-muted mt-2 w-100">No products match your search.</div>}
              </div>
            </div>

            <div style={{ flex: 1, position: 'sticky', top: '0' }} className="card shadow-panel bg-slate-50">
              <h3 className="mb-1 border-bottom-padded text-primary">Printer Layout Settings</h3>
              
              <div className="form-group w-100">
                <label className="form-label">Labels per Row (Columns)</label>
                <input type="number" min="1" max="10" className="form-control" value={printColumns} onChange={e => setPrintColumns(Number(e.target.value) || 1)} />
              </div>

              <div className="form-group w-100">
                <label className="form-label">Barcode Line Width (Thickness)</label>
                <input type="number" step="0.1" className="form-control" value={barcodeWidth} onChange={e => setBarcodeWidth(Number(e.target.value))} />
              </div>
              
              <div className="form-group w-100">
                <label className="form-label">Barcode Height (px)</label>
                <input type="number" className="form-control" value={barcodeHeight} onChange={e => setBarcodeHeight(Number(e.target.value))} />
              </div>

              <div className="receipt-panel bg-white mt-1 border-primary">
                 <div className="d-flex justify-between">
                   <span className="text-slate fw-bold">Total Labels Ready:</span>
                   <span className="text-primary fw-bold fs-xl">{totalToPrint}</span>
                 </div>
              </div>

              <button 
                className={`btn w-100 mt-2 fs-lg ${totalToPrint > 0 ? 'btn-success' : 'btn-secondary'}`} 
                disabled={totalToPrint === 0}
                onClick={() => window.print()}
              >
                🖨️ Print Labels Now
              </button>
              <p className="text-muted fs-sm mt-1 text-center">Press `Ctrl+P` scaling to fine-tune to your sticker paper.</p>
            </div>
          </div>
        </div>

        {/* THIS SECTION IS HIDDEN ON SCREEN, BUT VISIBLE ON PRINT */}
        <div className="print-only-block">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${printColumns}, 1fr)`, 
            gap: '10px', 
            padding: '10px',
            justifyItems: 'center' 
          }}>
            {generateBarcodesToPrint().map((item, index) => (
              <div key={index} style={{ 
                border: '1px dashed #ccc', padding: '10px', textAlign: 'center', 
                width: 'auto', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                pageBreakInside: 'avoid'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name}</div>
                <Barcode value={item.codeValue} width={barcodeWidth} height={barcodeHeight} fontSize={12} margin={5} displayValue={true} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px' }}>MRP: {formatMoney(item.product.mrp || item.product.price)}</div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // --- MAIN LIST VIEW ---
  return (
    <>
      <div className="card no-print">
        <div className="card-header header-actions">
          <h2 className="card-title mb-0">Product Masterlist</h2>
          <input type="text" className="form-control header-search search-expanded" placeholder="Search products, HSN, or Barcode..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-purple" onClick={() => { setViewState('print-studio'); setPrintCopies({}); }}>🖨️ Open Print Studio</button>
            <button className="btn btn-primary" onClick={() => setViewState('add')}>+ Add New Product</button>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="block-table data-table">
            <thead>
              <tr>
                <th>System ID</th><th>Product Name</th><th>Barcode / SKU</th>
                <th>Box MRP</th><th>Box Price</th>
                <th>Stock Availability</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length ? paginatedProducts.map((product) => (
                <tr key={product.id} className="product-row available">
                  <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                  <td className="fw-bold cell-padded">{product.name}
                    {product.piecesPerBox > 0 && <div className="fs-sm text-purple">({product.piecesPerBox} Pcs/Box)</div>}
                  </td>
                  <td className="cell-padded text-muted">{product.barcode || '-'}</td>
                  <td className="fw-bold text-slate cell-padded">{formatMoney(product.mrp || product.price)}</td>
                  <td className="price-text text-success cell-padded">{formatMoney(product.price)}</td>
                  <td className="fw-bold cell-padded text-dark-blue">{renderStock(product.stock, product.piecesPerBox)}</td>
                  <td className="cell-padded">
                    <div className="btn-group">
                      <button className="btn btn-secondary" onClick={() => setViewingProduct(product)}>View</button>
                      <button className="btn btn-warning" onClick={() => { 
                        setEditingProductId(product.id);
                        setProductForm({ 
                          name: product.name, hsnCode: product.hsnCode || '',
                          purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                          mrp: product.mrp ? product.mrp.toString() : product.price.toString(),
                          price: product.price.toString(), stock: product.stock.toString(),
                          piecesPerBox: product.piecesPerBox ? product.piecesPerBox.toString() : '',
                          piecePurchasePrice: product.piecePurchasePrice ? product.piecePurchasePrice.toString() : '',
                          pieceMrp: product.pieceMrp ? product.pieceMrp.toString() : '',
                          piecePrice: product.piecePrice ? product.piecePrice.toString() : '',
                          barcode: product.barcode || ''
                        });
                        setViewState('edit'); 
                      }}>Edit</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="empty-state">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={filteredProducts.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* FULL EXPANDED VIEW MODAL */}
      {viewingProduct && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">Comprehensive Product Details</h3>
            <div className="invoice-summary-grid grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              {/* Primary Column */}
              <div className="info-block"><span className="info-label">System ID</span><strong className="info-value">{formatProductId(viewingProduct.id)}</strong></div>
              <div className="info-block"><span className="info-label">Product Name</span><strong className="info-value text-primary">{viewingProduct.name}</strong></div>
              <div className="info-block"><span className="info-label">HSN Code</span><strong className="info-value">{viewingProduct.hsnCode || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Custom Barcode / SKU</span><strong className="info-value text-slate">{viewingProduct.barcode || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Current Stock Available</span><strong className="info-value text-dark-blue">{renderStock(viewingProduct.stock, viewingProduct.piecesPerBox)}</strong></div>
              <div></div> {/* Empty spacer to align next rows */}

              {/* Box Pricing Column */}
              <div className="info-block"><span className="info-label">Box Purchase Price</span><strong className="info-value">{formatMoney(viewingProduct.purchasePrice)}</strong></div>
              <div className="info-block"><span className="info-label">Box MRP</span><strong className="info-value text-muted">{formatMoney(viewingProduct.mrp)}</strong></div>
              <div className="info-block"><span className="info-label">Box Selling Price</span><strong className="info-value text-success">{formatMoney(viewingProduct.price)}</strong></div>
              <div></div>

              {/* Fractional/Piece Pricing Column */}
              {viewingProduct.piecesPerBox > 0 && (
                <>
                  <div className="info-block border-top pt-1"><span className="info-label text-purple">Pieces Per Box Ratio</span><strong className="info-value text-purple">{viewingProduct.piecesPerBox} Pcs = 1 Box</strong></div>
                  <div className="info-block border-top pt-1"><span className="info-label text-purple">Piece Purchase Price</span><strong className="info-value text-purple">{formatMoney(viewingProduct.piecePurchasePrice)}</strong></div>
                  <div className="info-block"><span className="info-label text-purple">Piece MRP</span><strong className="info-value text-muted">{formatMoney(viewingProduct.pieceMrp)}</strong></div>
                  <div className="info-block"><span className="info-label text-purple">Piece Selling Price</span><strong className="info-value text-purple fw-bold">{formatMoney(viewingProduct.piecePrice)}</strong></div>
                </>
              )}
            </div>
            <div className="modal-actions center-actions mt-2 border-top pt-1">
              <button onClick={() => setViewingProduct(null)} className="btn btn-secondary w-100 fs-lg">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}