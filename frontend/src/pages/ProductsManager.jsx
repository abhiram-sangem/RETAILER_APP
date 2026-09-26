import React, { useState } from 'react';
import { formatProductId, formatMoney } from '../utils/formatters';
import { productService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ProductsManager({ products, loadProducts, loadHistory }) {
  const [viewState, setViewState] = useState('list'); // 'list', 'add', 'edit'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  
  const [productForm, setProductForm] = useState({ 
    name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '',
    piecesPerBox: '', piecePurchasePrice: '', pieceMrp: '', piecePrice: ''
  });

  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) ||
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
    
    // Optional Piece fields
    const piecesPerBox = parseInt(productForm.piecesPerBox, 10) || 0;
    const piecePurchasePrice = parseFloat(productForm.piecePurchasePrice) || 0;
    const pieceMrp = parseFloat(productForm.pieceMrp) || 0;
    const piecePrice = parseFloat(productForm.piecePrice) || 0;
    
    if (!name || isNaN(purchasePrice) || isNaN(mrp) || isNaN(price) || purchasePrice < 0 || price <= 0 || mrp <= 0) {
      return window.alert('Invalid details. Ensure all main Box prices are positive numbers.');
    }
    
    const payload = {
      name, purchasePrice, mrp, price, hsnCode,
      piecesPerBox, piecePurchasePrice, pieceMrp, piecePrice
    };

    if (viewState === 'edit') {
      const existingProduct = products.find(p => p.id === editingProductId);
      productService.updateProduct(editingProductId, name, purchasePrice, mrp, price, existingProduct ? existingProduct.stock : 0, hsnCode, piecesPerBox, piecePurchasePrice, pieceMrp, piecePrice)
        .then(() => { loadProducts(); loadHistory(); closeForm(); });
    } else {
      productService.addProduct(name, purchasePrice, mrp, price, parseFloat(productForm.stock) || 0, hsnCode, piecesPerBox, piecePurchasePrice, pieceMrp, piecePrice)
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
    setProductForm({ name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '', piecesPerBox: '', piecePurchasePrice: '', pieceMrp: '', piecePrice: '' });
  };

  // FORMAT STOCK HELPER
  const renderStock = (stock, piecesPerBox) => {
    if (!piecesPerBox || piecesPerBox <= 0) return `${stock} Units`;
    const boxes = Math.floor(stock);
    const pieces = Math.round((stock - boxes) * piecesPerBox);
    return `${boxes} Box${boxes !== 1 ? 'es' : ''} ${pieces > 0 ? `, ${pieces} Pcs` : ''}`;
  };

  if (viewState === 'add' || viewState === 'edit') {
    return (
      <div className="card form-page-card">
        <div className="card-header header-actions">
          <h2 className="card-title">{viewState === 'edit' ? 'Edit Product Details' : 'Add New Product'}</h2>
          <button className="btn btn-secondary action-buttons-right" onClick={closeForm}>Back to List</button>
        </div>
        
        <div className="form-container p-2">
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

  // --- LIST VIEW ---
  return (
    <>
      <div className="card">
        <div className="card-header header-actions">
          <h2 className="card-title mb-0">Product Masterlist</h2>
          <input type="text" className="form-control header-search search-expanded" placeholder="Search products or HSN..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
          <button className="btn btn-primary" onClick={() => setViewState('add')}>+ Add New Product</button>
        </div>
        
        <div className="table-responsive">
          <table className="block-table data-table">
            <thead>
              <tr>
                <th>Product ID</th><th>Product Name</th><th>HSN Code</th>
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
                  <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
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
                          piecePrice: product.piecePrice ? product.piecePrice.toString() : ''
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

      {/* VIEW MODAL (Kept simple since forms moved to new page) */}
      {viewingProduct && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Product Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block"><span className="info-label">Name</span><strong className="info-value">{viewingProduct.name}</strong></div>
              <div className="info-block"><span className="info-label">Box Purchase / Selling</span><strong className="info-value">{formatMoney(viewingProduct.purchasePrice)} / <span className="text-success">{formatMoney(viewingProduct.price)}</span></strong></div>
              {viewingProduct.piecesPerBox > 0 && (
                <>
                  <div className="info-block"><span className="info-label text-purple">Pieces Per Box</span><strong className="info-value text-purple">{viewingProduct.piecesPerBox}</strong></div>
                  <div className="info-block"><span className="info-label text-purple">Piece Purchase / Selling</span><strong className="info-value text-purple">{formatMoney(viewingProduct.piecePurchasePrice)} / {formatMoney(viewingProduct.piecePrice)}</strong></div>
                </>
              )}
            </div>
            <div className="modal-actions center-actions mt-1"><button onClick={() => setViewingProduct(null)} className="btn btn-secondary w-100">Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}