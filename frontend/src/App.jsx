import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { productService, invoiceService, customerService } from './services/api'

export default function App() {
  const [view, setView] = useState('list') 
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(true)
  const [activeCustomer, setActiveCustomer] = useState(null)
  
  // --- Search & Pagination State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('') 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // --- Cart & Billing State ---
  const [discountPercent, setDiscountPercent] = useState(0)
  const [cart, setCart] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('cart')) || [] 
    } catch { 
      return [] 
    }
  })
  const [error, setError] = useState('')

  // --- Modals State ---
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ 
    name: '', 
    purchasePrice: '', 
    price: '', 
    stock: '' 
  })

  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventoryForm, setInventoryForm] = useState({ stock: '' })

  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerForm, setCustomerForm] = useState({ 
    name: '', 
    gstno: '', 
    mobile: '', 
    city: '' 
  })

  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    setSearchQuery('')
    setCurrentPage(1)
  }, [view])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, itemsPerPage])

  // --- Advanced Billing Math ---
  const billingDetails = useMemo(() => {
    const grossTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountAmount = grossTotal * (discountPercent / 100)
    const taxableAmount = grossTotal - discountAmount
    const cgst = taxableAmount * 0.025
    const sgst = taxableAmount * 0.025
    const finalTotal = taxableAmount + cgst + sgst

    return { 
      grossTotal, 
      discountAmount, 
      cgst, 
      sgst, 
      finalTotal 
    }
  }, [cart, discountPercent])

  // --- Filtering Logic ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.mobile && c.mobile.includes(searchQuery)) ||
    (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.gstno && c.gstno.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const dropdownFilteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const filteredInvoices = invoices.filter(i => 
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.id.toString().includes(searchQuery)
  )

  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage

  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem)

  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
    return (
      <div className="pagination-wrapper">
        <div>
          <label className="fw-bold" style={{ marginRight: '0.5rem' }}>
            Rows per page:
          </label>
          <select 
            className="form-control mb-0" 
            style={{ width: 'auto', display: 'inline-block', padding: '0.3rem' }} 
            value={itemsPerPage} 
            onChange={e => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="pagination-info">
          <span className="pagination-text">
            Showing {totalItems === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems}
          </span>
          <div className="btn-group">
            <button 
              className="btn btn-secondary" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Prev
            </button>
            <button 
              className="btn btn-secondary" 
              disabled={currentPage >= totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- API Loaders & Cart Functions ---
  function loadProducts() { 
    productService.getProducts().then(data => setProducts(Array.isArray(data) ? data : [])) 
  }

  function loadCustomers() { 
    customerService.getCustomers().then(data => setCustomers(Array.isArray(data) ? data : [])) 
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      return window.alert(`Sorry, ${product.name} is currently out of stock!`)
    }
    
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      
      if (existing) {
        if (existing.quantity >= product.stock) {
          window.alert(`Cannot add more. We only have ${product.stock} of ${product.name} in stock.`)
          return current
        }
        return current.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(index, quantity) {
    if (quantity < 1) return
    
    setCart(current => {
      const item = current[index]
      if (quantity > item.stock) {
        window.alert(`Cannot exceed available inventory (${item.stock} left).`)
        return current
      }
      return current.map((itm, idx) => 
        idx === index 
          ? { ...itm, quantity } 
          : itm
      )
    })
  }

  function removeCartItem(index) { 
    setCart(current => current.filter((_, idx) => idx !== index)) 
  }

  function submitCart() {
    if (!cart.length) {
      return window.alert('Cart is empty.')
    }
    if (!activeCustomer) {
      return window.alert('Please select a customer from the top dropdown before completing the sale.')
    }

    invoiceService.create(
      activeCustomer.name, 
      cart, 
      billingDetails.grossTotal, 
      discountPercent, 
      billingDetails.cgst, 
      billingDetails.sgst, 
      billingDetails.finalTotal
    )
      .then(invoice => {
        window.alert(`Sale #${invoice.id} completed successfully!`)
        setCart([])
        setActiveCustomer(null)
        setCustomerSearch('')
        setDiscountPercent(0)
        setView('list')
        loadProducts() 
      })
      .catch((err) => window.alert('Failed to complete sale. ' + err.message))
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale?")) {
      setCart([])
      setActiveCustomer(null)
      setCustomerSearch('')
      setDiscountPercent(0)
      setView('list')
    }
  }

  // --- CRUD Functions ---
  function handleSaveProduct() {
    const name = productForm.name.trim()
    const purchasePrice = parseFloat(productForm.purchasePrice)
    const price = parseFloat(productForm.price)
    
    if (!name || isNaN(purchasePrice) || isNaN(price) || purchasePrice < 0 || price <= 0) {
      return window.alert('Invalid details.')
    }

    if (isEditMode) {
      const existingProduct = products.find(p => p.id === editingProductId)
      productService.updateProduct(
        editingProductId, 
        name, 
        purchasePrice, 
        price, 
        existingProduct ? existingProduct.stock : 0
      ).then(() => { 
        loadProducts()
        closeProductModal() 
      })
    } else {
      productService.addProduct(
        name, 
        purchasePrice, 
        price, 
        parseInt(productForm.stock, 10) || 0
      ).then(() => { 
        loadProducts()
        closeProductModal() 
      })
    }
  }

  function handleDeleteProduct(id, name) { 
    if (window.confirm(`Delete "${name}"?`)) {
      productService.deleteProduct(id).then(loadProducts) 
    }
  }

  function closeProductModal() { 
    setShowProductModal(false)
    setProductForm({ name: '', purchasePrice: '', price: '', stock: '' }) 
  }

  function openInventoryModal(product) { 
    setEditingInventoryId(product.id)
    setInventoryForm({ stock: product.stock.toString() })
    setShowInventoryModal(true) 
  }

  function closeInventoryModal() { 
    setShowInventoryModal(false)
    setEditingInventoryId(null)
    setInventoryForm({ stock: '' }) 
  }

  function handleSaveInventory() {
    const newStock = parseInt(inventoryForm.stock, 10)
    if (isNaN(newStock) || newStock < 0) {
      return window.alert('Stock must be 0 or greater.')
    }
    
    const product = products.find(p => p.id === editingInventoryId)
    productService.updateProduct(
      product.id, 
      product.name, 
      product.purchasePrice, 
      product.price, 
      newStock
    ).then(() => { 
      loadProducts()
      closeInventoryModal() 
    })
  }

  function handleSaveCustomer() {
    const { name, gstno, mobile, city } = customerForm
    if (!name?.trim()) {
      return window.alert('Name is required')
    }

    const action = isCustomerEditMode 
      ? customerService.updateCustomer(editingCustomerId, name, gstno, mobile, city) 
      : customerService.addCustomer(name, gstno, mobile, city)
      
    action.then(() => { 
      loadCustomers()
      closeCustomerModal() 
    })
  }

  function handleDeleteCustomer(id, name) {
    if (window.confirm(`Delete customer "${name}"?`)) {
      customerService.deleteCustomer(id).then(() => {
        loadCustomers()
        if (activeCustomer?.id === id) { 
          setActiveCustomer(null)
          setCustomerSearch('') 
        }
      })
    }
  }

  function closeCustomerModal() { 
    setShowCustomerModal(false)
    setCustomerForm({ name: '', gstno: '', mobile: '', city: '' }) 
  }

  function handleViewSalesList() {
    invoiceService.getInvoices().then(data => {
      const sortedInvoices = (data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      setInvoices(sortedInvoices)
      setView('invoices')
    })
  }

  function handleViewInvoiceDetails(invoiceId) { 
    invoiceService.getInvoiceById(invoiceId).then(data => setSelectedInvoice(data)) 
  }

  return (
    <div className="app-layout">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-header">
          Retailer App
        </div>
        
        <div className="menu-group">
          <button 
            className="menu-btn" 
            onClick={() => setIsSalesMenuOpen(!isSalesMenuOpen)}
          >
            <span>Sales</span>
            <span>{isSalesMenuOpen ? ' ' : ' '}</span>
          </button>
          
          {isSalesMenuOpen && (
            <div>
              <button 
                className={`submenu-btn ${['list', 'cart'].includes(view) ? 'active' : ''}`} 
                onClick={() => setView('list')}
              >
                New Sales
              </button>
              <button 
                className={`submenu-btn ${view === 'invoices' ? 'active' : ''}`} 
                onClick={handleViewSalesList}
              >
                Sales List
              </button>
            </div>
          )}
        </div>
        
        <button 
          className={`menu-btn ${view === 'inventory' ? 'active' : ''}`} 
          onClick={() => setView('inventory')}
        >
          Inventory
        </button>
        <button 
          className={`menu-btn ${view === 'customers-manage' ? 'active' : ''}`} 
          onClick={() => setView('customers-manage')}
        >
          Manage Customers
        </button>
        <button 
          className={`menu-btn ${view === 'products' ? 'active' : ''}`} 
          onClick={() => setView('products')}
        >
          Manage Products
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        
        {error && (
          <div className="text-danger mb-0">{error}</div>
        )}

        {/* =========================================
            VIEW 1: COMBINED SHOPPING LIST
            ========================================= */}
        {view === 'list' && (
          <div>
            {/* Control Panel (Customer & Product Search) */}
            <div className="sales-control-panel">
              <div className="sales-control-row">
                
                {/* Customer Input Group */}
                <div className="input-group" style={{ flex: 'none', width: '250px' }}>
                  <label>Select Customer</label>
                  <div className="dropdown-container">
                    <input 
                      type="text" 
                      className={`form-control mb-0 ${!activeCustomer ? 'customer-input-warning' : ''}`}
                      placeholder="Search or select customer..." 
                      value={customerSearch} 
                      onFocus={() => setIsDropdownOpen(true)} 
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      onChange={e => { 
                        setCustomerSearch(e.target.value)
                        setIsDropdownOpen(true)
                        setActiveCustomer(null) 
                      }}
                    />
                    {isDropdownOpen && (
                      <ul className="dropdown-menu">
                        {dropdownFilteredCustomers.length > 0 ? dropdownFilteredCustomers.map(c => (
                          <li 
                            key={c.id} 
                            className="dropdown-item" 
                            onMouseDown={() => { 
                              setActiveCustomer(c)
                              setCustomerSearch(c.name)
                              setIsDropdownOpen(false) 
                            }}
                          >
                            {c.name}
                          </li>
                        )) : (
                          <li className="dropdown-empty">No customers found</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Product Search Group */}
                <div className="input-group">
                  <label>Search Products</label>
                  <input 
                    type="text" 
                    className="form-control mb-0" 
                    placeholder="Search by product name..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="sales-control-row">
                <div className="action-buttons-right">
                  <button className="btn btn-danger" onClick={cancelSale}>
                    Cancel Sale
                  </button>
                  <button className="btn btn-warning" onClick={() => setView('cart')}>
                    View Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
                  </button>
                </div>
              </div>
            </div>

            {/* Product Blocks Table */}
            <div className="table-responsive">
              <table className="block-table">
                <thead>
                  <tr>
                    <th className="col-product-name">Product Name</th>
                    <th>Selling Price</th>
                    <th>Available Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const cartItem = cart.find(c => c.id === product.id)
                    const inCartQty = cartItem ? cartItem.quantity : 0
                    const availableStock = product.stock - inCartQty
                    const isOutOfStock = availableStock <= 0

                    return (
                      <tr 
                        key={product.id} 
                        className={`product-row ${isOutOfStock ? 'out-of-stock' : 'available'}`}
                        onClick={() => { 
                          if (!isOutOfStock) addToCart(product) 
                        }}
                        title={isOutOfStock ? 'Out of stock' : 'Click block to add to cart'}
                      >
                        <td className="col-product-name cell-padded">
                          {product.name}
                        </td>
                        <td className="price-text cell-padded">
                          {product.price} rs
                        </td>
                        <td className={`fw-bold cell-padded ${isOutOfStock ? 'text-danger' : 'text-success'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${availableStock} Units`}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 2: SHOPPING CART
            ========================================= */}
        {view === 'cart' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">
                Cart - {activeCustomer ? activeCustomer.name : <span className="text-danger">No Customer Selected</span>}
              </h2>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => setView('list')}
              >
                Back to Products
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length ? cart.map((item, idx) => (
                    <tr key={`${item.id}-${idx}`}>
                      <td>
                        {item.name} 
                        <span className="text-dark-muted fs-sm"> (Max: {item.stock})</span>
                      </td>
                      <td>{item.price} rs</td>
                      <td>
                        <input
                          type="number" 
                          className="quantity-input" 
                          min="1" 
                          max={item.stock} 
                          value={item.quantity} 
                          onChange={e => updateQuantity(idx, Number(e.target.value))} 
                        />
                      </td>
                      <td className="price-text">{item.price * item.quantity} rs</td>
                      <td>
                        <button className="btn btn-danger" onClick={() => removeCartItem(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="empty-state">Cart is empty.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* CLEAN RECEIPT SUMMARY */}
            <div className="receipt-wrapper">
              <div className="receipt-panel">
                <h3 className="receipt-header">Bill Summary</h3>
                
                <div className="receipt-row">
                  <span className="fw-bold">Gross Total:</span>
                  <span>{billingDetails.grossTotal.toFixed(2)} rs</span>
                </div>
                
                <div className="receipt-row">
                  <span className="fw-bold">Discount (%):</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={discountPercent} 
                    onChange={e => setDiscountPercent(Number(e.target.value))} 
                    className="form-control discount-input" 
                  />
                </div>

                {billingDetails.discountAmount > 0 && (
                  <div className="receipt-row highlight-red">
                    <span>Discount Applied:</span>
                    <span>-{billingDetails.discountAmount.toFixed(2)} rs</span>
                  </div>
                )}
                
                <div className="receipt-row">
                  <span>CGST (2.5%):</span>
                  <span>+{billingDetails.cgst.toFixed(2)} rs</span>
                </div>
                
                <div className="receipt-row">
                  <span>SGST (2.5%):</span>
                  <span>+{billingDetails.sgst.toFixed(2)} rs</span>
                </div>
                
                <div className="receipt-total">
                  <span>Final Total:</span>
                  <span className="text-success">{billingDetails.finalTotal.toFixed(2)} rs</span>
                </div>

                <button className="btn btn-success btn-checkout" onClick={submitCart}>
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            VIEW 3: SALES LIST
            ========================================= */}
        {view === 'invoices' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Sales List</h2>
              <input 
                type="text" 
                className="form-control header-search" 
                placeholder="Search by Bill ID or Customer..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Customer Name</th>
                    <th>Final Total (rs)</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.length ? paginatedInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>#{invoice.id}</td>
                      <td>{invoice.customerName}</td>
                      <td className="price-text text-success fw-bold">
                        {invoice.finalTotal || invoice.totalAmount}
                      </td>
                      <td>{new Date(invoice.orderDate).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleViewInvoiceDetails(invoice.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="empty-state">No sales found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {renderPagination(filteredInvoices.length)}

            {/* Sales Details Modal (Inline) */}
            {selectedInvoice && (
              <div className="card invoice-details-card">
                <h3 className="modal-header-title">Sale #{selectedInvoice.id} Details</h3>
                
                {/* --- VERTICAL INFO BLOCKS FOR CUSTOMER DETAILS --- */}
                <div className="invoice-summary-grid">
                  <div className="info-block">
                    <span className="info-label">Customer</span>
                    <strong className="info-value">{selectedInvoice.customerName}</strong>
                  </div>
                  <div className="info-block">
                    <span className="info-label">Date & Time</span>
                    <strong className="info-value">{new Date(selectedInvoice.orderDate).toLocaleString()}</strong>
                  </div>
                </div>

                <h4>Items Purchased</h4>
                <div className="table-responsive" style={{ marginBottom: '1rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.product.name}</td>
                          <td>{item.price}</td>
                          <td>{item.quantity}</td>
                          <td>{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vertical Math Details */}
                <div className="invoice-math-wrapper">
                  <div className="invoice-math-box">
                    <div className="receipt-row">
                      <strong>Gross Total:</strong>
                      <span>{selectedInvoice.grossTotal || selectedInvoice.totalAmount} rs</span>
                    </div>
                    
                    {selectedInvoice.discountPercent > 0 && (
                      <div className="receipt-row highlight-red">
                        <span>Discount ({selectedInvoice.discountPercent}%):</span>
                        <span>-{ (selectedInvoice.grossTotal * selectedInvoice.discountPercent / 100).toFixed(2) } rs</span>
                      </div>
                    )}
                    
                    {selectedInvoice.cgst > 0 && (
                      <div className="receipt-row">
                        <span>CGST (2.5%):</span>
                        <span>+{selectedInvoice.cgst} rs</span>
                      </div>
                    )}
                    
                    {selectedInvoice.sgst > 0 && (
                      <div className="receipt-row">
                        <span>SGST (2.5%):</span>
                        <span>+{selectedInvoice.sgst} rs</span>
                      </div>
                    )}
                    
                    <div className="receipt-total">
                      <span>Final Total:</span>
                      <span className="text-success">{selectedInvoice.finalTotal || selectedInvoice.totalAmount} rs</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedInvoice(null)} 
                  className="btn btn-secondary" 
                  style={{ marginTop: '1.5rem' }}
                >
                  Close View
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            VIEW 4: INVENTORY MANAGEMENT
            ========================================= */}
        {view === 'inventory' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Inventory</h2>
              <input 
                type="text" 
                className="form-control header-search" 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Current Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length ? paginatedProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{product.name}</td>
                      <td className={`fw-bold fs-lg ${product.stock > 10 ? 'text-success' : (product.stock > 0 ? 'text-warning' : 'text-danger')}`}>
                        {product.stock} {product.stock <= 0 && '(Out of Stock)'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-warning" 
                          onClick={() => openInventoryModal(product)}
                        >
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {renderPagination(filteredProducts.length)}
          </div>
        )}

        {/* =========================================
            VIEW 5: MANAGE CUSTOMERS
            ========================================= */}
        {view === 'customers-manage' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Customer Management</h2>
              <input 
                type="text" 
                className="form-control header-search search-expanded" 
                placeholder="Search name, phone, GST, city..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <button 
                className="btn btn-primary" 
                onClick={() => { 
                  setIsCustomerEditMode(false)
                  setCustomerForm({ name: '', gstno: '', mobile: '', city: '' })
                  setShowCustomerModal(true) 
                }}
              >
                + Add New Customer
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>GST No</th>
                    <th>Mobile</th>
                    <th>City</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.length ? paginatedCustomers.map((c, index) => (
                    <tr key={c.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{c.name}</td>
                      <td>{c.gstno}</td>
                      <td>{c.mobile}</td>
                      <td>{c.city}</td>
                      <td>
                        <div className="btn-group">
                          <button 
                            className="btn btn-warning" 
                            onClick={() => { 
                              setIsCustomerEditMode(true)
                              setEditingCustomerId(c.id)
                              setCustomerForm({ 
                                name: c.name, 
                                gstno: c.gstno || '', 
                                mobile: c.mobile || '', 
                                city: c.city || '' 
                              })
                              setShowCustomerModal(true) 
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="empty-state">No customers found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {renderPagination(filteredCustomers.length)}
          </div>
        )}

        {/* =========================================
            VIEW 6: MANAGE PRODUCTS
            ========================================= */}
        {view === 'products' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Product Details</h2>
              <input 
                type="text" 
                className="form-control header-search search-expanded" 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <button 
                className="btn btn-primary" 
                onClick={() => { 
                  setIsEditMode(false)
                  setProductForm({ name: '', purchasePrice: '', price: '', stock: '' })
                  setShowProductModal(true) 
                }}
              >
                + Add New Product
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Purchase Price (rs)</th>
                    <th>Selling Price (rs)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length ? paginatedProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{product.name}</td>
                      <td className="price-text text-warning">{product.purchasePrice || 0} rs</td>
                      <td className="price-text">{product.price} rs</td>
                      <td>
                        <div className="btn-group">
                          <button 
                            className="btn btn-warning" 
                            onClick={() => { 
                              setIsEditMode(true)
                              setEditingProductId(product.id)
                              setProductForm({ 
                                name: product.name, 
                                purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                                price: product.price.toString(), 
                                stock: product.stock.toString() 
                              })
                              setShowProductModal(true) 
                            }}
                          >
                            Edit Details
                          </button>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {renderPagination(filteredProducts.length)}
          </div>
        )}
      </main>

      {/* =========================================
          GLOBAL MODALS (Popups)
          ========================================= */}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">Update Inventory</h3>
            <p className="text-dark-muted form-group">
              Updating stock for: <strong>{products.find(p => p.id === editingInventoryId)?.name}</strong>
            </p>
            
            <div className="form-group">
              <label className="form-label">New Total Stock:</label>
              <input 
                type="number" 
                className="form-control" 
                value={inventoryForm.stock} 
                onChange={e => setInventoryForm({ stock: e.target.value })} 
                min="0" 
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={closeInventoryModal} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveInventory} className="btn btn-success">Save Stock</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">{isEditMode ? 'Edit Product Details' : 'Add New Product'}</h3>
            
            <div className="form-group">
              <label className="form-label">Name:</label>
              <input 
                className="form-control" 
                value={productForm.name} 
                onChange={e => setProductForm({ ...productForm, name: e.target.value })} 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Purchase Price (rs):</label>
              <input 
                type="number" 
                className="form-control" 
                value={productForm.purchasePrice} 
                onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Selling Price (rs):</label>
              <input 
                type="number" 
                className="form-control" 
                value={productForm.price} 
                onChange={e => setProductForm({ ...productForm, price: e.target.value })} 
              />
            </div>
            
            {!isEditMode && (
              <div className="form-group">
                <label className="form-label">Initial Stock:</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.stock} 
                  onChange={e => setProductForm({ ...productForm, stock: e.target.value })} 
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button onClick={closeProductModal} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveProduct} className="btn btn-success">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">{isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}</h3>
            
            <div className="form-group">
              <label className="form-label">Customer Name:</label>
              <input 
                type="text" 
                className="form-control" 
                value={customerForm.name} 
                onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} 
                placeholder="Enter customer name" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">GST No:</label>
              <input 
                type="text" 
                className="form-control" 
                value={customerForm.gstno} 
                onChange={e => setCustomerForm({ ...customerForm, gstno: e.target.value })} 
                placeholder="Enter GST Number" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Mobile:</label>
              <input 
                type="text" 
                className="form-control" 
                value={customerForm.mobile} 
                onChange={e => setCustomerForm({ ...customerForm, mobile: e.target.value })} 
                placeholder="Enter Mobile Number" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">City:</label>
              <input 
                type="text" 
                className="form-control" 
                value={customerForm.city} 
                onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })} 
                placeholder="Enter City" 
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={closeCustomerModal} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveCustomer} className="btn btn-success">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}