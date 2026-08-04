import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { 
  productService, 
  invoiceService, 
  customerService, 
  purchaseInvoiceService,
  historyService
} from './services/api'

export default function App() {
  // =========================================
  // --- Portable Dynamic ID Helper Functions ---
  // =========================================
  const formatProductId = (id) => id ? `PR${String(id).padStart(4, '0')}` : 'N/A'
  const formatInvoiceId = (id) => id ? `INV-${String(id).padStart(4, '0')}` : 'N/A'

  // Indian Rupee & Comma Formatter
  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return '₹ ' + num.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

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
  
  // History States
  const [inventoryHistory, setInventoryHistory] = useState([])
  const [invoiceHistory, setInvoiceHistory] = useState([])
  const [viewingHistoryLog, setViewingHistoryLog] = useState(null)

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
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [returnSaleData, setReturnSaleData] = useState(null)
  
  // Checkout Payment Screen States
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [isPayLater, setIsPayLater] = useState(false)
  
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
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerForm, setCustomerForm] = useState({ 
    name: '', 
    gstno: '', 
    mobile: '', 
    city: '', 
    location: '', 
    balance: 0, 
    state: ''
  })

  const [viewingProduct, setViewingProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)
  const [productForm, setProductForm] = useState({ 
    name: '', 
    hsnCode: '', 
    purchasePrice: '', 
    mrp: '', 
    price: '', 
    stock: '' 
  })

  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [inventoryForm, setInventoryForm] = useState({ stock: '' })

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
    loadHistory()
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
      if (inv.isReturn) return;

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
    const subtotal = cart.reduce((sum, item) => sum + item.price * (Number(item.quantity) || 0), 0)
    const discountAmount = subtotal * (discountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    
    const cgstPercent = taxPercent / 2
    const sgstPercent = taxPercent / 2
    
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    
    return { 
      subtotal, 
      discountAmount, 
      taxableAmount, 
      cgstPercent, 
      sgstPercent, 
      cgst, 
      sgst, 
      roundoff, 
      finalTotal 
    }
  }, [cart, discountPercent, taxPercent])

  const purchaseBillingDetails = useMemo(() => {
    const subtotal = purchaseCart.reduce((sum, item) => sum + (item.purchasePrice || 0) * (Number(item.quantity) || 0), 0)
    const discountAmount = subtotal * (purchaseDiscountPercent / 100)
    const taxableAmount = subtotal - discountAmount
    
    const cgstPercent = purchaseTaxPercent / 2
    const sgstPercent = purchaseTaxPercent / 2
    
    const cgst = taxableAmount * (cgstPercent / 100)
    const sgst = taxableAmount * (sgstPercent / 100)
    
    const exactTotal = taxableAmount + cgst + sgst
    const finalTotal = Math.round(exactTotal)
    const roundoff = finalTotal - exactTotal
    
    return { 
      subtotal, 
      discountAmount, 
      taxableAmount, 
      cgstPercent, 
      sgstPercent, 
      cgst, 
      sgst, 
      roundoff, 
      finalTotal 
    }
  }, [purchaseCart, purchaseDiscountPercent, purchaseTaxPercent])

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

    return { 
      subtotal, 
      discountPercent, 
      discountAmount, 
      taxableAmount, 
      cgst, 
      sgst, 
      exactTotal, 
      finalTotal, 
      roundoff, 
      cgstPercent, 
      sgstPercent, 
      totalTaxPercent 
    };
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

    return { 
      subtotal, 
      discountPercent, 
      discountAmount, 
      taxableAmount, 
      cgst, 
      sgst, 
      exactTotal, 
      finalTotal, 
      roundoff, 
      cgstPercent, 
      sgstPercent, 
      totalTaxPercent 
    };
  }, [selectedPurchaseInvoice]);

  const returnMath = useMemo(() => {
    if (!returnSaleData) return null;
    
    const subtotal = returnSaleData.returnItems.reduce((sum, item) => sum + (item.price * (Number(item.returnQty) || 0)), 0);
    const discountPercent = returnSaleData.discountPercent || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    
    const origSubtotal = returnSaleData.grossTotal || 0;
    const origDiscountAmt = origSubtotal * (discountPercent / 100);
    const origTaxable = origSubtotal - origDiscountAmt;
    const origCgstPercent = origTaxable > 0 ? (returnSaleData.cgst / origTaxable) : 0;
    const origSgstPercent = origTaxable > 0 ? (returnSaleData.sgst / origTaxable) : 0;

    const cgst = taxableAmount * origCgstPercent;
    const sgst = taxableAmount * origSgstPercent;
    const exactTotal = taxableAmount + cgst + sgst;
    const finalTotal = Math.round(exactTotal);
    const roundoff = finalTotal - exactTotal;

    return { 
      subtotal, 
      discountAmount, 
      taxableAmount, 
      cgst, 
      sgst, 
      finalTotal, 
      roundoff 
    };
  }, [returnSaleData]);

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
    (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.gstno && c.gstno.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const dropdownFilteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(customerSearch.toLowerCase()))
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

  const filteredInventoryHistory = inventoryHistory.filter(log => 
    log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actionType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvoiceHistory = invoiceHistory.filter(log => 
    log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatInvoiceId(log.originalInvoiceId).toLowerCase().includes(searchQuery.toLowerCase())
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
  const paginatedInventoryHistory = filteredInventoryHistory.slice(indexOfFirstItem, indexOfLastItem)
  const paginatedInvoiceHistory = filteredInvoiceHistory.slice(indexOfFirstItem, indexOfLastItem)

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

  function loadHistory() {
    historyService.getInventoryHistory().then(data => {
      setInventoryHistory(Array.isArray(data) ? data : [])
    })
    historyService.getInvoiceHistory().then(data => {
      setInvoiceHistory(Array.isArray(data) ? data : [])
    })
  }

  // =========================================
  // --- Outbound Sales Process Handlers ---
  // =========================================
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
            ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } 
            : item
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(index, val) {
    setCart(current => {
      const item = current[index]
      if (val === '') {
        return current.map((itm, idx) => idx === index ? { ...itm, quantity: '' } : itm)
      }
      const quantity = Number(val)
      if (quantity < 0) return current
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

  function proceedToPayment() {
    if (!cart.length) {
      return window.alert('Cart is empty.')
    }
    if (!activeCustomer) {
      return window.alert('Please select a customer from the top dropdown before proceeding to payment.')
    }
    setView('payment-screen')
  }

  function submitFinalSale() {
    const finalPaymentMethod = isPayLater ? 'Pay Later' : paymentMethod;

    if (editingInvoiceId) {
      invoiceService.update(
        editingInvoiceId,
        activeCustomer.name,
        cart,
        billingDetails.subtotal, 
        discountPercent,
        billingDetails.cgst,
        billingDetails.sgst,
        billingDetails.finalTotal,
        finalPaymentMethod,
        saleDate
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} updated successfully!`)
        resetSalesState()
      }).catch(err => window.alert('Failed to update sale. ' + err.message))
    } else {
      invoiceService.create(
        activeCustomer.name,
        cart,
        billingDetails.subtotal, 
        discountPercent,
        billingDetails.cgst,
        billingDetails.sgst,
        billingDetails.finalTotal,
        finalPaymentMethod,
        saleDate
      ).then(invoice => {
        window.alert(`Sale ${formatInvoiceId(invoice.id)} completed successfully!`)
        resetSalesState()
      }).catch(err => window.alert('Failed to complete sale. ' + err.message))
    }
  }

  function resetSalesState() {
    setCart([])
    setActiveCustomer(null)
    setCustomerSearch('')
    setDiscountPercent(0)
    setTaxPercent(5)
    setPaymentMethod('Cash')
    setIsPayLater(false)
    setSaleDate(new Date().toISOString().split('T')[0])
    setEditingInvoiceId(null)
    setView('invoices')
    loadProducts()
    loadInvoices()
    loadHistory()
  }

  function cancelSale() {
    if (window.confirm("Are you sure you want to cancel the current sale/edit?")) {
      setCart([])
      setActiveCustomer(null)
      setCustomerSearch('')
      setDiscountPercent(0)
      setTaxPercent(5)
      setEditingInvoiceId(null)
      setIsPayLater(false)
      setView('list')
    }
  }

  function handleViewInvoiceDetails(invoiceId) { 
    invoiceService.getInvoiceById(invoiceId).then(data => {
      setSelectedInvoice(data)
      setView('invoice-details')
    }) 
  }

  function handleEditSale(invoice) {
    setEditingInvoiceId(invoice.id)
    setActiveCustomer({ name: invoice.customerName })
    setCustomerSearch(invoice.customerName)
    setDiscountPercent(invoice.discountPercent || 0)
    
    if (invoice.paymentMethod === 'Pay Later') {
      setIsPayLater(true);
      setPaymentMethod('Cash');
    } else {
      setIsPayLater(false);
      setPaymentMethod(invoice.paymentMethod || 'Cash');
    }
    
    const localDateString = invoice.orderDate 
      ? invoice.orderDate.split('T')[0] 
      : new Date().toISOString().split('T')[0];
    
    setSaleDate(localDateString)

    const subtotal = invoice.grossTotal || 0;
    const discountAmt = subtotal * ((invoice.discountPercent || 0) / 100);
    const taxableAmt = subtotal - discountAmt;
    const totalTaxPercent = taxableAmt > 0 ? ((invoice.cgst + invoice.sgst) / taxableAmt) * 100 : 5;
    
    setTaxPercent(Math.round(totalTaxPercent))

    setCart(invoice.items.map(item => ({
      ...item.product,
      id: item.product.id,
      price: item.price,
      quantity: item.quantity,
      originalQuantity: item.quantity, 
      stock: (item.product.stock || 0) + item.quantity 
    })))
    
    setView('list')
  }

  function handleInitiateReturn(invoice) {
    if (invoice.isReturn) return window.alert("This is already a returned invoice!");
    setReturnSaleData({
      ...invoice,
      returnItems: invoice.items.map(item => ({
        ...item,
        returnQty: 0
      }))
    });
    setView('return-sale');
  }

  function handleReturnAllItems() {
    setReturnSaleData(prev => ({
      ...prev,
      returnItems: prev.returnItems.map(item => ({ ...item, returnQty: item.quantity }))
    }));
  }

  function submitReturn() {
    const itemsToReturn = returnSaleData.returnItems.filter(i => (Number(i.returnQty) || 0) > 0);
    
    if (itemsToReturn.length === 0) {
      return window.alert("Please select at least one item to return.");
    }
    
    if (!window.confirm(`Process return for ${itemsToReturn.length} items? This will generate a negative bill and restore inventory.`)) {
      return;
    }

    invoiceService.returnInvoice(
      returnSaleData.id,
      itemsToReturn.map(i => ({ id: i.product.id, quantity: Number(i.returnQty), price: i.price })),
      returnMath.subtotal,
      returnSaleData.discountPercent,
      returnMath.cgst,
      returnMath.sgst,
      returnMath.finalTotal
    ).then(() => {
      window.alert("Return processed successfully!");
      setReturnSaleData(null);
      setView('invoices');
      loadInvoices();
      loadProducts();
      loadHistory();
    }).catch(err => window.alert("Failed to process return: " + err.message));
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
            ? { ...item, quantity: (Number(item.quantity) || 0) + 1 } 
            : item
        )
      }
      return [...current, { ...product, quantity: 1, purchasePrice: product.purchasePrice || 0 }]
    })
  }

  function updatePurchaseQuantity(index, val) {
    setPurchaseCart(current => {
      if (val === '') {
        return current.map((itm, idx) => idx === index ? { ...itm, quantity: '' } : itm)
      }
      const quantity = Number(val)
      if (quantity < 0) return current
      return current.map((itm, idx) => idx === index ? { ...itm, quantity } : itm)
    })
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

  function proceedToPurchaseSummary() {
    if (!purchaseCart.length) {
      return window.alert('Purchase cart is empty.')
    }
    if (!purchaseSellerName.trim()) {
      return window.alert('Please select or enter a Seller Name before proceeding.')
    }
    if (!customInvoiceId.trim()) {
      return window.alert('Please enter the Purchase Invoice ID given by the seller.')
    }
    if (!purchaseDate) {
      return window.alert('Please select the Date of Purchase.')
    }
    setView('purchase-summary-screen')
  }

  function submitPurchaseCart() {
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
    ).then(() => {
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
      loadHistory()
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
    const mrp = parseFloat(productForm.mrp)
    const price = parseFloat(productForm.price)
    
    if (!name || isNaN(purchasePrice) || isNaN(mrp) || isNaN(price) || purchasePrice < 0 || price <= 0 || mrp <= 0) {
      return window.alert('Invalid details. Ensure all prices are positive numbers.')
    }
    
    if (isEditMode) {
      const existingProduct = products.find(p => p.id === editingProductId)
      productService.updateProduct(
        editingProductId, 
        name, 
        purchasePrice, 
        mrp,
        price, 
        existingProduct ? existingProduct.stock : 0,
        hsnCode
      ).then(() => { 
        loadProducts()
        loadHistory()
        closeProductModal() 
      })
    } else {
      productService.addProduct(
        name, 
        purchasePrice, 
        mrp,
        price, 
        parseInt(productForm.stock, 10) || 0,
        hsnCode
      ).then(() => { 
        loadProducts()
        loadHistory()
        closeProductModal() 
      })
    }
  }

  function handleDeleteProduct(id, name) {
    if (window.confirm(`Are you sure you want to completely delete "${name}"? This cannot be undone.`)) { 
      productService.deleteProduct(id).then(() => {
        loadProducts();
        closeProductModal();
      }) 
    }
  }

  function closeProductModal() {
    setShowProductModal(false)
    setProductForm({ 
      name: '', 
      hsnCode: '', 
      purchasePrice: '', 
      mrp: '', 
      price: '', 
      stock: '' 
    })
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
      product.mrp || product.price, 
      product.price, 
      newStock,
      product.hsnCode
    ).then(() => { 
      loadProducts()
      loadHistory()
      closeInventoryModal() 
    })
  }

  function handleSaveCustomer() {
    const { name, gstno, mobile, city, location, balance, state } = customerForm
    if (!name?.trim()) return window.alert('Name is required')
    
    const action = isCustomerEditMode
      ? customerService.updateCustomer(editingCustomerId, name, gstno, mobile, city, location, balance, state)
      : customerService.addCustomer(name, gstno, mobile, city, location, balance, state)
      
    action.then(() => { 
      loadCustomers()
      closeCustomerModal() 
    })
  }

  function handleDeleteCustomer(id, name) {
    if (window.confirm(`Are you sure you want to completely delete customer "${name}"? This cannot be undone.`)) {
      customerService.deleteCustomer(id).then(() => {
        loadCustomers()
        if (activeCustomer?.id === id) { 
          setActiveCustomer(null)
          setCustomerSearch('') 
        }
        closeCustomerModal();
      })
    }
  }

  function closeCustomerModal() {
    setShowCustomerModal(false)
    setCustomerForm({ 
      name: '', 
      gstno: '', 
      mobile: '', 
      city: '', 
      location: '', 
      balance: 0, 
      state: '' 
    })
  }

  // =========================================
  // --- File Upload / Excel Reports ---
  // =========================================
  const handleImportCustomers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedCustomers = data.map(row => ({
          name: row.Name || row.name || 'Unknown',
          mobile: String(row['Phone Number'] || row.mobile || ''),
          city: row.City || row.city || '',
          location: row.Location || row.location || '',
          gstno: row.GST || row.gstno || '',
          balance: Number(row.Balance || row.balance) || 0,
          state: row.State || row.state || ''
        }));

        customerService.addCustomersBulk(formattedCustomers)
          .then(() => {
            window.alert(`Successfully imported/updated ${formattedCustomers.length} customers!`);
            loadCustomers();
          })
          .catch(err => window.alert("Failed to import customers: " + err.message));
      } catch (err) {
        window.alert("Error parsing Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) return window.alert("No customers to export.");
    
    const dataToExport = customers.map(c => ({
      'Customer ID': c.id,
      'Name': c.name,
      'Phone Number': c.mobile,
      'City': c.city,
      'Location': c.location,
      'State': c.state,
      'GST': c.gstno,
      'Balance': c.balance
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportProducts = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedProducts = data.map(row => {
          let parsedId = null;
          const rawId = row.Id || row['Product ID'] || row.id;
          if (rawId) {
             const extracted = String(rawId).replace(/[^0-9]/g, '');
             if (extracted) parsedId = parseInt(extracted, 10);
          }

          return {
            id: parsedId,
            name: row.Name || row.name || 'Unknown Product',
            hsnCode: String(row.HSN || row['HSN Code'] || row.hsnCode || ''),
            purchasePrice: Number(row['purchase price'] || row['Purchase Price'] || row.purchasePrice) || 0,
            mrp: Number(row.MRP || row.mrp) || 0,
            price: Number(row['sales price'] || row['Selling Price'] || row.price) || 0,
            stock: Number(row['In Stock'] || row.Stock || row.stock) || 0
          }
        });

        productService.addProductsBulk(formattedProducts)
          .then(() => {
            window.alert(`Successfully imported/updated ${formattedProducts.length} products!`);
            loadProducts();
            loadHistory(); 
          })
          .catch(err => window.alert("Failed to import products: " + err.message));
      } catch (err) {
        window.alert("Error parsing Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportProducts = () => {
    if (products.length === 0) return window.alert("No products to export.");
    
    const dataToExport = products.map(p => ({
      'Product ID': formatProductId(p.id),
      'Name': p.name,
      'HSN Code': p.hsnCode,
      'Purchase Price': p.purchasePrice,
      'MRP': p.mrp || p.price,
      'Selling Price': p.price,
      'Stock': p.stock
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `Products_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // =========================================
  // --- Helper to Render JSON arrays in History Modal ---
  // =========================================
  const renderHistoryItems = (jsonString) => {
    try {
      if (!jsonString) return <tr><td colSpan="3" className="text-muted">No items</td></tr>;
      const items = JSON.parse(jsonString);
      return items.map((item, idx) => (
        <tr key={idx}>
          <td className="fw-bold">{item.name}</td>
          <td>{item.qty}</td>
          <td className="text-success">{formatMoney(item.price)}</td>
        </tr>
      ));
    } catch (e) {
      return <tr><td colSpan="3" className="text-danger">Error reading items</td></tr>;
    }
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
      {/* TOPBAR NAVIGATION MODULE */}
      <header className="topbar">
        <div className="topbar-brand">Retailer App</div>
        <nav className="nav-links">
          <button 
            className={`nav-item ${view === 'home' ? 'active' : ''}`} 
            onClick={() => setView('home')}
          >
            Home
          </button>

          <div className="nav-dropdown">
            <button className={`nav-item ${['list', 'payment-screen', 'invoices', 'invoice-details', 'return-sale', 'edit-history'].includes(view) ? 'active' : ''}`}>
              Sales ▼
            </button>
            <div className="nav-dropdown-content">
              <button 
                className="nav-dropdown-item" 
                onClick={() => { setEditingInvoiceId(null); setView('list'); }}
              >
                New Sale
              </button>
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('invoices')}
              >
                Sales List
              </button>
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('edit-history')}
              >
                Edit History
              </button>
            </div>
          </div>

          <div className="nav-dropdown">
            <button className={`nav-item ${['purchase-new', 'purchase-summary-screen', 'purchases-list', 'purchase-invoice-details'].includes(view) ? 'active' : ''}`}>
              Purchases ▼
            </button>
            <div className="nav-dropdown-content">
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('purchase-new')}
              >
                New Purchase
              </button>
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('purchases-list')}
              >
                Purchase History
              </button>
            </div>
          </div>

          <div className="nav-dropdown">
            <button className={`nav-item ${['inventory', 'inventory-history'].includes(view) ? 'active' : ''}`}>
              Inventory ▼
            </button>
            <div className="nav-dropdown-content">
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('inventory')}
              >
                Stock Balance
              </button>
              <button 
                className="nav-dropdown-item" 
                onClick={() => setView('inventory-history')}
              >
                Inventory History
              </button>
            </div>
          </div>

          <button 
            className={`nav-item ${view === 'customers-manage' ? 'active' : ''}`} 
            onClick={() => setView('customers-manage')}
          >
            Customers
          </button>

          <button 
            className={`nav-item ${view === 'products' ? 'active' : ''}`} 
            onClick={() => setView('products')}
          >
            Products
          </button>

          <button 
            className={`nav-item ${view === 'reports' ? 'active' : ''}`} 
            onClick={() => setView('reports')}
          >
            Reports
          </button>
        </nav>
        
        <button 
          className="btn btn-danger logout-btn" 
          onClick={() => { 
            setIsLoggedIn(false); 
            setUsername(''); 
            setPassword(''); 
            setView('home'); 
          }}
        >
          Logout
        </button>
      </header>

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
                          <td className="text-success text-right">{formatMoney(item.total)}</td>
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
                          <td className="text-primary text-right">{formatMoney(item.total)}</td>
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
                          <td className="text-purple text-right">{formatMoney(item.total)}</td>
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
                          <td className="text-amber text-right">{formatMoney(item.total)}</td>
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
                <table className="block-table data-table">
                  <thead>
                    <tr>
                      <th>Bill ID</th>
                      <th>Customer Name</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 5).map(inv => (
                      <tr key={inv.id} className="product-row available" onClick={() => handleViewInvoiceDetails(inv.id)}>
                        <td className="fw-bold cell-padded">{formatInvoiceId(inv.id)}</td>
                        <td className="cell-padded">{inv.customerName}</td>
                        <td className={`price-text cell-padded ${inv.isReturn ? 'text-danger' : 'text-success'}`}>
                          {formatMoney(inv.finalTotal || inv.totalAmount)}
                        </td>
                        <td className="cell-padded">{new Date(inv.orderDate).toLocaleString()}</td>
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

        {/* --- INTERFACE PATH TARGET: REPORTS MENU --- */}
        {view === 'reports' && (
          <div className="card transparent-card">
            <div className="reports-layout">
              {/* CUSTOMERS COLUMN */}
              <div className="card mb-0">
                <div className="card-header">
                  <h2 className="card-title">Customer Data</h2>
                </div>
                <div className="dashboard-stats-grid single-col mt-1">
                  <div className="card stat-card report-card report-card-export">
                    <h4>Export Customers</h4>
                    <p className="text-muted mb-1-5">
                      Download a complete backup of all your customers and their ledger balances.
                    </p>
                    <div className="mt-auto">
                      <button className="btn btn-primary w-100" onClick={handleExportCustomers}>
                        Download Excel Report
                      </button>
                    </div>
                  </div>

                  <div className="card stat-card report-card report-card-import">
                    <h4>Import & Update Customers</h4>
                    <p className="text-muted mb-1-5">
                      Upload Excel file to add new customers or update existing ones (matches by Phone Number or Name).
                    </p>
                    <div className="mt-auto">
                      <input 
                        type="file" 
                        id="excel-upload-customers" 
                        accept=".xlsx, .xls" 
                        className="d-none"
                        onChange={handleImportCustomers} 
                      />
                      <label htmlFor="excel-upload-customers" className="btn btn-success w-100 d-block cursor-pointer">
                        Select Excel File
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRODUCTS COLUMN */}
              <div className="card mb-0">
                <div className="card-header">
                  <h2 className="card-title">Product Inventory Data</h2>
                </div>
                <div className="dashboard-stats-grid single-col mt-1">
                  <div className="card stat-card report-card report-card-export-prod">
                    <h4>Export Products</h4>
                    <p className="text-muted mb-1-5">
                      Download a complete list of your products, prices, and current stock levels.
                    </p>
                    <div className="mt-auto">
                      <button className="btn btn-warning w-100" onClick={handleExportProducts}>
                        Download Excel Report
                      </button>
                    </div>
                  </div>

                  <div className="card stat-card report-card report-card-import-prod">
                    <h4>Import & Update Products</h4>
                    <p className="text-muted mb-1-5">
                      Upload Excel file to add new products or update prices/stock (matches by Product ID or Name).
                    </p>
                    <div className="mt-auto">
                      <input 
                        type="file" 
                        id="excel-upload-products" 
                        accept=".xlsx, .xls" 
                        className="d-none"
                        onChange={handleImportProducts} 
                      />
                      <label htmlFor="excel-upload-products" className="btn btn-purple w-100 d-block cursor-pointer">
                        Select Excel File
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: MERGED INBOUND PURCHASES --- */}
        {view === 'purchase-new' && (
          <div>
            <div className="sales-control-panel">
              <div className="cancel-btn-wrapper">
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={cancelPurchase}
                >
                  ✕ Cancel Purchase
                </button>
              </div>
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
              
              <div className="invoice-summary-grid purchase-entry-grid border-bottom-padded">
                <div className="form-group mb-0">
                  <label className="form-label">
                    Purchase Invoice ID <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control mb-0"
                    placeholder="e.g. INV-12:A9"
                    value={customInvoiceId}
                    onChange={e => setCustomInvoiceId(e.target.value)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label">
                    Date of Purchase <span className="text-danger">*</span>
                  </label>
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
                      <th>Buy Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseCart.length ? purchaseCart.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`}>
                        <td className="fw-bold">{idx + 1}</td>
                        <td>
                          <span className="product-name-large">
                            {item.name}
                          </span>
                        </td>
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
                            className="quantity-input form-control mb-0 qty-input-large"
                            min="1"
                            value={item.quantity}
                            onChange={e => updatePurchaseQuantity(idx, e.target.value)}
                            onBlur={e => {
                              if (e.target.value === '' || Number(e.target.value) < 1) {
                                updatePurchaseQuantity(idx, 1);
                              }
                            }}
                          />
                        </td>
                        <td className="price-text text-warning">
                          {formatMoney(item.purchasePrice * (Number(item.quantity) || 0))}
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => removePurchaseCartItem(idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          Purchase cart is empty. Click "+ Add Products" to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {purchaseCart.length > 0 && (
                <div className="receipt-wrapper">
                  <div className="receipt-panel full-width-panel">
                    
                    <div className="receipt-summary-header">
                      <span className="fw-bold text-slate">
                        Total Items: {purchaseCart.length}
                      </span>
                      <span className="fw-bold text-slate">
                        Total Qty: {purchaseCart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                      </span>
                    </div>

                    <div className="receipt-row receipt-three-col fs-xl mb-1-5">
                      <span className="fw-bold">Gross Total:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right fw-bold">
                        {formatMoney(purchaseBillingDetails.subtotal)}
                      </span>
                    </div>
                    
                    <button 
                      className="btn btn-primary btn-checkout" 
                      onClick={proceedToPurchaseSummary}
                    >
                      Proceed to Bill Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: SECOND PAGE PURCHASE SUMMARY --- */}
        {view === 'purchase-summary-screen' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title">
                Purchase Summary
              </h2>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => setView('purchase-new')}
              >
                Back to Cart
              </button>
            </div>

            <div className="invoice-summary-grid margin-top-large highlight-summary-box">
              <div className="info-block">
                <span className="info-label">Seller</span>
                <strong className="info-value text-primary">{purchaseSellerName}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Invoice ID</span>
                <strong className="info-value">{customInvoiceId}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Date</span>
                <strong className="info-value">{new Date(purchaseDate).toLocaleDateString('en-GB')}</strong>
              </div>
            </div>

            <div className="receipt-wrapper mt-2">
              <div className="receipt-panel full-width-panel">
                <h3 className="receipt-header">Full Bill Summary</h3>
                
                <div className="receipt-summary-header">
                  <span className="fw-bold text-slate">
                    Total Items: {purchaseCart.length}
                  </span>
                  <span className="fw-bold text-slate">
                    Total Qty: {purchaseCart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                  </span>
                </div>

                <div className="receipt-row receipt-three-col">
                  <span className="fw-bold">Gross Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">{formatMoney(purchaseBillingDetails.subtotal)}</span>
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
                    -{formatMoney(purchaseBillingDetails.discountAmount)}
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
                  <span className="text-muted">Subtotal (Excl. Tax):</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">{formatMoney(purchaseBillingDetails.taxableAmount)}</span>
                </div>
                
                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">CGST:</span>
                  <span className="text-center text-muted">
                    {purchaseBillingDetails.cgstPercent.toFixed(1).replace('.0', '')}%
                  </span>
                  <span className="text-right">+{formatMoney(purchaseBillingDetails.cgst)}</span>
                </div>
                
                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">SGST:</span>
                  <span className="text-center text-muted">
                    {purchaseBillingDetails.sgstPercent.toFixed(1).replace('.0', '')}%
                  </span>
                  <span className="text-right">+{formatMoney(purchaseBillingDetails.sgst)}</span>
                </div>

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Roundoff:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">
                    {purchaseBillingDetails.roundoff > 0 ? '+' : ''}
                    {formatMoney(purchaseBillingDetails.roundoff)}
                  </span>
                </div>
                
                <div className="receipt-total receipt-three-col">
                  <span>Final Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-warning text-right">
                    {formatMoney(purchaseBillingDetails.finalTotal)}
                  </span>
                </div>
                
                <button 
                  className="btn btn-warning btn-checkout mt-1-5" 
                  onClick={submitPurchaseCart}
                >
                  Save Purchase Invoice
                </button>
              </div>
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
              <table className="block-table data-table">
                <thead>
                  <tr>
                    <th>Seller Bill ID</th>
                    <th>Seller Name</th>
                    <th>Final Total</th>
                    <th>Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchaseInvoices.length ? paginatedPurchaseInvoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className="product-row available"
                      onClick={() => handleViewPurchaseInvoiceDetails(invoice.id)}
                    >
                      <td className="fw-bold cell-padded">
                        {invoice.customInvoiceId || `N/A (#${invoice.id})`}
                      </td>
                      <td className="cell-padded">{invoice.sellerName}</td>
                      <td className="price-text text-warning fw-bold cell-padded">
                        {formatMoney(invoice.finalTotal)}
                      </td>
                      <td className="fw-bold cell-padded">
                        {new Date(invoice.purchaseDate).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="empty-state">No purchases found.</td></tr>
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
                      <td>
                        <span className="product-name-large">
                          {item.product.name}
                        </span>
                      </td>
                      <td>{formatMoney(item.purchasePrice)}</td>
                      <td className="fw-bold fs-lg">{item.quantity}</td>
                      <td className="price-text text-warning">
                        {formatMoney(item.purchasePrice * item.quantity)}
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
                  <span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.subtotal)}</span>
                </div>
                
                {selectedPurchaseInvoiceMath.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red">
                    <span className="fw-bold">Discount:</span>
                    <span className="text-center text-muted">{selectedPurchaseInvoiceMath.discountPercent}%</span>
                    <span className="text-right text-danger">
                      -{formatMoney(selectedPurchaseInvoiceMath.discountAmount)}
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
                      <span className="text-muted">Subtotal (Excl. Tax):</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{formatMoney(selectedPurchaseInvoiceMath.taxableAmount)}</span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">
                        {selectedPurchaseInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.cgst)}</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">
                        {selectedPurchaseInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(selectedPurchaseInvoiceMath.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Roundoff:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">
                    {selectedPurchaseInvoiceMath.roundoff > 0 ? '+' : ''}
                    {formatMoney(selectedPurchaseInvoiceMath.roundoff)}
                  </span>
                </div>
                
                <div className="receipt-total receipt-three-col">
                  <span>Final Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-warning text-right">
                    {formatMoney(selectedPurchaseInvoiceMath.finalTotal)}
                  </span>
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
              <div className="cancel-btn-wrapper">
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={cancelSale}
                >
                  ✕ Cancel Sale
                </button>
              </div>
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
                            <span className="fw-bold">{c.name}</span>
                            {(c.location || c.city) && (
                              <span className="dropdown-location">
                                - {[c.location, c.city].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </li>
                        )) : (
                          <li className="dropdown-empty">No customers found</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="action-buttons-right">
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
                  {editingInvoiceId ? `Editing Sale ${formatInvoiceId(editingInvoiceId)}` : 'Cart'} - {activeCustomer ? activeCustomer.name : <span className="text-danger">No Customer Selected</span>}
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
                        <td>
                          <span className="product-name-large">
                            {item.name}
                          </span>
                        </td>
                        <td>{formatMoney(item.price)}</td>
                        <td>
                          <input
                            type="number"
                            className="quantity-input form-control mb-0 qty-input-large"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={e => updateQuantity(idx, e.target.value)}
                            onBlur={e => {
                              if (e.target.value === '' || Number(e.target.value) < 1) {
                                updateQuantity(idx, 1);
                              }
                            }}
                          />
                          {editingInvoiceId && item.originalQuantity !== undefined && (
                            <div className="text-muted fs-sm mt-1">Previous: {item.originalQuantity}</div>
                          )}
                        </td>
                        <td className="price-text">
                          {formatMoney(item.price * (Number(item.quantity) || 0))}
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger" 
                            onClick={() => removeCartItem(idx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="empty-state">
                          Cart is empty. Click "+ Add Products" to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {cart.length > 0 && (
                <div className="receipt-wrapper">
                  <div className="receipt-panel full-width-panel">
                    <h3 className="receipt-header">Bill Summary</h3>
                    
                    <div className="receipt-summary-header">
                      <span className="fw-bold text-slate">
                        Total Items: {cart.length}
                      </span>
                      <span className="fw-bold text-slate">
                        Total Qty: {cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                      </span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="fw-bold">Subtotal:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{formatMoney(billingDetails.subtotal)}</span>
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
                        -{formatMoney(billingDetails.discountAmount)}
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
                      <span className="text-muted">Subtotal (Excl. Tax):</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{formatMoney(billingDetails.taxableAmount)}</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">
                        {billingDetails.cgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(billingDetails.cgst)}</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">
                        {billingDetails.sgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(billingDetails.sgst)}</span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">Roundoff:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">
                        {billingDetails.roundoff > 0 ? '+' : ''}{formatMoney(billingDetails.roundoff)}
                      </span>
                    </div>
                    
                    <div className="receipt-total receipt-three-col">
                      <span>Final Total:</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-success text-right">
                        {formatMoney(billingDetails.finalTotal)}
                      </span>
                    </div>
                    
                    <button 
                      className="btn btn-success btn-checkout" 
                      onClick={proceedToPayment}
                    >
                      Proceed to Payment
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
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => setView('list')}
              >
                Back to Cart
              </button>
            </div>

            <div className="form-container payment-container">
              <div className="form-group">
                <label className="form-label">Date of Sale:</label>
                <input
                  type="date"
                  className="form-control payment-input"
                  value={saleDate}
                  onChange={e => setSaleDate(e.target.value)}
                  disabled={!!editingInvoiceId} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Final Payable Amount:</label>
                <input
                  type="text"
                  className="form-control fw-bold price-text fs-xxl"
                  value={`${formatMoney(billingDetails.finalTotal)}`}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method:</label>
                <div className="payment-method-row">
                  <select 
                    className={`form-control mb-0 payment-input pay-later-select ${isPayLater ? 'pay-later-disabled' : 'pay-later-active'}`} 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                    disabled={isPayLater}
                  >
                    <option value="Cash">Cash</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="GPay">GPay</option>
                    <option value="Cheque">Cheque</option>
                    <option value="DD">DD</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                  
                  <button 
                    className={`btn btn-pay-later ${isPayLater ? 'btn-warning' : 'btn-secondary'}`}
                    onClick={() => setIsPayLater(!isPayLater)}
                    type="button"
                  >
                    {isPayLater ? '✓ Marked as Unpaid' : 'Pay Later (Khata)'}
                  </button>
                </div>
                {isPayLater && (
                  <div className="pay-later-warning">
                    * This bill will be recorded as an unpaid balance.
                  </div>
                )}
              </div>

              <div className="modal-actions payment-actions">
                <button 
                  className={`btn btn-checkout ${isPayLater ? 'btn-warning' : 'btn-success'}`} 
                  onClick={submitFinalSale}
                >
                  {editingInvoiceId ? 'Save Edits' : 'Complete & Save Sale'}
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
              <table className="block-table data-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Customer Name</th>
                    <th>Payment Method</th>
                    <th>Final Total</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.length ? paginatedInvoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className="product-row available"
                      onClick={(e) => {
                        if (e.target.tagName !== 'BUTTON') {
                          handleViewInvoiceDetails(invoice.id);
                        }
                      }}
                    >
                      <td className="fw-bold cell-padded">{formatInvoiceId(invoice.id)}</td>
                      <td className="cell-padded">{invoice.customerName}</td>
                      <td className={`fw-bold cell-padded ${invoice.paymentMethod === 'Pay Later' ? 'text-warning' : ''}`}>
                        {invoice.paymentMethod || 'Cash'}
                      </td>
                      <td className={`price-text fw-bold cell-padded ${invoice.isReturn ? 'text-danger' : 'text-success'}`}>
                        {formatMoney(invoice.finalTotal || invoice.totalAmount)}
                      </td>
                      <td className="cell-padded">{new Date(invoice.orderDate).toLocaleString()}</td>
                      <td className="cell-padded">
                        <div className="btn-group">
                          {!invoice.isReturn && (
                            <>
                              <button 
                                className="btn btn-warning" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleEditSale(invoice); 
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-danger" 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleInitiateReturn(invoice); 
                                }}
                              >
                                Return
                              </button>
                            </>
                          )}
                        </div>
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

        {/* --- INTERFACE PATH TARGET: EDIT HISTORY LOGS --- */}
        {view === 'edit-history' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Sales Edit History</h2>
              <input 
                type="text" 
                className="form-control header-search" 
                placeholder="Search customer or ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="table-responsive">
              <table className="block-table data-table">
                <thead>
                  <tr>
                    <th>Edit Date</th>
                    <th>Original Bill ID</th>
                    <th>Customer Name</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoiceHistory.length ? paginatedInvoiceHistory.map(log => (
                    <tr key={log.id} className="product-row available">
                      <td className="cell-padded">{new Date(log.editDate).toLocaleString()}</td>
                      <td className="fw-bold cell-padded">{formatInvoiceId(log.originalInvoiceId)}</td>
                      <td className="cell-padded">{log.customerName}</td>
                      <td className="cell-padded">
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setViewingHistoryLog(log)}
                        >
                          View Comparison
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="empty-state">No edit history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredInvoiceHistory.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: INVENTORY HISTORY LOGS --- */}
        {view === 'inventory-history' && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title mb-0">Inventory Movement History</h2>
              <input 
                type="text" 
                className="form-control header-search" 
                placeholder="Search products or actions..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="table-responsive">
              <table className="block-table data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Qty Changed</th>
                    <th>Final Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventoryHistory.length ? paginatedInventoryHistory.map(log => (
                    <tr key={log.id} className="product-row available">
                      <td className="cell-padded">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="fw-bold cell-padded">{log.productName}</td>
                      <td className="cell-padded"><span className="badge">{log.actionType}</span></td>
                      <td className="text-muted cell-padded">{log.description}</td>
                      <td className={`fw-bold cell-padded ${log.quantityChanged > 0 ? 'text-success' : 'text-danger'}`}>
                        {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                      </td>
                      <td className="fw-bold cell-padded">{log.finalStock}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="empty-state">No inventory history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filteredInventoryHistory.length)}
          </div>
        )}

        {/* --- INTERFACE PATH TARGET: RETURN BILL PROCESSOR --- */}
        {view === 'return-sale' && returnSaleData && returnMath && (
          <div className="card">
            <div className="card-header header-actions">
              <h2 className="card-title text-danger">
                Process Return: Bill {formatInvoiceId(returnSaleData.id)}
              </h2>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setReturnSaleData(null)
                  setView('invoices') 
                }}
              >
                Cancel Return
              </button>
            </div>

            <div className="invoice-summary-grid margin-top-large">
              <div className="info-block">
                <span className="info-label">Customer</span>
                <strong className="info-value">{returnSaleData.customerName}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Original Date</span>
                <strong className="info-value">{new Date(returnSaleData.orderDate).toLocaleString()}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Original Total</span>
                <strong className="info-value text-success">{formatMoney(returnSaleData.finalTotal)}</strong>
              </div>
            </div>

            <div className="table-responsive table-margin-bottom">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Purchased Qty</th>
                    <th>Return Qty</th>
                    <th>Return Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {returnSaleData.returnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="product-name-large">
                          {item.product.name}
                        </span>
                      </td>
                      <td>{formatMoney(item.price)}</td>
                      <td className="fw-bold fs-lg">{item.quantity}</td>
                      <td>
                        <input
                          type="number"
                          className="quantity-input form-control mb-0 qty-input-large"
                          min="0"
                          max={item.quantity}
                          value={item.returnQty}
                          onChange={e => {
                            let val = e.target.value;
                            if (val !== '') {
                              val = Number(val);
                              if (val > item.quantity) val = item.quantity;
                              if (val < 0) val = 0;
                            }
                            setReturnSaleData(prev => {
                              const newItems = [...prev.returnItems];
                              newItems[idx].returnQty = val;
                              return { ...prev, returnItems: newItems };
                            });
                          }}
                          onBlur={e => {
                            if (e.target.value === '' || Number(e.target.value) < 0) {
                              setReturnSaleData(prev => {
                                const newItems = [...prev.returnItems];
                                newItems[idx].returnQty = 0;
                                return { ...prev, returnItems: newItems };
                              });
                            }
                          }}
                        />
                      </td>
                      <td className="price-text text-danger fw-bold">
                        -{formatMoney(item.price * (Number(item.returnQty) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-math-wrapper">
              <div className="receipt-panel full-width-panel border-danger">
                <div className="receipt-row receipt-three-col">
                  <span className="fw-bold">Return Subtotal:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right text-danger">-{formatMoney(returnMath.subtotal)}</span>
                </div>
                
                {returnSaleData.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red">
                    <span className="fw-bold">Return Discount:</span>
                    <span className="text-center text-muted">{returnSaleData.discountPercent}%</span>
                    <span className="text-right text-success">
                      +{formatMoney(returnMath.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Subtotal (Excl. Tax):</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right text-danger">-{formatMoney(returnMath.taxableAmount)}</span>
                </div>

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Return CGST / SGST:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right text-danger">
                    -{formatMoney(returnMath.cgst + returnMath.sgst)}
                  </span>
                </div>

                <div className="receipt-total receipt-three-col border-top-danger">
                  <span>Total Refund Amount:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right text-danger">-{formatMoney(returnMath.finalTotal)}</span>
                </div>

                <div className="modal-actions return-actions">
                  <button 
                    className="btn btn-warning p-1" 
                    onClick={handleReturnAllItems}
                  >
                    Select All Items (Return All)
                  </button>
                  <button 
                    className="btn btn-danger btn-checkout mt-0 flex-1" 
                    onClick={submitReturn}
                    disabled={returnMath.finalTotal === 0}
                  >
                    Confirm & Process Return
                  </button>
                </div>
              </div>
            </div>
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
                <strong className={`info-value ${selectedInvoice.paymentMethod === 'Pay Later' ? 'text-warning' : 'text-primary'}`}>
                  {selectedInvoice.paymentMethod || 'Cash'}
                </strong>
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
                      <td>
                        <span className="product-name-large">
                          {item.product.name}
                        </span>
                      </td>
                      <td>{formatMoney(item.price)}</td>
                      <td className="fw-bold fs-lg">{item.quantity}</td>
                      <td className="price-text">{formatMoney(item.price * item.quantity)}</td>
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
                  <span className="text-right">{formatMoney(selectedInvoiceMath.subtotal)}</span>
                </div>
                
                {selectedInvoiceMath.discountPercent > 0 && (
                  <div className="receipt-row receipt-three-col highlight-red">
                    <span className="fw-bold">Discount:</span>
                    <span className="text-center text-muted">{selectedInvoiceMath.discountPercent}%</span>
                    <span className="text-right text-danger">
                      -{formatMoney(selectedInvoiceMath.discountAmount)}
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
                      <span className="text-muted">Subtotal (Excl. Tax):</span>
                      <span className="text-center text-muted"></span>
                      <span className="text-right">{formatMoney(selectedInvoiceMath.taxableAmount)}</span>
                    </div>

                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">CGST:</span>
                      <span className="text-center text-muted">
                        {selectedInvoiceMath.cgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(selectedInvoiceMath.cgst)}</span>
                    </div>
                    
                    <div className="receipt-row receipt-three-col">
                      <span className="text-muted">SGST:</span>
                      <span className="text-center text-muted">
                        {selectedInvoiceMath.sgstPercent.toFixed(1).replace('.0', '')}%
                      </span>
                      <span className="text-right">+{formatMoney(selectedInvoiceMath.sgst)}</span>
                    </div>
                  </>
                )}

                <div className="receipt-row receipt-three-col">
                  <span className="text-muted">Roundoff:</span>
                  <span className="text-center text-muted"></span>
                  <span className="text-right">
                    {selectedInvoiceMath.roundoff > 0 ? '+' : ''}
                    {formatMoney(selectedInvoiceMath.roundoff)}
                  </span>
                </div>
                
                <div className="receipt-total receipt-three-col">
                  <span>Final Total:</span>
                  <span className="text-center text-muted"></span>
                  <span className={`fw-bold text-right ${selectedInvoice.isReturn ? 'text-danger' : 'text-success'}`}>
                    {formatMoney(selectedInvoiceMath.finalTotal)}
                  </span>
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
              <table className="block-table data-table">
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
                    <tr key={product.id} className="product-row available">
                      <td className="fw-bold cell-padded">{formatProductId(product.id)}</td>
                      <td className="fw-bold cell-padded">{product.name}</td>
                      <td className="cell-padded">{product.hsnCode || 'N/A'}</td>
                      <td className={`fw-bold fs-lg cell-padded ${product.stock > 10 ? 'text-success' : (product.stock > 0 ? 'text-warning' : 'text-danger')}`}>
                        {product.stock} {product.stock <= 0 && '(Out of Stock)'}
                      </td>
                      <td className="cell-padded">
                        <button 
                          className="btn btn-warning" 
                          onClick={() => openInventoryModal(product)}
                        >
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
                placeholder="Search name, phone, GST, location..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <button 
                className="btn btn-primary" 
                onClick={() => { 
                  setIsCustomerEditMode(false)
                  setCustomerForm({ 
                    name: '', 
                    gstno: '', 
                    mobile: '', 
                    city: '', 
                    location: '', 
                    balance: 0, 
                    state: '' 
                  })
                  setShowCustomerModal(true) 
                }}
              >
                + Add New Customer
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="block-table data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>Contact</th>
                    <th>Location Details</th>
                    <th>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.length ? paginatedCustomers.map((c, index) => (
                    <tr key={c.id} className="product-row available">
                      <td className="cell-padded">{indexOfFirstItem + index + 1}</td>
                      <td className="fw-bold cell-padded">
                        {c.name}
                        {c.gstno && <div className="text-muted fs-sm">GST: {c.gstno}</div>}
                      </td>
                      <td className="cell-padded">{c.mobile}</td>
                      <td className="cell-padded">
                        {c.city || 'No City'}
                        {(c.location || c.state) && (
                          <div className="text-muted fs-sm">
                            {[c.location, c.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className={`fw-bold cell-padded ${c.balance > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatMoney(c.balance)}
                      </td>
                      <td className="cell-padded">
                        <div className="btn-group">
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => setViewingCustomer(c)}
                          >
                            View
                          </button>
                          <button 
                            className="btn btn-warning" 
                            onClick={() => { 
                              setIsCustomerEditMode(true)
                              setEditingCustomerId(c.id)
                              setCustomerForm({ 
                                name: c.name, 
                                gstno: c.gstno || '', 
                                mobile: c.mobile || '', 
                                city: c.city || '',
                                location: c.location || '',
                                balance: c.balance || 0,
                                state: c.state || ''
                              })
                              setShowCustomerModal(true) 
                            }}
                          >
                            Edit
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
                  setProductForm({ 
                    name: '', 
                    hsnCode: '', 
                    purchasePrice: '', 
                    mrp: '', 
                    price: '', 
                    stock: '' 
                  })
                  setShowProductModal(true) 
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
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => setViewingProduct(product)}
                          >
                            View
                          </button>
                          <button 
                            className="btn btn-warning" 
                            onClick={() => { 
                              setIsEditMode(true)
                              setEditingProductId(product.id)
                              setProductForm({ 
                                name: product.name, 
                                hsnCode: product.hsnCode || '',
                                purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '0', 
                                mrp: product.mrp ? product.mrp.toString() : product.price.toString(),
                                price: product.price.toString(), 
                                stock: product.stock.toString() 
                              })
                              setShowProductModal(true) 
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
            {renderPagination(filteredProducts.length)}
          </div>
        )}
      </main>

      {/* =========================================
          --- SYSTEM INTERACTIVE OVERLAYS ---
          ========================================= */}
      
      {/* Detailed Edit History Comparison Modal */}
      {viewingHistoryLog && (
        <div className="modal-overlay">
          <div className="modal-content modal-large-auto">
            <h3 className="modal-header-title">Edit History Comparison</h3>
            <p className="text-dark-muted mb-0">
              Bill: <strong>{formatInvoiceId(viewingHistoryLog.originalInvoiceId)}</strong> | 
              Edited On: {new Date(viewingHistoryLog.editDate).toLocaleString()}
            </p>

            <div className="comparison-grid">
              
              {/* OLD SNAPSHOT */}
              <div className="receipt-panel snapshot-old">
                <h4 className="snapshot-title-old">
                  Old Bill Snapshot
                </h4>
                <div className="comparison-total-row">
                  <span className="fw-bold">Total Amount:</span>
                  <span className="fw-bold text-danger">{formatMoney(viewingHistoryLog.oldFinalTotal)}</span>
                </div>
                <table className="data-table comparison-table">
                  <thead>
                    <tr>
                      <th className="th-old">Product</th>
                      <th className="th-old">Qty</th>
                      <th className="th-old">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderHistoryItems(viewingHistoryLog.oldItemsJson)}
                  </tbody>
                </table>
              </div>

              {/* NEW SNAPSHOT */}
              <div className="receipt-panel snapshot-new">
                <h4 className="snapshot-title-new">
                  New Bill Snapshot
                </h4>
                <div className="comparison-total-row">
                  <span className="fw-bold">Total Amount:</span>
                  <span className="fw-bold text-success">{formatMoney(viewingHistoryLog.newFinalTotal)}</span>
                </div>
                <table className="data-table comparison-table">
                  <thead>
                    <tr>
                      <th className="th-new">Product</th>
                      <th className="th-new">Qty</th>
                      <th className="th-new">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderHistoryItems(viewingHistoryLog.newItemsJson)}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="modal-actions center-actions mt-2">
              <button 
                onClick={() => setViewingHistoryLog(null)} 
                className="btn btn-secondary w-100"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {viewingCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">Customer Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block">
                <span className="info-label">Name</span>
                <strong className="info-value">{viewingCustomer.name}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">GST No</span>
                <strong className="info-value">{viewingCustomer.gstno || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Mobile</span>
                <strong className="info-value">{viewingCustomer.mobile || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">City</span>
                <strong className="info-value">{viewingCustomer.city || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Location</span>
                <strong className="info-value">{viewingCustomer.location || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">State</span>
                <strong className="info-value">{viewingCustomer.state || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Ledger Balance</span>
                <strong className={`info-value ${viewingCustomer.balance > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatMoney(viewingCustomer.balance)}
                </strong>
              </div>
            </div>
            <div className="modal-actions center-actions">
              <button 
                onClick={() => setViewingCustomer(null)} 
                className="btn btn-secondary w-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-title">Product Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block">
                <span className="info-label">Product ID</span>
                <strong className="info-value">{formatProductId(viewingProduct.id)}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Name</span>
                <strong className="info-value">{viewingProduct.name}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">HSN Code</span>
                <strong className="info-value">{viewingProduct.hsnCode || 'N/A'}</strong>
              </div>
              <div className="info-block">
                <span className="info-label">Purchase Price</span>
                <strong className="info-value text-warning">
                  {formatMoney(viewingProduct.purchasePrice)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">MRP (Max Retail Price)</span>
                <strong className="info-value text-muted text-strike">
                  {formatMoney(viewingProduct.mrp || viewingProduct.price)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">Selling Price</span>
                <strong className="info-value text-success">
                  {formatMoney(viewingProduct.price)}
                </strong>
              </div>
              <div className="info-block">
                <span className="info-label">Current Stock</span>
                <strong className={`info-value ${viewingProduct.stock > 10 ? 'text-success' : 'text-danger'}`}>
                  {viewingProduct.stock} Units
                </strong>
              </div>
            </div>
            <div className="modal-actions center-actions">
              <button 
                onClick={() => setViewingProduct(null)} 
                className="btn btn-secondary w-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Add Product To Sales Cart Modal */}
      {showAddProductModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="card-header header-actions border-none pb-0">
              <h3 className="modal-header-title mb-0">Select Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setShowAddProductModal(false); 
                  setSearchQuery(''); 
                }}
              >
                Close
              </button>
            </div>
            <div className="form-group mt-1">
              <input 
                type="text" 
                className="form-control mb-0" 
                placeholder="Search product name, HSN code or Product ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="table-responsive modal-scroll-area-nobottom">
              <table className="block-table data-table table-fixed">
                <thead>
                  <tr>
                    <th className="col-15">ID</th>
                    <th className="col-30">Product Name</th>
                    <th className="col-15">HSN Code</th>
                    <th className="col-10">MRP</th>
                    <th className="col-15">Selling Price</th>
                    <th className="col-15">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const cartItem = cart.find(c => c.id === product.id)
                    const inCartQty = cartItem ? (Number(cartItem.quantity) || 0) : 0
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
                        <td className="text-muted cell-padded text-strike">
                          {formatMoney(product.mrp || product.price)}
                        </td>
                        <td className="price-text cell-padded">{formatMoney(product.price)}</td>
                        <td className={`fw-bold cell-padded ${isOutOfStock ? 'text-danger' : 'text-success'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${availableStock} Units`}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-state">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Product To Purchase Cart Modal */}
      {showAddPurchaseProductModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="card-header header-actions border-none pb-0">
              <h3 className="modal-header-title mb-0">Select Purchase Products</h3>
              <button 
                className="btn btn-secondary action-buttons-right" 
                onClick={() => { 
                  setShowAddPurchaseProductModal(false); 
                  setSearchQuery('');
                }}
              >
                Close
              </button>
            </div>
            <div className="form-group mt-1">
              <input 
                type="text" 
                className="form-control mb-0" 
                placeholder="Search product name, HSN code or Product ID..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="table-responsive modal-scroll-area-nobottom">
              <table className="block-table data-table table-fixed">
                <thead>
                  <tr>
                    <th className="col-20">ID</th>
                    <th className="col-35">Product Name</th>
                    <th className="col-15">HSN Code</th>
                    <th className="col-15">Buy Price</th>
                    <th className="col-15">Stock</th>
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
                        {formatMoney(product.purchasePrice)}
                      </td>
                      <td className="fw-bold cell-padded text-dark-muted">{product.stock} Units</td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">No products found.</td>
                    </tr>
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
              <button 
                onClick={closeInventoryModal} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInventory} 
                className="btn btn-success"
              >
                Save Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Global Catalog Product Configurator Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">
              {isEditMode ? 'Edit Product Details' : 'Add New Product'}
            </h3>
            
            <div className="modal-scroll-area">
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
                <label className="form-label">Purchase Price (Wholesale):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.purchasePrice} 
                  onChange={e => setProductForm({ ...productForm, purchasePrice: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">MRP (Max Retail Price):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={productForm.mrp} 
                  onChange={e => setProductForm({ ...productForm, mrp: e.target.value })} 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Selling Price (Our Price):</label>
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
            </div>
            
            <div className={`modal-actions modal-footer-actions ${isEditMode ? 'justify-between' : 'justify-end'}`}>
              {isEditMode && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteProduct(editingProductId, productForm.name)}
                >
                  Delete
                </button>
              )}
              <div className="flex-gap-1">
                <button 
                  onClick={closeProductModal} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProduct} 
                  className="btn btn-success"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Global CRM Identity Overlay */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">
              {isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            
            <div className="modal-scroll-area">
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

              <div className="form-group">
                <label className="form-label">Location:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.location} 
                  onChange={e => setCustomerForm({ ...customerForm, location: e.target.value })} 
                  placeholder="Enter Location/Area" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">State:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={customerForm.state} 
                  onChange={e => setCustomerForm({ ...customerForm, state: e.target.value })} 
                  placeholder="Enter State" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ledger Balance (₹):</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={customerForm.balance} 
                  onChange={e => setCustomerForm({ ...customerForm, balance: Number(e.target.value) })} 
                  placeholder="0.00" 
                />
              </div>
            </div>
            
            <div className={`modal-actions modal-footer-actions ${isCustomerEditMode ? 'justify-between' : 'justify-end'}`}>
              {isCustomerEditMode && (
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteCustomer(editingCustomerId, customerForm.name)}
                >
                  Delete
                </button>
              )}
              <div className="flex-gap-1">
                <button 
                  onClick={closeCustomerModal} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCustomer} 
                  className="btn btn-success"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}