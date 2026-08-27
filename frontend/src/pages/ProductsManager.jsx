import React, { useState } from 'react';
import { formatProductId, formatMoney } from '../utils/formatters';
import { productService } from '../services/api';
import Pagination from '../components/Pagination';

export default function ProductsManager({ products, loadProducts, loadHistory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({ 
    name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '' 
  });

  // Filter & Pagination Logic
  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(safeSearch)) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(safeSearch)) ||
    formatProductId(p.id).toLowerCase().includes(safeSearch)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  // Handlers
  const handleSaveProduct = () => {
    const name = productForm.name.trim();
    const hsnCode = productForm.hsnCode.trim();
    const purchasePrice = parseFloat(productForm.purchasePrice);
    const mrp = parseFloat(productForm.mrp);
    const price = parseFloat(productForm.price);
    
    if (!name || isNaN(purchasePrice) || isNaN(mrp) || isNaN(price) || purchasePrice < 0 || price <= 0 || mrp <= 0) {
      return window.alert('Invalid details. Ensure all prices are positive numbers.');
    }
    
    if (isEditMode) {
      const existingProduct = products.find(p => p.id === editingProductId);
      productService.updateProduct(editingProductId, name, purchasePrice, mrp, price, existingProduct ? existingProduct.stock : 0, hsnCode)
        .then(() => { loadProducts(); loadHistory(); closeProductModal(); });
    } else {
      productService.addProduct(name, purchasePrice, mrp, price, parseInt(productForm.stock, 10) || 0, hsnCode)
        .then(() => { loadProducts(); loadHistory(); closeProductModal(); });
    }
  };

  const handleDeleteProduct = (id, name) => {
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This cannot be undone.`)) { 
      productService.deleteProduct(id).then(() => { loadProducts(); closeProductModal(); });
    }
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setProductForm({ name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '' });
  };

  return (
    <>
      <div className="card">
        <div className="card-header header-actions">
          <h2 className="card-title mb-0">Product Details</h2>
          <input 
            type="text" 
            className="form-control header-search search-expanded" 
            placeholder="Search products or HSN..." 
            value={searchQuery} 
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
          />
          <button 
            className="btn btn-primary" 
            onClick={() => { 
              setIsEditMode(false);
              setProductForm({ name: '', hsnCode: '', purchasePrice: '', mrp: '', price: '', stock: '' });
              setShowProductModal(true); 
            }}
          >
            + Add New Product
          </button>
        </div>
        
        <div className="table-responsive">
          <table className="block-table data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>HSN Code</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length ? paginatedProducts.map((product) => (
                <tr key={product.id} className="product-row available">
                  <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                  <td className="fw-bold cell-padded">{product.name}</td>
                  <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                  <td className="price-text text-warning cell-padded">{formatMoney(product.purchasePrice)}</td>
                  <td className="price-text text-success cell-padded">{formatMoney(product.price)}</td>
                  <td className="cell-padded">
                    <div className="btn-group">
                      <button className="btn btn-secondary" onClick={() => setViewingProduct(product)}>View</button>
                      <button 
                        className="btn btn-warning" 
                        onClick={() => { 
                          setIsEditMode(true);
                          setEditingProductId(product.id);
                          setProductForm({ 
                            name: product.name, hsnCode: product.hsnCode || '',
                            purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                            mrp: product.mrp ? product.mrp.toString() : product.price.toString(),
                            price: product.price.toString(), stock: product.stock.toString() 
                          });
                          setShowProductModal(true); 
                        }}
                      >
                        Edit Details
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty-state">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={filteredProducts.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* --- MODALS --- */}
      {viewingProduct && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Product Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block"><span className="info-label">Product ID</span><strong className="info-value">{formatProductId(viewingProduct.id)}</strong></div>
              <div className="info-block"><span className="info-label">Name</span><strong className="info-value">{viewingProduct.name}</strong></div>
              <div className="info-block"><span className="info-label">HSN Code</span><strong className="info-value">{viewingProduct.hsnCode || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Purchase Price</span><strong className="info-value text-warning">{formatMoney(viewingProduct.purchasePrice)}</strong></div>
              <div className="info-block"><span className="info-label">MRP</span><strong className="info-value text-muted">{formatMoney(viewingProduct.mrp || viewingProduct.price)}</strong></div>
              <div className="info-block"><span className="info-label">Selling Price</span><strong className="info-value text-success">{formatMoney(viewingProduct.price)}</strong></div>
              <div className="info-block"><span className="info-label">Current Stock</span><strong className={`info-value ${viewingProduct.stock > 10 ? 'text-success' : 'text-danger'}`}>{viewingProduct.stock} Units</strong></div>
            </div>
            <div className="modal-actions center-actions mt-1">
              <button onClick={() => setViewingProduct(null)} className="btn btn-secondary w-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">{isEditMode ? 'Edit Product Details' : 'Add New Product'}</h3>
            <div className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Product Name:</label><input className="form-control" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">HSN Code:</label><input className="form-control" value={productForm.hsnCode} placeholder="e.g. 6203" onChange={e => setProductForm({ ...productForm, hsnCode: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Purchase Price (Wholesale):</label><input type="number" className="form-control" value={productForm.purchasePrice} onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">MRP (Max Retail Price):</label><input type="number" className="form-control" value={productForm.mrp} onChange={e => setProductForm({ ...productForm, mrp: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Selling Price (Our Price):</label><input type="number" className="form-control" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></div>
              {!isEditMode && <div className="form-group"><label className="form-label">Initial Stock:</label><input type="number" className="form-control" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} /></div>}
            </div>
            <div className={`modal-actions modal-footer-actions ${isEditMode ? 'justify-between' : 'justify-end'}`}>
              {isEditMode && <button className="btn btn-danger" onClick={() => handleDeleteProduct(editingProductId, productForm.name)}>Delete</button>}
              <div className="flex-gap-1">
                <button onClick={closeProductModal} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveProduct} className="btn btn-success">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}