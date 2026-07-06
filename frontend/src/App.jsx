import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { productService, invoiceService, customerService } from './services/api'

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'VESTS', price: 120, stock: 50 },
  { id: '2', name: 'BRIEF', price: 320, stock: 30 },
  { id: '3', name: 'SHIRT', price: 850, stock: 15 },
]

export default function App() {
  const [view, setView] = useState('customer')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])

  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(true)
  const [activeCustomer, setActiveCustomer] = useState(null)

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })
  const [error, setError] = useState('')

  // Product Modal States (For Name & Price)
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '' , purchasePrice: '' })

  // Inventory Modal States (For Stock Only)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventoryForm, setInventoryForm] = useState({ stock: '' })

  // Customer Modal States
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerForm, setCustomerForm] = useState({ name: '', gstno: '', mobile: '', city: '' })

  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  function loadProducts() {
    productService.getProducts()
      .then(data => setProducts(Array.isArray(data) ? data : DEFAULT_PRODUCTS))
      .catch(() => {
        setError('Unable to load products. Showing sample data.')
        setProducts(DEFAULT_PRODUCTS)
      })
  }

  function loadCustomers() {
    customerService.getCustomers()
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to load customers:", err))
  }

  // --- Cart & Sale Functions ---
  function addToCart(product) {
    if (product.stock <= 0) {
      window.alert(`Sorry, ${product.name} is currently out of stock!`)
      return
    }

    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          window.alert(`Cannot add more. We only have ${product.stock} of ${product.name} in stock.`)
          return current
        }
        return current.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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
      return current.map((itm, idx) => idx === index ? { ...itm, quantity } : itm)
    })
  }

  function removeCartItem(index) {
    setCart(current => current.filter((_, idx) => idx !== index))
  }

  function submitCart() {
    if (!cart.length) {
      window.alert('Cart is empty.')
      return
    }
    if (!activeCustomer) {
      window.alert('No customer selected.')
      setView('customer')
      return
    }

    invoiceService.create(activeCustomer.name, cart)
      .then(invoice => {
        window.alert(`Sale #${invoice.id} completed successfully for ${invoice.customerName}!`)
        setCart([])
        setActiveCustomer(null)
        setView('customer')
        loadProducts() 
      })
      .catch((err) => window.alert('Failed to complete sale. ' + err.message))
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale? All items in the cart will be removed.")) {
      setCart([])
      setActiveCustomer(null)
      setView('customer')
    }
  }

  // --- Product Management (Name & Price Only) ---
  function handleSaveProduct() {
    const name = productForm.name.trim()
    const price = parseFloat(productForm.price)
    const purchasePrice = parseFloat(productForm.purchasePrice)

    if (!name || !price || price <= 0) {
      return window.alert('Invalid details. Ensure price is greater than 0.')
    }

    if (isEditMode) {
      // Find current stock to preserve it during name/price update
      const existingProduct = products.find(p => p.id === editingProductId)
      const preserveStock = existingProduct ? existingProduct.stock : 0

      productService.updateProduct(editingProductId, name, price, preserveStock, purchasePrice).then(() => {
        loadProducts()
        closeProductModal()
      })
    } else {
      // Allow setting initial stock only when creating a brand new product
      const initialStock = parseInt(productForm.stock, 10) || 0
      productService.addProduct(name, price, initialStock, purchasePrice).then(() => {
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

  // --- Inventory Management (Stock Only) ---
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
    if (!product) return

    // Preserve the existing name and price, ONLY update the stock
    productService.updateProduct(product.id, product.name, product.price, newStock)
      .then(() => {
        loadProducts()
        closeInventoryModal()
      })
      .catch(() => window.alert('Failed to update inventory.'))
  }

  // --- Customer Management Functions ---
  function handleSaveCustomer() {
    const name = customerForm.name.trim()
    const gstno = customerForm.gstno.trim()
    const mobile = customerForm.mobile.trim()
    const city = customerForm.city.trim()

    if (!name) return window.alert('Name is required')
    

    if (isCustomerEditMode) {
      customerService.updateCustomer(editingCustomerId, name, gstno, mobile, city).then(() => {
        loadCustomers()
        closeCustomerModal()
      })
    } else {
      customerService.addCustomer(name, gstno, mobile, city).then(() => {
        loadCustomers()
        closeCustomerModal()
      })
    }
  }

  function handleDeleteCustomer(id, name) {
    if (window.confirm(`Delete customer "${name}"?`)) {
      customerService.deleteCustomer(id).then(() => {
        loadCustomers()
        if (activeCustomer && activeCustomer.id === id) {
          setActiveCustomer(null)
        }
      })
    }
  }

  function closeCustomerModal() {
    setShowCustomerModal(false)
    setCustomerForm({ name: '' , gstno: '', mobile: '', city: '' })
  }

  function handleViewSalesList() {
    invoiceService.getInvoices().then(data => {
      setInvoices(data || [])
      setView('invoices')
    })
  }

  function handleViewInvoiceDetails(invoiceId) {
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data)
    })
  }

  return (
    <div className="app-layout">
      
      {/* 🟢 LEFT SIDEBAR 🟢 */}
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
            <span>{isSalesMenuOpen ? '▼' : '▶'}</span>
          </button>
          
          {isSalesMenuOpen && (
            <div>
              <button 
                className={`submenu-btn ${['customer', 'list', 'cart'].includes(view) ? 'active' : ''}`}
                onClick={() => setView('customer')}
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

      {/* 🔵 MAIN CONTENT AREA 🔵 */}
      <main className="main-content">
        
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        {/* 1. SELECT CUSTOMER */}
        {view === 'customer' && (
          <div className="card text-center">
            <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Start a New Sale</h2>
            <div className="form-container">
              <label className="form-label">Select Customer:</label>
              <select 
                className="form-control"
                value={activeCustomer ? activeCustomer.id : ''} 
                onChange={e => {
                  const cust = customers.find(c => c.id === Number(e.target.value))
                  setActiveCustomer(cust || null)
                }}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>              
            </div>
            <button 
              className="btn btn-success"
              onClick={() => {
                if (!activeCustomer) {
                  window.alert('Please select a customer to begin.')
                  return
                }
                setView('list')
              }}
            >
              Proceed to Products
            </button>
          </div>
        )}

        {/* 2. SHOPPING LIST */}
        {view === 'list' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Adding items for: <span className="highlight-text">{activeCustomer?.name}</span></h2>
              <div className="btn-group">
                <button className="btn btn-warning" onClick={() => setView('cart')}>
                  View Cart ({cart.length})
                </button>
                <button className="btn btn-danger" onClick={cancelSale}>
                  Cancel Sale
                </button>
              </div>
            </div>

            <ul className="product-grid">
              {products.map(product => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <li key={product.id} className="product-card" style={{ opacity: isOutOfStock ? 0.6 : 1 }}>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="price-text">{product.price} rs</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '5px', color: isOutOfStock ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>
                        {isOutOfStock ? 'Out of Stock' : `In Stock: ${product.stock}`}
                      </div>
                    </div>
                    <button 
                      className={isOutOfStock ? "btn btn-secondary" : "btn btn-primary"} 
                      style={{ width: '100%', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }} 
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add Item'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* 3. SHOPPING CART */}
        {view === 'cart' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Current Cart - {activeCustomer?.name}</h2>
              <button className="btn btn-secondary" onClick={() => setView('list')}>
                ← Back to Products
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
                      <td>{item.name} <span style={{fontSize:'0.8rem', color:'#64748b'}}>(Max: {item.stock})</span></td>
                      <td>{item.price} rs</td>
                      <td>
                        <input
                          type="number" className="quantity-input" min="1" max={item.stock} value={item.quantity}
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
                  )) : <tr><td colSpan={5} className="empty-state">Cart is empty.</td></tr>}
                </tbody>
              </table>
            </div>
            
            <div className="cart-summary">
              <h3 className="grand-total">Total: <span className="price-text">{cartTotal} rs</span></h3>
              <button className="btn btn-success" onClick={submitCart}>
                Complete Sale ✓
              </button>
            </div>
          </div>
        )}

        {/* 4. SALES LIST */}
        {view === 'invoices' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Sales List</h2>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Customer Name</th>
                    <th>Total (rs)</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length ? invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>#{invoice.id}</td>
                      <td>{invoice.customerName}</td>
                      <td className="price-text">{invoice.totalAmount}</td>
                      <td>{new Date(invoice.orderDate).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-secondary" onClick={() => handleViewInvoiceDetails(invoice.id)}>View Details</button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="empty-state">No sales found.</td></tr>}
                </tbody>
              </table>
            </div>
            
            {/* Sales Details Modal */}
            {selectedInvoice && (
              <div className="card" style={{ marginTop: '2rem', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <h3 style={{ marginBottom: '1rem' }}>Sale #{selectedInvoice.id} Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div><strong>Customer:</strong> {selectedInvoice.customerName}</div>
                  <div><strong>Date:</strong> {new Date(selectedInvoice.orderDate).toLocaleString()}</div>
                  <div className="price-text" style={{ fontSize: '1.2rem' }}><strong>Total: {selectedInvoice.totalAmount} rs</strong></div>
                </div>
                <h4>Items Purchased</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
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
                <div style={{ marginTop: '1.5rem' }}>
                  <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">Close View</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. INVENTORY MANAGEMENT (NEW) */}
        {view === 'inventory' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Inventory</h2>
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
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <td>{index + 1}</td>
                      <td>{product.name}</td>
                      <td style={{ fontWeight: 'bold', fontSize: '1.1rem', color: product.stock > 10 ? '#10b981' : (product.stock > 0 ? '#f59e0b' : '#ef4444') }}>
                        {product.stock} {product.stock <= 0 && '(Out of Stock)'}
                      </td>
                      <td>
                        <button className="btn btn-warning" onClick={() => openInventoryModal(product)}>
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. MANAGE CUSTOMERS */}
        {view === 'customers-manage' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Customer Management</h2>
              <button className="btn btn-primary" onClick={() => {
                setIsCustomerEditMode(false)
                setCustomerForm({ name: '', gstno: '', mobile: '', city: '' })
                setShowCustomerModal(true)
              }}>
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
                  {customers.map((c, index) => (
                    <tr key={c.id}>
                      <td>{index + 1}</td>
                      <td>{c.name}</td>
                      <td>{c.gstno}</td>
                      <td>{c.mobile}</td>
                      <td>{c.city}</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-warning" onClick={() => {
                            setIsCustomerEditMode(true)
                            setEditingCustomerId(c.id)
                            setCustomerForm({ name: c.name, gstno: c.gstno || '', mobile: c.mobile || '', city: c.city || '' })
                            setShowCustomerModal(true)
                          }}>Edit</button>
                          <button className="btn btn-danger" onClick={() => handleDeleteCustomer(c.id, c.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. MANAGE PRODUCTS */}
        {view === 'products' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Product Details</h2>
              <button className="btn btn-primary" onClick={() => {
                setIsEditMode(false)
                setProductForm({ name: '', purchasePrice: '', price: '', stock: '' })
                setShowProductModal(true)
              }}>
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
                    <th>Price (rs)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id}>
                      <td>{index + 1}</td>
                      <td>{product.name}</td>
                      <td className="price-text" style={{color: '#f59e0b'}}>{product.purchasePrice || 0} rs</td>
                      <td className="price-text">{product.price} rs</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-warning" onClick={() => {
                            setIsEditMode(true)
                            setEditingProductId(product.id)
                            setProductForm({ 
                              name: product.name, 
                              purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                              price: product.price.toString()
                             })
                            setShowProductModal(true)
                          }}>Edit Details</button>
                          <button className="btn btn-danger" onClick={() => handleDeleteProduct(product.id, product.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* INVENTORY UPDATE MODAL */}
      {showInventoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0 }}>Update Inventory</h3>
            <p style={{ marginBottom: '1rem', color: '#64748b' }}>
              Updating stock for: <strong>{products.find(p => p.id === editingInventoryId)?.name}</strong>
            </p>
            <div>
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
      
      {/* PRODUCT MODAL (Name & Price) */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0 }}>{isEditMode ? 'Edit Product Details' : 'Add New Product'}</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Name:</label>
              <input 
                className="form-control"
                value={productForm.name} 
                onChange={e => setProductForm({ ...productForm, name: e.target.value })} 
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Purchase Price (rs):</label>
              <input 
                type="number" 
                className="form-control"
                value={productForm.purchasePrice} 
                onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} 
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Selling Price (rs):</label>
              <input 
                type="number" 
                className="form-control"
                value={productForm.price} 
                onChange={e => setProductForm({ ...productForm, price: e.target.value })} 
              />
            </div>
            {/* Only show Initial Stock when CREATING a new product */}
            {!isEditMode && (
              <div style={{ marginBottom: '1rem' }}>
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

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0 }}>{isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Customer Name:</label>
              <input
                type="text"
                className="form-control"
                value={customerForm.name}
                onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">GST No:</label>
              <input
                type="text"
                className="form-control"
                value={customerForm.gstno}
                onChange={e => setCustomerForm({ ...customerForm, gstno: e.target.value })}
                placeholder="Enter GST Number"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Mobile:</label>
              <input
                type="text"
                className="form-control"
                value={customerForm.mobile}
                onChange={e => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                placeholder="Enter Mobile Number"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
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