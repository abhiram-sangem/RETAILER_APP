import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { productService, invoiceService, customerService } from './services/api'

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'VESTS', price: 120 },
  { id: '2', name: 'BRIEF', price: 320 },
  { id: '3', name: 'SHIRT', price: 850 },
]

export default function App() {
  const [view, setView] = useState('customer')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])

  // Selected customer for the active shopping session
  const [activeCustomer, setActiveCustomer] = useState(null)

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [error, setError] = useState('')

  // Product Modal States
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', price: '' })

  // Customer Modal States
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerForm, setCustomerForm] = useState({ name: '' })

  // Invoice States
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
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

  // --- Cart Functions ---
  function addToCart(product) {
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) {
        return current.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
    window.alert(`${product.name} added to cart!`)
  }

  function updateQuantity(index, quantity) {
    if (quantity < 1) return
    setCart(current => current.map((item, idx) => idx === index ? { ...item, quantity } : item))
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
        setInvoiceMessage(`Invoice #${invoice.id} created for ${invoice.customerName} - Total: ${invoice.totalAmount}rs`)
        setCart([])
        setActiveCustomer(null)
        loadProducts()
      })
      .catch(() => window.alert('Failed to create invoice.'))
  }

  // --- Product Management Functions ---
  function handleSaveProduct() {
    const name = productForm.name.trim()
    const price = parseFloat(productForm.price)
    if (!name || !price || price <= 0) return window.alert('Invalid product details')

    if (isEditMode) {
      productService.updateProduct(editingProductId, name, price).then(() => {
        loadProducts()
        closeProductModal()
      })
    } else {
      productService.addProduct(name, price).then(() => {
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
    setProductForm({ name: '', price: '' })
  }

  // --- Customer Management Functions ---
  function handleSaveCustomer() {
    const name = customerForm.name.trim()
    if (!name) return window.alert('Name is required')

    if (isCustomerEditMode) {
      customerService.updateCustomer(editingCustomerId, name).then(() => {
        loadCustomers()
        closeCustomerModal()
      })
    } else {
      customerService.addCustomer(name).then(() => {
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
    setCustomerForm({ name: '' })
  }

  // --- Invoice Functions ---
  function handleViewInvoices() {
    invoiceService.getInvoices().then(data => {
      setInvoices(data || [])
      setView('invoices')
    })
  }

  function handleViewInvoiceDetails(invoiceId) {
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data)
      setSelectedInvoiceId(invoiceId)
    })
  }

  return (
    <div className="page-shell">
      <h1>Shopping Cart App</h1>
      {error && <div className="status-message">{error}</div>}

      <div className="nav-buttons">
        <button onClick={() => setView('customer')}>Start Billing</button>
        <button onClick={() => setView('customers-manage')}>Manage Customers</button>
        <button onClick={() => setView('products')}>Manage Products</button>
        {/* View Invoices button moved to the top navigation */}
        <button onClick={handleViewInvoices}>View Invoices</button>
        <button onClick={() => setView('cart')}>Cart ({cart.length})</button>
      </div>

      {/* 1. SELECT CUSTOMER TO SHOP */}
      {view === 'customer' && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <h2>Start Billing</h2>
          <div className="form-group" style={{ maxWidth: '300px', margin: '0 auto 1rem' }}>
            <label>Select a Customer:</label>
            <select 
              value={activeCustomer ? activeCustomer.id : ''} 
              onChange={e => {
                const cust = customers.find(c => c.id === Number(e.target.value))
                setActiveCustomer(cust || null)
              }}
              style={{ padding: '8px', width: '100%' }}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button 
            className="add-btn" 
            onClick={() => {
              if (!activeCustomer) {
                window.alert('Please select a customer from the dropdown.')
                return
              }
              setView('list')
            }}
          >
            Go to Products List
          </button>
          <p style={{ marginTop: '1rem' }}>
            <em> Go to "Manage Customers" to add new customers.</em>
          </p>
        </div>
      )}

      {/* 2. MANAGE CUSTOMERS TABLE */}
      {view === 'customers-manage' && (
        <>
          <h2>Customer Management</h2>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, index) => (
                  <tr key={c.id}>
                    <td>{index + 1}</td>
                    <td>{c.name}</td>
                    <td>
                      <button className="edit-btn" onClick={() => {
                        setIsCustomerEditMode(true)
                        setEditingCustomerId(c.id)
                        setCustomerForm({ name: c.name })
                        setShowCustomerModal(true)
                      }}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeleteCustomer(c.id, c.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <button onClick={() => {
              setIsCustomerEditMode(false)
              setCustomerForm({ name: '' })
              setShowCustomerModal(true)
            }} className="add-btn">
              Add New Customer
            </button>
          </div>
        </>
      )}

      {/* 3. SHOPPING LIST */}
      {view === 'list' && (
        <>
          <h2>Shopping List {activeCustomer ? `for ${activeCustomer.name}` : ''}</h2>
          <ul id="product-list">
            {products.map(product => (
              <li key={product.id}>
                <div>
                  <span className="product-name">{product.name}</span>
                  <span className="product-price">{product.price}rs</span>
                </div>
                <button className="add-to-cart-btn" onClick={() => addToCart(product)}>Add to Cart</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 4. PRODUCT MANAGEMENT */}
      {view === 'products' && (
        <>
          <h2>Product Management</h2>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Price (rs)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product.id}>
                    <td>{index + 1}</td>
                    <td>{product.name}</td>
                    <td>{product.price} rs</td>
                    <td>
                      <button className="edit-btn" onClick={() => {
                        setIsEditMode(true)
                        setEditingProductId(product.id)
                        setProductForm({ name: product.name, price: product.price.toString() })
                        setShowProductModal(true)
                      }}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeleteProduct(product.id, product.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="button-row">
            <button onClick={() => {
              setIsEditMode(false)
              setProductForm({ name: '', price: '' })
              setShowProductModal(true)
            }} className="add-btn">Add New Product</button>
            {/* View Invoices button removed from here */}
          </div>
        </>
      )}

      {/* 5. SHOPPING CART */}
      {view === 'cart' && (
        <>
          <h2>Shopping Cart</h2>
          <div className="table-panel">
            <table>
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
                    <td>{item.name}</td>
                    <td>{item.price}rs</td>
                    <td>
                      <input
                        type="number" className="quantity-input" min="1" value={item.quantity}
                        onChange={e => updateQuantity(idx, Number(e.target.value))}
                      />
                    </td>
                    <td>{item.price * item.quantity}rs</td>
                    <td><button className="remove-btn" onClick={() => removeCartItem(idx)}>Remove</button></td>
                  </tr>
                )) : <tr><td colSpan={5} className="empty-row">Cart is empty.</td></tr>}
              </tbody>
            </table>
          </div>
          <h3 id="cart-total">Total: {cartTotal}rs</h3>
          <div className="cart-actions">
            <button onClick={submitCart}>Submit Order</button>
          </div>
          {invoiceMessage && <p className="invoice-details">{invoiceMessage}</p>}
        </>
      )}

      {/* 6. INVOICES */}
      {view === 'invoices' && (
        <>
          <h2>Invoices</h2>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer Name</th>
                  <th>Total (rs)</th>
                  <th>Order Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length ? invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>#{invoice.id}</td>
                    <td>{invoice.customerName}</td>
                    <td>{invoice.totalAmount}</td>
                    <td>{new Date(invoice.orderDate).toLocaleString()}</td>
                    <td><button className="view-btn" onClick={() => handleViewInvoiceDetails(invoice.id)}>View Details</button></td>
                  </tr>
                )) : <tr><td colSpan={5} className="empty-row">No invoices found.</td></tr>}
              </tbody>
            </table>
          </div>
          
          {selectedInvoice && (
            <div className="invoice-details-panel">
              <h3>Invoice #${selectedInvoice.id} Details</h3>
              <p><strong>Customer:</strong> {selectedInvoice.customerName}</p>
              <p><strong>Date:</strong> {new Date(selectedInvoice.orderDate).toLocaleString()}</p>
              <p><strong>Total:</strong> {selectedInvoice.totalAmount} rs</p>
              <h4>Items</h4>
              <table>
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
              <button onClick={() => setSelectedInvoice(null)} className="close-btn">Close</button>
            </div>
          )}
        </>
      )}

      {/* PRODUCT MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{isEditMode ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="form-group">
              <label>Name:</label>
              <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Price (rs):</label>
              <input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveProduct} className="save-btn">Save</button>
              <button onClick={closeProductModal} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}</h3>
            <div className="form-group">
              <label>Customer Name:</label>
              <input 
                type="text" 
                value={customerForm.name} 
                onChange={e => setCustomerForm({ name: e.target.value })} 
                placeholder="Enter customer name"
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveCustomer} className="save-btn">Save</button>
              <button onClick={closeCustomerModal} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}