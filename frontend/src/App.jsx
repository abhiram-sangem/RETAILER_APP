import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { 
  productService, 
  invoiceService, 
  customerService, 
  purchaseInvoiceService 
} from './services/api'

export default function App() {
  // =========================================
  // --- Portable Dynamic ID Helper Functions ---
  // =========================================
  const formatProductId = (id) => id ? `PR${String(id).padStart(4, '0')}` : 'N/A'
  const formatInvoiceId = (id) => id ? `INV-${String(id).padStart(4, '0')}` : 'N/A'

  // =========================================
  // --- Auth / Login States ---
  // =========================================
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // =========================================
  // --- View & Core Data States ---
  // =========================================
  const [view, setView] = useState('home')
  const [products, setProducts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [purchaseInvoices, setPurchaseInvoices] = useState([])
  const [customers, setCustomers] = useState([])

  // =========================================
  // --- Navigation Toggle States ---
  // =========================================
  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(false)
  const [isPurchaseMenuOpen, setIsPurchaseMenuOpen] = useState(false)

  // =========================================
  // --- Search & Pagination States ---
  // =========================================
  const [searchQuery, setSearchQuery] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSellerDropdownOpen, setIsSellerDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // =========================================
  // --- Sales Cart & Billing States ---
  // =========================================
  const [activeCustomer, setActiveCustomer] = useState(null)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(5)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  
  // Checkout Payment Screen States
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })

  // =========================================
  // --- Purchase Cart & Billing States ---
  // =========================================
  const [purchaseSellerName, setPurchaseSellerName] = useState('')
  const [customInvoiceId, setCustomInvoiceId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [purchaseDiscountPercent, setPurchaseDiscountPercent] = useState(0)
  const [purchaseTaxPercent, setPurchaseTaxPercent] = useState(5)
  const [showAddPurchaseProductModal, setShowAddPurchaseProductModal] = useState(false)
  
  const [purchaseCart, setPurchaseCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('purchaseCart')) || []
    } catch {
      return []
    }
  })
  const [error, setError] = useState('')

  // =========================================
  // --- Modal Visibility & Form States ---
  // =========================================
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ 
    name: '', 
    hsnCode: '',
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
  const [selectedPurchaseInvoice, setSelectedPurchaseInvoice] = useState(null)

  // =========================================
  // --- Dashboard Card Expansion States ---
  // =========================================
  const [expandedStats, setExpandedStats] = useState({
    daily: false,
    weekly: false,
    monthly: false,
    yearly: false
  })

  // =========================================
  // --- Lifecycle Effects / Synchronization ---
  // =========================================
  useEffect(() => {
    loadProducts()
    loadCustomers()
    loadInvoices()
    loadPurchaseInvoices()
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('purchaseCart', JSON.stringify(purchaseCart))
  }, [purchaseCart])

  useEffect(() => {
    setSearchQuery('')
    setCurrentPage(1)
  }, [view])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, itemsPerPage])

  // =========================================
  // --- Login Handler ---
  // =========================================
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '12345') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  // =========================================
  // --- Core Calculation Engines (useMemo) ---
  // =========================================
  const salesStats = useMemo(() => {
    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};
    const yearlyMap = {};

    invoices.forEach(inv => {
      const d = new Date(inv.orderDate);
      const total = inv.finalTotal || inv.totalAmount || 0;
      const daySortKey = d.toISOString().split('T')[0];
      const dayDisplay = d.toLocaleDateString('en-GB');

      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const weekSortKey = startOfWeek.toISOString().split('T')[0];
      const weekDisplay = `Week of ${startOfWeek.toLocaleDateString('en-GB')}`;

      const monthSortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthDisplay = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
      const yearKey = d.getFullYear().toString();

      if (!dailyMap[daySortKey]) dailyMap[daySortKey] = { label: dayDisplay, total: 0 };
      dailyMap[daySortKey].total += total;

      if (!weeklyMap[weekSortKey]) weeklyMap[weekSortKey] = { label: weekDisplay, total: 0 };
      weeklyMap[weekSortKey].total += total;

      if (!monthlyMap[monthSortKey]) monthlyMap[monthSortKey] = { label: monthDisplay, total: 0 };
      monthlyMap[monthSortKey].total += total;

      if (!yearlyMap[yearKey]) yearlyMap[yearKey] = { label: yearKey, total: 0 };
      yearlyMap[yearKey].total += total;
    });

    const toSortedArray = (map) => Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(entry => entry[1]);

    return {
      daily: toSortedArray(dailyMap),
      weekly: toSortedArray(weeklyMap),
      monthly: toSortedArray(monthlyMap),
      yearly: toSortedArray(yearlyMap),
    };
  }, [invoices]);

  const billingDetails = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const discountAmount = subtotal * (discountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    
    const cgstPercent = taxPercent / 2
    const sgstPercent = taxPercent / 2
    
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    
    return { subtotal, discountAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal }
  }, [cart, discountPercent, taxPercent])

  const purchaseBillingDetails = useMemo(() => {
    const subtotal = purchaseCart.reduce((sum, item) => sum + (item.purchasePrice || 0) * item.quantity, 0)
    const discountAmount = subtotal * (purchaseDiscountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    
    const cgstPercent = purchaseTaxPercent / 2
    const sgstPercent = purchaseTaxPercent / 2
    
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    
    return { subtotal, discountAmount, cgstPercent, sgstPercent, cgst, sgst, roundoff, finalTotal }
  }, [purchaseCart, purchaseDiscountPercent, purchaseTaxPercent])

  // --- Automatic Math For Historical Invoices ---
  const selectedInvoiceMath = useMemo(() => {
    if (!selectedInvoice) return null;
    const subtotal = selectedInvoice.grossTotal || selectedInvoice.totalAmount || 0;
    const discountPercent = selectedInvoice.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = selectedInvoice.cgst || 0;
    const sgst = selectedInvoice.sgst || 0;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = selectedInvoice.finalTotal || selectedInvoice.totalAmount || 0;
    const roundoff = finalTotal - exactTotal;
    
    const cgstPercent = taxableAmount > 0 ? (cgst / taxableAmount) * 100 : 0;
    const sgstPercent = taxableAmount > 0 ? (sgst / taxableAmount) * 100 : 0;
    const totalTaxPercent = cgstPercent + sgstPercent;

    return { subtotal, discountPercent, discountAmount, cgst, sgst, exactTotal, finalTotal, roundoff, cgstPercent, sgstPercent, totalTaxPercent };
  }, [selectedInvoice]);

  const selectedPurchaseInvoiceMath = useMemo(() => {
    if (!selectedPurchaseInvoice) return null;
    const subtotal = selectedPurchaseInvoice.grossTotal || 0;
    const discountPercent = selectedPurchaseInvoice.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const cgst = selectedPurchaseInvoice.cgst || 0;
    const sgst = selectedPurchaseInvoice.sgst || 0;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = selectedPurchaseInvoice.finalTotal || 0;
    const roundoff = finalTotal - exactTotal;
    
    const cgstPercent = taxableAmount > 0 ? (cgst / taxableAmount) * 100 : 0;
    const sgstPercent = taxableAmount > 0 ? (sgst / taxableAmount) * 100 : 0;
    const totalTaxPercent = cgstPercent + sgstPercent;

    return { subtotal, discountPercent, discountAmount, cgst, sgst, exactTotal, finalTotal, roundoff, cgstPercent, sgstPercent, totalTaxPercent };
  }, [selectedPurchaseInvoice]);

  // --- Auto-Extract Pre-Existing Sellers from History ---
  const preExistingSellers = useMemo(() => {
    const names = purchaseInvoices.map(inv => inv.sellerName).filter(Boolean);
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length === 0) {
      return ['Wholesale Market', 'Direct Distributor', 'Local Supplier'];
    }
    return uniqueNames;
  }, [purchaseInvoices]);

  // =========================================
  // --- Real-time Search Filter Pipelines ---
  // =========================================
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.hsnCode && p.hsnCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
    formatProductId(p.id).toLowerCase().includes(searchQuery.toLowerCase())
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

  const dropdownFilteredSellers = preExistingSellers.filter(s => 
    s.toLowerCase().includes(purchaseSellerName.toLowerCase())
  )

  const filteredInvoices = invoices.filter(i =>
    i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    formatInvoiceId(i.id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPurchaseInvoices = purchaseInvoices.filter(i =>
    i.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.id.toString().includes(searchQuery) ||
    (i.customInvoiceId && i.customInvoiceId.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // =========================================
  // --- Micro-Pagination Logic Controllers ---
  // =========================================
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const paginatedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedPurchaseInvoices = filteredPurchaseInvoices.slice(indexOfFirstItem, indexOfLastItem)

  // =========================================
  // --- Network API Interaction Loaders ---
  // =========================================
  function loadProducts() {
    productService.getProducts().then(data => 
      setProducts(Array.isArray(data) ? data : [])
    )
  }

  function loadCustomers() {
    customerService.getCustomers().then(data => 
      setCustomers(Array.isArray(data) ? data : [])
    )
  }

  function loadInvoices() {
    invoiceService.getInvoices().then(data => {
      setInvoices((data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)))
    })
  }

  function loadPurchaseInvoices() {
    purchaseInvoiceService.getPurchaseInvoices().then(data => {
      setPurchaseInvoices((data || []).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)))
    })
  }

  // =========================================
  // --- Outbound Sales Process Handlers ---
  // =========================================
  function addToCart(product) {
    if (product.stock <= 0) return window.alert(`Sorry, ${product.name} is currently out of stock!`)
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

  function proceedToPayment() {
    if (!cart.length) return window.alert('Cart is empty.')
    if (!activeCustomer) return window.alert('Please select a customer from the top dropdown before proceeding to payment.')
    setView('payment-screen')
  }

  function submitFinalSale() {
    invoiceService.create(
      activeCustomer.name,
      cart,
      billingDetails.subtotal, 
      discountPercent,
      billingDetails.cgst,
      billingDetails.sgst,
      billingDetails.finalTotal,
      paymentMethod,
      saleDate
    ).then(invoice => {
      window.alert(`Sale ${formatInvoiceId(invoice.id)} completed successfully!`)
      setCart([])
      setActiveCustomer(null)
      setCustomerSearch('')
      setDiscountPercent(0)
      setTaxPercent(5)
      setPaymentMethod('Cash')
      setSaleDate(new Date().toISOString().split('T')[0])
      setView('invoices')
      loadProducts()
      loadInvoices()
    }).catch(err => window.alert('Failed to complete sale. ' + err.message))
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale?")) {
      setCart([])
      setActiveCustomer(null)
      setCustomerSearch('')
      setDiscountPercent(0)
      setTaxPercent(5)
      setView('list')
    }
  }

  function handleViewInvoiceDetails(invoiceId) { 
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data)
      setView('invoice-details')
    }) 
  }

  // =========================================
  // --- Inbound Vendor Purchase Handlers ---
  // =========================================
  function addToPurchaseCart(product) {
    setPurchaseCart(current => {
      const existing = current.find(item => item.id === product.id)
      if (existing) {
        return current.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      }
      return [...current, { ...product, quantity: 1, purchasePrice: product.purchasePrice || 0 }]
    })
  }

  function updatePurchaseQuantity(index, quantity) {
    if (quantity < 1) return
    setPurchaseCart(current => 
      current.map((itm, idx) => 
        idx === index 
          ? { ...itm, quantity } 
          : itm
      )
    )
  }

  function updatePurchasePrice(index, price) {
    if (price < 0) return
    setPurchaseCart(current => 
      current.map((itm, idx) => 
        idx === index 
          ? { ...itm, purchasePrice: price } 
          : itm
      )
    )
  }

  function removePurchaseCartItem(index) {
    setPurchaseCart(current => 
      current.filter((_, idx) => idx !== index)
    )
  }

  function submitPurchaseCart() {
    if (!purchaseCart.length) return window.alert('Purchase cart is empty.')
    if (!purchaseSellerName.trim()) return window.alert('Please enter or select a Seller Name.')
    if (!customInvoiceId.trim()) return window.alert('Please enter the Purchase Invoice ID given by the seller.')
    if (!purchaseDate) return window.alert('Please select the Date of Purchase.')
    
    purchaseInvoiceService.create(
      purchaseSellerName,
      purchaseDate,
      customInvoiceId,
      purchaseCart,
      purchaseBillingDetails.subtotal, 
      purchaseDiscountPercent,
      purchaseBillingDetails.cgst,
      purchaseBillingDetails.sgst,
      purchaseBillingDetails.finalTotal
    ).then(invoice => {
      window.alert(`Purchase Invoice recorded successfully! Stock has been updated.`)
      setPurchaseCart([])
      setPurchaseSellerName('')
      setCustomInvoiceId('')
      setPurchaseDate(new Date().toISOString().split('T')[0])
      setPurchaseDiscountPercent(0)
      setPurchaseTaxPercent(5)
      setView('purchases-list')
      loadProducts()
      loadPurchaseInvoices()
    }).catch(err => window.alert('Failed to complete purchase. ' + err.message))
  }

  function cancelPurchase() {
    if (window.confirm("Are you sure you want to cancel the current purchase entry?")) {
      setPurchaseCart([])
      setPurchaseSellerName('')
      setCustomInvoiceId('')
      setPurchaseDiscountPercent(0)
      setPurchaseTaxPercent(5)
      setView('purchase-new')
    }
  }

  function handleViewPurchaseInvoiceDetails(invoiceId) {
    purchaseInvoiceService.getPurchaseInvoiceById(invoiceId).then(data => {
      setSelectedPurchaseInvoice(data)
      setView('purchase-invoice-details')
    })
  }

  // =========================================
  // --- System Master CRUD Operations ---
  // =========================================
  function handleSaveProduct() {
    const name = productForm.name.trim()
    const hsnCode = productForm.hsnCode.trim()
    const purchasePrice = parseFloat(productForm.purchasePrice)
    const price = parseFloat(productForm.price)
    if (!name || isNaN(purchasePrice) || isNaN(price) || purchasePrice < 0 || price <= 0) return window.alert('Invalid details.')
    
    if (isEditMode) {
      const existingProduct = products.find(p => p.id === editingProductId)
      productService.updateProduct(
        editingProductId, 
        name, 
        purchasePrice, 
        price, 
        existingProduct ? existingProduct.stock : 0,
        hsnCode
      ).then(() => { 
        loadProducts()
        closeProductModal() 
      })
    } else {
      productService.addProduct(
        name, 
        purchasePrice, 
        price, 
        parseInt(productForm.stock, 10) || 0,
        hsnCode
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
    setProductForm({ name: '', hsnCode: '', purchasePrice: '', price: '', stock: '' })
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
    if (isNaN(newStock) || newStock < 0) return window.alert('Stock must be 0 or greater.')
    
    const product = products.find(p => p.id === editingInventoryId)
    productService.updateProduct(
      product.id, 
      product.name, 
      product.purchasePrice, 
      product.price, 
      newStock,
      product.hsnCode
    ).then(() => { 
      loadProducts()
      closeInventoryModal() 
    })
  }

  function handleSaveCustomer() {
    const { name, gstno, mobile, city } = customerForm
    if (!name?.trim()) return window.alert('Name is required')
    
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

  // =========================================
  // --- Control Render Elements ---
  // =========================================
  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
    return (
      <div className="pagination-wrapper">
        <div>
          <label className="fw-bold">Rows per page:</label>
          <select
            className="form-control mb-0 pagination-select"
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

  // =========================================
  // --- Security Auth Gate ---
  // =========================================
  if (!isLoggedIn) {
    return (
      <div className="modal-overlay login-overlay">
        <form onSubmit={handleLogin} className="card login-card">
          <h2 className="modal-header-title text-center">Retailer Login</h2>
          {loginError && <div className="text-danger mb-0 text-center">{loginError}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-checkout">
            Login to Dashboard
          </button>
        </form>
      </div>
    );
  }

  // =========================================
  // --- Main Core Grid Layout Render ---
  // =========================================
  return (
    <div className="app-layout">
      {/* SIDEBAR NAVIGATION MODULE */}
      <aside className="sidebar flex-sidebar">
        <div className="sidebar-header">Retailer App</div>
        <div className="menu-group">
          <button 
            className={`menu-btn ${view === 'home' ? 'active' : ''}`} 
            onClick={() => setView('home')}
          >
            Home
          </button>
          
          <button 
            className="menu-btn" 
            onClick={() => setIsSalesMenuOpen(!isSalesMenuOpen)}
          >
            <span>Sales</span>
            <span className="arrow-indicator">{isSalesMenuOpen ? '▼' : '▶'}</span>
          </button>
          
          {isSalesMenuOpen && (
            <div>
              <button 
                className={`submenu-btn ${['list', 'payment-screen'].includes(view) ? 'active' : ''}`} 
                onClick={() => setView('list')}
              >
                New Sales
              </button>
              <button 
                className={`submenu-btn ${['invoices', 'invoice-details'].includes(view) ? 'active' : ''}`} 
                onClick={() => setView('invoices')}
              >
                Sales List
              </button>
            </div>
          )}
          
          <button 
            className="menu-btn" 
            onClick={() => setIsPurchaseMenuOpen(!isPurchaseMenuOpen)}
          >
            <span>Purchases</span>
            <span className="arrow-indicator">{isPurchaseMenuOpen ? '▼' : '▶'}</span>
          </button>
          
          {isPurchaseMenuOpen && (
            <div>
              <button 
                className={`submenu-btn ${view === 'purchase-new' ? 'active' : ''}`} 
                onClick={() => setView('purchase-new')}
              >
                Add Purchase Invoice
              </button>
              <button 
                className={`submenu-btn ${['purchases-list', 'purchase-invoice-details'].includes(view) ? 'active' : ''}`} 
                onClick={() => setView('purchases-list')}
              >
                Purchase History
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
        
        <div className="sidebar-footer">
          <button 
            className="btn btn-danger w-100" 
            onClick={() => { 
              setIsLoggedIn(false); 
              setUsername(''); 
              setPassword(''); 
              setView('home'); 
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* CENTRAL APP VIEWSPACE CONTAINER */}
      <main className="main-content">
        {error && <div className="text-danger mb-0">{error}</div>}

        {/* --- DYNAMIC TARGET: HOME SALES REGISTERS OVERVIEW --- */}
        {view === 'home' && (
          <div>
            <h2 className="card-title">Sales Overview</h2>
            <div className="dashboard-stats-grid">
              <div className="card stat-card daily-card">
                <h4>Daily Sales</h4>
                <table className="summary-table">
                  <tbody>
                    {salesStats.daily.length === 0 ? (
                      <tr><td className="text-dark-muted">No records</td></tr>
                    ) : (
                      (expandedStats.daily ? salesStats.daily : salesStats.daily.slice(0, 5)).map((item, i) => (
                        <tr key={i}>
                          <td>{item.label}</td>
                          <td className="text-success text-right">{item.total.toFixed(2)} rs</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {salesStats.daily.length > 5 && (
                  <button 
                    className="btn btn-secondary w-100" 
                    onClick={() => setExpandedStats(p => ({ ...p, daily: !p.daily }))}
                  >
                    {expandedStats.daily ? 'View Less' : 'View More Past Days'}
                  </button>
                )}
              </div>

              <div className="card stat-card weekly-card">
                <h4>Weekly Sales</h4>
                <table className="summary-table">
                  <tbody>
                    {salesStats.weekly.length === 0 ? (
                      <tr><td className="text-dark-muted">No records</td></tr>
                    ) : (
                      (expandedStats.weekly ? salesStats.weekly : salesStats.weekly.slice(0, 5)).map((item, i) => (
                        <tr key={i}>
                          <td>{item.label}</td>
                          <td className="text-primary text-right">{item.total.toFixed(2)} rs</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {salesStats.weekly.length > 5 && (
                  <button 
                    className="btn btn-secondary w-100" 
                    onClick={() => setExpandedStats(p => ({ ...p, weekly: !p.weekly }))}
                  >
                    {expandedStats.weekly ? 'View Less' : 'View More Past Weeks'}
                  </button>
                )}
              </div>

              <div className="card stat-card monthly-card">
                <h4>Monthly Sales</h4>
                <table className="summary-table">
                  <tbody>
                    {salesStats.monthly.length === 0 ? (
                      <tr><td className="text-dark-muted">No records</td></tr>
                    ) : (
                      (expandedStats.monthly ? salesStats.monthly : salesStats.monthly.slice(0, 5)).map((item, i) => (
                        <tr key={i}>
                          <td>{item.label}</td>
                          <td className="text-purple text-right">{item.total.toFixed(2)} rs</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {salesStats.monthly.length > 5 && (
                  <button 
                    className="btn btn-secondary w-100" 
                    onClick={() => setExpandedStats(p => ({ ...p, monthly: !p.monthly }))}
                  >
                    {expandedStats.monthly ? 'View Less' : 'View More Past Months'}
                  </button>
                )}
              </div>

              <div className="card stat-card yearly-card">
                <h4>Yearly Sales</h4>
                <table className="summary-table">
                  <tbody>
                    {salesStats.yearly.length === 0 ? (
                      <tr><td className="text-dark-muted">No records</td></tr>
                    ) : (
                      (expandedStats.yearly ? salesStats.yearly : salesStats.yearly.slice(0, 5)).map((item, i) => (
                        <tr key={i}>
                          <td>{item.label}</td>
                          <td className="text-amber text-right">{item.total.toFixed(2)} rs</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {salesStats.yearly.length > 5 && (
                  <button 
                    className="btn btn-secondary w-100" 
                    onClick={() => setExpandedStats(p => ({ ...p, yearly: !p.yearly }))}
                  >
                    {expandedStats.yearly ? 'View Less' : 'View More Past Years'}
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Transactions</h3>
                <button className="btn btn-primary" onClick={() => setView('invoices')}>
                  View All Sales
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Customer Name</th>
                      <th>Amount (rs)</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 5).map(inv => (
                      <tr key={inv.id}>
                        <td className="fw-bold">{formatInvoiceId(inv.id)}</td>
                        <td>{inv.customerName}</td>
                        <td className="price-text">{inv.finalTotal || inv.totalAmount}</td>
                        <td>{new Date(inv.orderDate).toLocaleString()}</td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr><td colSpan="4" className="empty-state">No recent sales found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: MERGED INBOUND PURCHASES --- */}
        {view === 'purchase-new' && (
          <div>
            <div className="sales-control-panel">
              <div className="sales-control-row">
                <div className="input-group customer-dropdown-group">
                  <label>Select or Enter Seller</label>
                  <div className="dropdown-container">
                    <input
                      type="text"
                      className={`form-control mb-0 ${!purchaseSellerName ? 'customer-input-warning' : ''}`}
                      placeholder="Search or enter seller..."
                      value={purchaseSellerName}
                      onFocus={() => setIsSellerDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsSellerDropdownOpen(false), 200)}
                      onChange={e => {
                        setPurchaseSellerName(e.target.value)
                        setIsSellerDropdownOpen(true)
                      }}
                    />
                    {isSellerDropdownOpen && (
                      <ul className="dropdown-menu">
                        {dropdownFilteredSellers.length > 0 ? dropdownFilteredSellers.map((seller, idx) => (
                          <li
                            key={idx}
                            className="dropdown-item"
                            onMouseDown={() => {
                              setPurchaseSellerName(seller)
                              setIsSellerDropdownOpen(false)
                            }}
                          >
                            {seller}
                          </li>
                        )) : (
                          <li className="dropdown-empty">Press enter to use new seller</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="action-buttons-right">
                  <button className="btn btn-danger" onClick={cancelPurchase}>
                    Cancel Purchase
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setSearchQuery('');
                      setShowAddPurchaseProductModal(true);
                    }}
                  >
                    + Add Products
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Purchase Cart - {purchaseSellerName ? purchaseSellerName : <span className="text-danger">No Seller Selected</span>}
                </h2>
              </div>
              
              <div className="invoice-summary-grid purchase-entry-grid" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
                <div className="form-group mb-0">
                  <label className="form-label">Purchase Invoice ID <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control mb-0"
                    placeholder="e.g. INV-12:A9"
                    value={customInvoiceId}
                    onChange={e => setCustomInvoiceId(e.target.value)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">Date of Purchase <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control mb-0"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Product</th>
                      <th>Buy Price (rs)</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseCart.length ? purchaseCart.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`}>
                        <td className="fw-bold">{idx + 1}</td>
                        <td>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control mb-0 price-box-width"
                            min="0"
                            step="0.01"
                            value={item.purchasePrice}
                            onChange={e => updatePurchasePrice(idx, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="quantity-input form-control mb-0"
                            min="1"
                            value={item.quantity}
                            onChange={e => updatePurchaseQuantity(idx, Number(e.target.value))}
                          />
                        </td>
                        <td className="price-text text-warning">
                          {(item.purchasePrice * item.quantity).toFixed(2)} rs
                        </td>
                        <td>
                          <button className="btn btn-danger" onClick={() => removePurchaseCartItem(idx)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="empty-state">Purchase cart is empty. Click "+ Add Products" to begin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {purchaseCart.length > 0 && (
                <div className="receipt-wrapper">
                  <div className="receipt-panel full-width-panel">
                    <h3 className="receipt-header">Purchase Bill Summary</h3>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Subtotal:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{purchaseBillingDetails.subtotal.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Discount:</span>
                      <div className="input-with-symbol">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={purchaseDiscountPercent}
                          onChange={e => setPurchaseDiscountPercent(Number(e.target.value))}
                          className="form-control discount-input"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <span className="text-right text-danger">
                        -{purchaseBillingDetails.discountAmount.toFixed(2)} rs
                      </span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Total Tax:</span>
                      <div className="input-with-symbol">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={purchaseTaxPercent}
                          onChange={e => setPurchaseTaxPercent(Number(e.target.value))}
                          className="form-control discount-input"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <span className="text-right"></span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">{purchaseBillingDetails.cgstPercent.toFixed(1).replace('.0', '')}%</span>
                      <span className="text-right">+{purchaseBillingDetails.cgst.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">{purchaseBillingDetails.sgstPercent.toFixed(1).replace('.0', '')}%</span>
                      <span className="text-right">+{purchaseBillingDetails.sgst.toFixed(2)} rs</span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">Roundoff:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">
                        {purchaseBillingDetails.roundoff > 0 ? '+' : ''}{purchaseBillingDetails.roundoff.toFixed(2)} rs
                      </span>
                    </div>
                    
                    <div className="receipt-total receipt-three-col">
                      <span>Final Total:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-warning text-right">
                        {purchaseBillingDetails.finalTotal} rs
                      </span>
                    </div>
                    
                    <button className="btn btn-warning btn-checkout" onClick={submitPurchaseCart}>
                      Save Purchase Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: INBOUND REGISTRATION HISTORY --- */}
        {view === 'purchases-list' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Purchase History</h2>
              <input
                type="text"
                className="form-control header-search"
                placeholder="Search ID, custom bill id or seller..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Seller Bill ID</th>
                    <th>Seller Name</th>
                    <th>Final Total (rs)</th>
                    <th>Purchase Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchaseInvoices.length ? paginatedPurchaseInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="fw-bold">
                        {invoice.customInvoiceId || `N/A (#${invoice.id})`}
                      </td>
                      <td>{invoice.sellerName}</td>
                      <td className="price-text text-warning fw-bold">{invoice.finalTotal}</td>
                      <td className="fw-bold">
                        {new Date(invoice.purchaseDate).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleViewPurchaseInvoiceDetails(invoice.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="empty-state">No purchases found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredPurchaseInvoices.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: INBOUND INVOICE DETAILS PAGE --- */}
        {view === 'purchase-invoice-details' && selectedPurchaseInvoice && selectedPurchaseInvoiceMath && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">
                Purchase Bill #{selectedPurchaseInvoice.customInvoiceId || selectedPurchaseInvoice.id} Details
              </h2>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setSelectedPurchaseInvoice(null)
                  setView('purchases-list') 
                }}
              >
                Back to Purchases
              </button>
            </div>
            
            <div className="invoice-summary-grid margin-top-large">
              <div className="info-block">
                <span className="info-label">Seller Name</span>
                <strong className="info-value">{selectedPurchaseInvoice.sellerName}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Date of Purchase</span>
                <strong className="info-value bill-blue">
                  {new Date(selectedPurchaseInvoice.purchaseDate).toLocaleDateString('en-GB')}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">Software Entry Time</span>
                <strong className="info-value">
                  {new Date(selectedPurchaseInvoice.entryDate).toLocaleString()}
                </strong>
              </div>
            </div>
            
            <h4 className="section-title-spacing">Items Bought</h4>
            
            <div className="table-responsive table-margin-bottom">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Product</th>
                    <th>Buy Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchaseInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold">{idx + 1}</td>
                      <td className="font-weight-medium">{item.product.name}</td>
                      <td>{item.purchasePrice} rs</td>
                      <td>{item.quantity}</td>
                      <td className="price-text text-warning">
                        {(item.purchasePrice * item.quantity).toFixed(2)} rs
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="invoice-math-wrapper">
              <div className="receipt-panel full-width-panel">
                <div className="receipt-row receipt-three-col">
                  <span className="fw-bold">Subtotal:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">{selectedPurchaseInvoiceMath.subtotal.toFixed(2)} rs</span>
                </div>
                
                {selectedPurchaseInvoiceMath.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red">
                    <span className="fw-bold">Discount:</span>
                    <span className="text-center text-muted">{selectedPurchaseInvoiceMath.discountPercent}%</span>
                    <span className="text-right text-danger">
                      -{selectedPurchaseInvoiceMath.discountAmount.toFixed(2)} rs
                    </span>
                  </div>
                )}
                
                {selectedPurchaseInvoiceMath.totalTaxPercent > 0 && (
                  <>
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Total Tax:</span>
                      <span className="text-center text-muted">
                        {selectedPurchaseInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right"></span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">
                        {selectedPurchaseInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{selectedPurchaseInvoiceMath.cgst.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">
                        {selectedPurchaseInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{selectedPurchaseInvoiceMath.sgst.toFixed(2)} rs</span>
                    </div>
                  </>
                )}

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Roundoff:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">
                    {selectedPurchaseInvoiceMath.roundoff > 0 ? '+' : ''}
                    {selectedPurchaseInvoiceMath.roundoff.toFixed(2)} rs
                  </span>
                </div>
                
                <div className="receipt-total receipt-three-col">
                  <span>Final Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-warning text-right">{selectedPurchaseInvoiceMath.finalTotal} rs</span>
                </div>
              </div>
            </div>
            
            <button 
              className="btn btn-secondary w-100 close-btn-padding"
              onClick={() => { 
                setSelectedPurchaseInvoice(null)
                setView('purchases-list') 
              }}
            >
              Back to Purchases List
            </button>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: MERGED OUTBOUND MARKETPLACE & CART --- */}
        {view === 'list' && (
          <div>
            <div className="sales-control-panel">
              <div className="sales-control-row">
                <div className="input-group customer-dropdown-group">
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

                <div className="action-buttons-right">
                  <button className="btn btn-danger" onClick={cancelSale}>
                    Cancel Sale
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setSearchQuery('');
                      setShowAddProductModal(true);
                    }}
                  >
                    + Add Products
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header header-actions">
                <h2 className="card-title">
                  Cart - {activeCustomer ? activeCustomer.name : <span className="text-danger">No Customer Selected</span>}
                </h2>
              </div>
              
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
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
                        <td className="fw-bold">{idx + 1}</td>
                        <td>{item.name}</td>
                        <td>{item.price} rs</td>
                        <td>
                          <input
                            type="number"
                            className="quantity-input form-control mb-0"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={e => updateQuantity(idx, Number(e.target.value))}
                          />
                        </td>
                        <td className="price-text">
                          {(item.price * item.quantity).toFixed(2)} rs
                        </td>
                        <td>
                          <button className="btn btn-danger" onClick={() => removeCartItem(idx)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="empty-state">Cart is empty. Click "+ Add Products" to begin.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {cart.length > 0 && (
                <div className="receipt-wrapper">
                  <div className="receipt-panel full-width-panel">
                    <h3 className="receipt-header">Bill Summary</h3>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Subtotal:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{billingDetails.subtotal.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Discount:</span>
                      <div className="input-with-symbol">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent}
                          onChange={e => setDiscountPercent(Number(e.target.value))}
                          className="form-control discount-input"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <span className="text-right text-danger">
                        -{billingDetails.discountAmount.toFixed(2)} rs
                      </span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Total Tax:</span>
                      <div className="input-with-symbol">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taxPercent}
                          onChange={e => setTaxPercent(Number(e.target.value))}
                          className="form-control discount-input"
                        />
                        <span className="text-muted">%</span>
                      </div>
                      <span className="text-right"></span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">{billingDetails.cgstPercent.toFixed(1).replace('.0', '')}%</span>
                      <span className="text-right">+{billingDetails.cgst.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">{billingDetails.sgstPercent.toFixed(1).replace('.0', '')}%</span>
                      <span className="text-right">+{billingDetails.sgst.toFixed(2)} rs</span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">Roundoff:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">
                        {billingDetails.roundoff > 0 ? '+' : ''}{billingDetails.roundoff.toFixed(2)} rs
                      </span>
                    </div>
                    
                    <div className="receipt-total receipt-three-col">
                      <span>Final Total:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-success text-right">{billingDetails.finalTotal} rs</span>
                    </div>
                    
                    <button className="btn btn-success btn-checkout" onClick={proceedToPayment}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: NEW PAYMENT / CHECKOUT PAGE --- */}
        {view === 'payment-screen' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">
                Checkout & Payment - {activeCustomer ? activeCustomer.name : 'Customer'}
              </h2>
              <button className="btn btn-secondary action-buttons-right" onClick={() => setView('list')}>
                Back to Cart
              </button>
            </div>

            <div className="form-container" style={{ maxWidth: '600px', margin: '1rem 0' }}>
              <div className="form-group">
                <label className="form-label">Date of Sale:</label>
                <input
                  type="date"
                  className="form-control"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Final Payable Amount (rs):</label>
                <input
                  type="text"
                  className="form-control fw-bold price-text"
                  style={{ fontSize: '1.4rem' }}
                  value={`${billingDetails.finalTotal} rs`}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Payment Method:</label>
                <div className="payment-methods-grid">
                  {['Cash', 'PhonePe', 'GPay', 'Cheque', 'DD', 'Debit Card', 'Credit Card'].map(method => (
                    <div
                      key={method}
                      className={`payment-method-card ${paymentMethod === method ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2.5rem', justifyContent: 'flex-start' }}>
                <button className="btn btn-success btn-checkout" onClick={submitFinalSale}>
                  Complete & Save Sale
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: OUTBOUND REVENUE HISTORY --- */}
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
                    <th>Payment Method</th>
                    <th>Final Total (rs)</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.length ? paginatedInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="fw-bold">{formatInvoiceId(invoice.id)}</td>
                      <td>{invoice.customerName}</td>
                      <td className="fw-bold">{invoice.paymentMethod || 'Cash'}</td>
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
                    <tr><td colSpan={6} className="empty-state">No sales found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredInvoices.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: OUTBOUND INVOICE DETAILS PAGE --- */}
        {view === 'invoice-details' && selectedInvoice && selectedInvoiceMath && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">
                Sale {formatInvoiceId(selectedInvoice.id)} Details
              </h2>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setSelectedInvoice(null)
                  setView('invoices') 
                }}
              >
                Back to Sales List
              </button>
            </div>
            
            <div className="invoice-summary-grid margin-top-large">
              <div className="info-block">
                <span className="info-label">Customer</span>
                <strong className="info-value">{selectedInvoice.customerName}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Payment Method</span>
                <strong className="info-value text-primary">{selectedInvoice.paymentMethod || 'Cash'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Date & Time</span>
                <strong className="info-value">{new Date(selectedInvoice.orderDate).toLocaleString()}</strong>
              </div>
            </div>
            
            <h4 className="section-title-spacing">Items Purchased</h4>
            
            <div className="table-responsive table-margin-bottom">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold">{idx + 1}</td>
                      <td className="font-weight-medium">{item.product.name}</td>
                      <td>{item.price} rs</td>
                      <td>{item.quantity}</td>
                      <td className="price-text">{(item.price * item.quantity).toFixed(2)} rs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="invoice-math-wrapper">
              <div className="receipt-panel full-width-panel">
                <div className="receipt-row receipt-three-col">
                  <span className="fw-bold">Subtotal:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">{selectedInvoiceMath.subtotal.toFixed(2)} rs</span>
                </div>
                
                {selectedInvoiceMath.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red">
                    <span className="fw-bold">Discount:</span>
                    <span className="text-center text-muted">{selectedInvoiceMath.discountPercent}%</span>
                    <span className="text-right text-danger">
                      -{selectedInvoiceMath.discountAmount.toFixed(2)} rs
                    </span>
                  </div>
                )}
                
                {selectedInvoiceMath.totalTaxPercent > 0 && (
                  <>
                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Total Tax:</span>
                      <span className="text-center text-muted">
                        {selectedInvoiceMath.totalTaxPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right"></span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">
                        {selectedInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{selectedInvoiceMath.cgst.toFixed(2)} rs</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">
                        {selectedInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{selectedInvoiceMath.sgst.toFixed(2)} rs</span>
                    </div>
                  </>
                )}

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Roundoff:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">
                    {selectedInvoiceMath.roundoff > 0 ? '+' : ''}
                    {selectedInvoiceMath.roundoff.toFixed(2)} rs
                  </span>
                </div>
                
                <div className="receipt-total receipt-three-col">
                  <span>Final Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-success text-right">{selectedInvoiceMath.finalTotal} rs</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => { 
                setSelectedInvoice(null)
                setView('invoices') 
              }} 
              className="btn btn-secondary w-100 close-btn-padding"
            >
              Back to Sales List
            </button>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: MASTER STOCK BALANCE SHEET --- */}
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
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th>HSN Code</th>
                    <th>Current Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length ? paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="fw-bold">{formatProductId(product.id)}</td>
                      <td className="fw-bold">{product.name}</td>
                      <td>{product.hsnCode || 'N/A'}</td>
                      <td className={`fw-bold fs-lg ${product.stock > 10 ? 'text-success' : (product.stock > 0 ? 'text-warning' : 'text-danger')}`}>
                        {product.stock} {product.stock <= 0 && '(Out of Stock)'}
                      </td>
                      <td>
                        <button className="btn btn-warning" onClick={() => openInventoryModal(product)}>
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="empty-state">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredProducts.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: CUSTOMER RELATIONSHIP MANAGER --- */}
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
                      <td className="fw-bold">{c.name}</td>
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
                    <tr><td colSpan={6} className="empty-state">No customers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredCustomers.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: ITEM DEFINITION CONTROL CATALOG --- */}
        {view === 'products' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Product Details</h2>
              <input 
                type="text" 
                className="form-control header-search search-expanded" 
                placeholder="Search products or HSN..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <button 
                className="btn btn-primary" 
                onClick={() => { 
                  setIsEditMode(false)
                  setProductForm({ name: '', hsnCode: '', purchasePrice: '', price: '', stock: '' })
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
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th>HSN Code</th>
                    <th>Purchase Price (rs)</th>
                    <th>Selling Price (rs)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length ? paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="fw-bold">{formatProductId(product.id)}</td>
                      <td className="fw-bold">{product.name}</td>
                      <td>{product.hsnCode || 'N/A'}</td>
                      <td className="price-text text-warning">{product.purchasePrice || 0} rs</td>
                      <td className="price-text text-success">{product.price} rs</td>
                      <td>
                        <div className="btn-group">
                          <button 
                            className="btn btn-warning" 
                            onClick={() => { 
                              setIsEditMode(true)
                              setEditingProductId(product.id)
                              setProductForm({ 
                                name: product.name, 
                                hsnCode: product.hsnCode || '',
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
                    <tr><td colSpan={6} className="empty-state">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredProducts.length)}
          </div>
        )}
      </main>

      {/* =========================================
          --- SYSTEM INTERACTIVE OVERLAYS ---
          ========================================= */}
      
      {/* 1. Add Product To Sales Cart Modal (Non-shrinking layout) */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div 
            className="modal-content" 
            style={{ maxWidth: '850px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="card-header header-actions" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-header-title mb-0">Select Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => {
                  setShowAddProductModal(false)
                  setSearchQuery('')
                }}
              >
                Close
              </button>
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <input
                type="text"
                className="form-control mb-0"
                placeholder="Search product name, HSN code or Product ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', minHeight: '0' }}>
              <table className="block-table data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>ID</th>
                    <th style={{ width: '35%' }}>Product Name</th>
                    <th style={{ width: '15%' }}>HSN Code</th>
                    <th style={{ width: '15%' }}>Price</th>
                    <th style={{ width: '15%' }}>Stock</th>
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
                        onClick={() => { if (!isOutOfStock) addToCart(product) }}
                        title={isOutOfStock ? 'Out of stock' : 'Click block to add to cart'}
                      >
                        <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                        <td className="col-product-name cell-padded">{product.name}</td>
                        <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                        <td className="price-text cell-padded">{product.price} rs</td>
                        <td className={`fw-bold cell-padded ${isOutOfStock ? 'text-danger' : 'text-success'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${availableStock} Units`}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Product To Purchase Cart Modal (Non-shrinking layout) */}
      {showAddPurchaseProductModal && (
        <div className="modal-overlay">
          <div 
            className="modal-content" 
            style={{ maxWidth: '850px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="card-header header-actions" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="modal-header-title mb-0">Select Purchase Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => {
                  setShowAddPurchaseProductModal(false)
                  setSearchQuery('')
                }}
              >
                Close
              </button>
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <input
                type="text"
                className="form-control mb-0"
                placeholder="Search product name, HSN code or Product ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', minHeight: '0' }}>
              <table className="block-table data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>ID</th>
                    <th style={{ width: '35%' }}>Product Name</th>
                    <th style={{ width: '15%' }}>HSN Code</th>
                    <th style={{ width: '15%' }}>Buy Price</th>
                    <th style={{ width: '15%' }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      className="product-row available"
                      onClick={() => addToPurchaseCart(product)}
                      title="Click block to add to purchase cart"
                    >
                      <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                      <td className="col-product-name cell-padded">{product.name}</td>
                      <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                      <td className="price-text text-warning cell-padded">
                        {product.purchasePrice || 0} rs
                      </td>
                      <td className="fw-bold cell-padded text-dark-muted">
                        {product.stock} Units
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={5} className="empty-state">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Quick Stock Editor Modal */}
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

      {/* 4. Global Catalog Product Configurator Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">
              {isEditMode ? 'Edit Product Details' : 'Add New Product'}
            </h3>
            
            <div className="form-group">
              <label className="form-label">Product Name:</label>
              <input
                className="form-control"
                value={productForm.name}
                onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">HSN Code:</label>
              <input
                className="form-control"
                value={productForm.hsnCode}
                placeholder="e.g. 6203"
                onChange={e => setProductForm({ ...productForm, hsnCode: e.target.value })}
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

      {/* 5. Global CRM Identity Overlay */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">
              {isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            
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