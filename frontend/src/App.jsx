import { useEffect, useMemo, useState } from 'react'
import Login from './Login.jsx'
import './App.css'
import { productService, invoiceService } from './services/api'

// Default fallback products used when the backend API is unavailable.
const DEFAULT_PRODUCTS = [
  { id: '1', name: 'VESTS', price: 120 },
  { id: '2', name: 'BRIEF', price: 320 },
  { id: '3', name: 'SHIRT', price: 850 },
]

export default function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('isAuthenticated')
    return auth === 'true'
  })
  // Current page view state: list, products, cart, invoices, or add/edit product.
  const [view, setView] = useState('list')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])

  // Load cart from localStorage on initial render.
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })
  const [invoiceMessage, setInvoiceMessage] = useState('')
  const [error, setError] = useState('')

  // Modal states for add/edit product
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', price: '' })
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setView('login')
    } 
    
  }, [isAuthenticated])

  // Fetch products once when component mounts.
  useEffect(() => {
    loadProducts()
  }, [])

  // Persist cart to localStorage whenever it changes.
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  // Compute cart total price efficiently with memoization.
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  // Handle successful login by updating authentication state and view.
  function handleLoginSuccess() {
    setIsAuthenticated(true)
  }

  function handleLogout() {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
    setIsAuthenticated(false)
    setView('list')
  }
  // Load product list from backend; fallback to sample data on failure.
  function loadProducts() {
    productService.getProducts()
      .then(data => setProducts(Array.isArray(data) ? data : DEFAULT_PRODUCTS))
      .catch(() => {
        setError('Unable to load products from backend. Showing sample product list.')
        setProducts(DEFAULT_PRODUCTS)
      })
  }

  // Add a product to cart or increase its quantity if already present.
  function addToCart(product) {
    setCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) {
        return current.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
    window.alert(`${product.name} added to cart!`)
  }

  // Update quantity for a specific cart item by index.
  function updateQuantity(index, quantity) {
    if (quantity < 1) return
    setCart(current =>
      current.map((item, idx) =>
        idx === index ? { ...item, quantity } : item,
      ),
    )
  }

  // Remove an item from the cart by its index.
  function removeCartItem(index) {
    setCart(current => current.filter((_, idx) => idx !== index))
  }

  function handleSaveProduct() {
    if (!productForm.name.trim() || !productForm.price) {
      window.alert('Please fill in all fields')
      return
    }

    const name = productForm.name.trim()
    const price = parseFloat(productForm.price)

    if (price <= 0) {
      window.alert('Price must be greater than 0')
      return
    }

    if (isEditMode && editingProductId) {
      // Update existing product
      productService.updateProduct(editingProductId, name, price)
        .then(() => {
          setProducts(current =>
            current.map(p =>
              p.id === editingProductId ? { ...p, name, price } : p
            )
          )
          setShowProductModal(false)
          setProductForm({ name: '', price: '' })
          setIsEditMode(false)
          setEditingProductId(null)
          window.alert('Product updated successfully!')
        })
        .catch(err => {
          window.alert('Failed to update product: ' + err.message)
        })
    } else {
      // Add new product
      productService.addProduct(name, price)
        .then(newProduct => {
          setProducts(current => [...current, newProduct])
          setShowProductModal(false)
          setProductForm({ name: '', price: '' })
          window.alert('Product added successfully!')
        })
        .catch(err => {
          window.alert('Failed to add product: ' + err.message)
        })
    }
  }

  // Delete product handler
  function handleDeleteProduct(productId, productName) {
    const confirmed = window.confirm(`Are you sure you want to delete "${productName}"?`)
    if (!confirmed) return

    productService.deleteProduct(productId)
      .then(() => {
        setProducts(current => current.filter(p => p.id !== productId))
        window.alert('Product deleted successfully!')
      })
      .catch(err => {
        window.alert('Failed to delete product: ' + err.message)
      })
  }

  // Open add product modal
  function openAddProductModal() {
    setIsEditMode(false)
    setEditingProductId(null)
    setProductForm({ name: '', price: '' })
    setShowProductModal(true)
  }

  // Open edit product modal
  function openEditProductModal(product) {
    setIsEditMode(true)
    setEditingProductId(product.id)
    setProductForm({ name: product.name, price: product.price.toString() })
    setShowProductModal(true)
  }

  // Close product modal
  function closeProductModal() {
    setShowProductModal(false)
    setProductForm({ name: '', price: '' })
    setIsEditMode(false)
    setEditingProductId(null)
  }

  // Load and display invoices
  function handleViewInvoices() {
    invoiceService.getInvoices()
      .then(data => {
        setInvoices(Array.isArray(data) ? data : [])
        setSelectedInvoiceId(null)
        setSelectedInvoice(null)
        setView('invoices')
      })
      .catch(err => {
        window.alert('Failed to load invoices: ' + err.message)
      })
  }

  // View invoice details
  function handleViewInvoiceDetails(invoiceId) {
    invoiceService.getInvoiceById(invoiceId)
      .then(data => {
        setSelectedInvoice(data)
        setSelectedInvoiceId(invoiceId)
      })
      .catch(err => {
        window.alert('Failed to load invoice details: ' + err.message)
      })
  }

  // Submit the shopping cart and create an invoice using backend API.
  function submitCart() {
    if (!cart.length) {
      window.alert('Cart is empty. Please add items before submitting.')
      return
    }

    const customerName = window.prompt('Please enter your name for the invoice:')
    if (!customerName || !customerName.trim()) {
      window.alert('Customer name is required.')
      return
    }

    invoiceService.create(customerName.trim(), cart)
      .then(invoice => {
        setInvoiceMessage(
          `Invoice #${invoice.id} created for ${invoice.customerName} - Total: ${invoice.totalAmount}rs`,
        )
        setCart([])
        // Refresh products after creating invoice
        loadProducts()
      })
      .catch(() => {
        window.alert('Failed to create invoice. Please try again.')
      })
  }

  // Build the rows for the products table view.
  const productTableRows = products.map((product, index) => (
    <tr key={product.id}>
      <td>{index + 1}</td>
      <td>{product.name}</td>
      <td>{product.price} rs</td>
      <td>
        <button className="edit-btn" onClick={() => openEditProductModal(product)}>
          Edit
        </button>
        <button className="delete-btn" onClick={() => handleDeleteProduct(product.id, product.name)}>
          Delete
        </button>
      </td>
    </tr>
  ))

  return (
    <div className="page-shell">
      <h1>Shopping Cart App</h1>
      {error && <div className="status-message">{error}</div>}

      <div className="nav-buttons">
        <button onClick={() => setView('products')}>Manage Products</button>
        <button onClick={() => setView('list')}>Shopping List</button>
        <button onClick={() => setView('cart')}>Shopping Cart</button>
      </div>

      {view === 'list' && (
        <>
          <h2>List of products</h2>
          <ul id="product-list">
            {products.map(product => (
              <li key={product.id}>
                <div>
                  <span className="product-name">{product.name}</span>
                  <span className="product-price">{product.price}rs</span>
                </div>
                <button className="add-to-cart-btn" onClick={() => addToCart(product)}>
                  Add to Cart
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

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
              <tbody>{productTableRows}</tbody>
            </table>
          </div>
          <div className="button-row">
            <button onClick={openAddProductModal} className="add-btn">
              Add New Product
            </button>
            <button onClick={handleViewInvoices} className="view-btn">
              View Invoices
            </button>
            <button onClick={() => setView('list')} className="back-btn">
              Start Shopping
            </button>
          </div>
        </>
      )}

      {view === 'cart' && (
        <>
          <h2>Shopping Cart</h2>
          <button className="back-button" onClick={() => setView('list')}>
            Back to Product List
          </button>
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
                {cart.length ? (
                  cart.map((item, idx) => (
                    <tr key={`${item.id}-${idx}`}>
                      <td>{item.name}</td>
                      <td>{item.price}rs</td>
                      <td>
                        <input
                          type="number"
                          className="quantity-input"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateQuantity(idx, Number(e.target.value))}
                        />
                      </td>
                      <td>{item.price * item.quantity}rs</td>
                      <td>
                        <button className="remove-btn" onClick={() => removeCartItem(idx)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Your cart is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <h3 id="cart-total">Total: {cartTotal}rs</h3>
          <div className="cart-actions">
            <button onClick={submitCart}>Submit</button>
          </div>
          {invoiceMessage && <p className="invoice-details">{invoiceMessage}</p>}
        </>
      )}

      {view === 'invoices' && (
        <>
          <h2>Invoices</h2>
          <button className="back-button" onClick={() => setView('products')}>
            Back to Product Management
          </button>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer Name</th>
                  <th>Total Amount (rs)</th>
                  <th>Order Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length ? (
                  invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>#{invoice.id}</td>
                      <td>{invoice.customerName}</td>
                      <td>{invoice.totalAmount}</td>
                      <td>{new Date(invoice.orderDate).toLocaleString()}</td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => handleViewInvoiceDetails(invoice.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedInvoice && (
            <div className="invoice-details-panel">
              <h3>Invoice #${selectedInvoice.id} Details</h3>
              <div className="invoice-info">
                <p><strong>Customer Name:</strong> {selectedInvoice.customerName}</p>
                <p><strong>Order Date:</strong> {new Date(selectedInvoice.orderDate).toLocaleString()}</p>
                <p><strong>Total Amount:</strong> {selectedInvoice.totalAmount} rs</p>
              </div>
              <h4>Items</h4>
              <div className="invoice-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.length ? (
                      selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.product.name}</td>
                          <td>{item.price}</td>
                          <td>{item.quantity}</td>
                          <td>{item.price * item.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-row">
                          No items in this invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="close-btn">
                Close Details
              </button>
            </div>
          )}
        </>
      )}

      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{isEditMode ? 'Edit Product' : 'Add New Product'}</h3>
            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="productName">Product Name:</label>
                <input
                  type="text"
                  id="productName"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="productPrice">Price (rs):</label>
                <input
                  type="number"
                  id="productPrice"
                  value={productForm.price}
                  onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="Enter price"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveProduct} className="save-btn">
                {isEditMode ? 'Update Product' : 'Add Product'}
              </button>
              <button onClick={closeProductModal} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
