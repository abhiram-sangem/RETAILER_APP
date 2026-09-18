const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const productService = {
  getProducts: () =>
    fetch(`${API_URL}/api/products`).then(res => {
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    }),

  addProduct: (name, purchasePrice, mrp, price, stock, hsnCode) =>
    fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, purchasePrice, mrp, price, stock, hsnCode }), 
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add product')
      return res.json()
    }),

  updateProduct: (id, name, purchasePrice, mrp, price, stock, hsnCode) =>
    fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, purchasePrice, mrp, price, stock, hsnCode }), 
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update product')
      return res.json()
    }),

  addProductsBulk: (productsArray) =>
    fetch(`${API_URL}/api/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productsArray),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to bulk import products')
      return res.json()
    }),

  deleteProduct: (id) =>
    fetch(`${API_URL}/api/products/${id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error('Failed to delete product')
    }),
}

export const invoiceService = {
  create: (customerName, cartItems, grossTotal, discountPercent, cgst, sgst, finalTotal, paymentMethod, orderDate, dueDays, customInvoiceId) =>
    fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         customerName, 
         cartItems: cartItems.map(item => ({ id: item.id || item.product?.id, quantity: item.quantity, price: item.price })), 
         grossTotal, discountPercent, cgst, sgst, finalTotal, paymentMethod, orderDate, dueDays, customInvoiceId 
      }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Invoice creation failed');
      return res.json();
    }),
  update: (id, customerName, cartItems, grossTotal, discountPercent, cgst, sgst, finalTotal, paymentMethod, orderDate, dueDays, customInvoiceId) =>
    fetch(`${API_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         customerName, 
         cartItems: cartItems.map(item => ({ id: item.id || item.product?.id, quantity: item.quantity, price: item.price })), 
         grossTotal, discountPercent, cgst, sgst, finalTotal, paymentMethod, orderDate, dueDays, customInvoiceId 
      }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Invoice update failed');
      return res.json();
    }),
  returnInvoice: (id, cartItems, grossTotal, discountPercent, cgst, sgst, finalTotal) =>
    fetch(`${API_URL}/api/invoices/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         cartItems: cartItems.map(item => ({ id: item.id || item.product?.id, quantity: item.quantity, price: item.price })), 
         grossTotal, discountPercent, cgst, sgst, finalTotal 
      }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Return processing failed');
      return res.json();
    }),
  getInvoices: () =>
    fetch(`${API_URL}/api/invoices`).then(res => {
      if (!res.ok) throw new Error('Failed to load invoices')
      return res.json()
    }),
  getInvoiceById: (id) =>
    fetch(`${API_URL}/api/invoices/${id}`).then(res => {
      if (!res.ok) throw new Error('Failed to load invoice')
      return res.json()
    })
};

export const customerService = {
  getCustomers: () =>
    fetch(`${API_URL}/api/customers`).then(res => {
      if (!res.ok) throw new Error('Failed to load customers')
      return res.json()
    }),

  addCustomer: (name, gstno, mobile, city, location, balance, state) =>
    fetch(`${API_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, gstno, mobile, city, location, balance, state }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add customer')
      return res.json()
    }),

  updateCustomer: (id, name, gstno, mobile, city, location, balance, state) =>
    fetch(`${API_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, gstno, mobile, city, location, balance, state }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update customer')
      return res.json()
    }),

  addCustomersBulk: (customersArray) =>
    fetch(`${API_URL}/api/customers/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customersArray),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to bulk import customers')
      return res.json()
    }),

  deleteCustomer: (id) =>
    fetch(`${API_URL}/api/customers/${id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error('Failed to delete customer')
    }),
}

export const vendorService = {
  getVendors: () =>
    fetch(`${API_URL}/api/vendors`).then(res => {
      if (!res.ok) throw new Error('Failed to load vendors')
      return res.json()
    }),

  addVendor: (name, phone, gstno, address, city, balance) =>
    fetch(`${API_URL}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, gstno, address, city, balance: balance || 0 }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add vendor')
      return res.json()
    }),

  updateVendor: (id, name, phone, gstno, address, city, balance) =>
    fetch(`${API_URL}/api/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, gstno, address, city, balance }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update vendor')
      return res.json()
    }),

  deleteVendor: (id) =>
    fetch(`${API_URL}/api/vendors/${id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error('Failed to delete vendor')
    }),
}

export const purchaseInvoiceService = {
  getPurchaseInvoices: () =>
    fetch(`${API_URL}/api/purchase-invoices`).then(res => {
      if (!res.ok) throw new Error('Failed to load purchase invoices')
      return res.json()
    }),

  getPurchaseInvoiceById: (id) =>
    fetch(`${API_URL}/api/purchase-invoices/${id}`).then(res => {
      if (!res.ok) throw new Error('Failed to load purchase invoice')
      return res.json()
    }),

  // VENDOR DATA INJECTED BELOW
  create: (sellerName, purchaseDate, customInvoiceId, purchaseCart, grossTotal, discountPercent, cgst, sgst, finalTotal, sellerPhone, sellerGst) =>
    fetch(`${API_URL}/api/purchase-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerName, purchaseDate, customInvoiceId, grossTotal, discountPercent, cgst, sgst, finalTotal,
        sellerPhone, sellerGst, // <--- New fields mapped here
        items: purchaseCart.map(item => ({ productId: item.id || item.product?.id, quantity: item.quantity, purchasePrice: item.purchasePrice }))
      }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Purchase invoice creation failed');
      return res.json()
    }),

  update: (id, sellerName, purchaseDate, customInvoiceId, purchaseCart, grossTotal, discountPercent, cgst, sgst, finalTotal, sellerPhone, sellerGst) =>
    fetch(`${API_URL}/api/purchase-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerName, purchaseDate, customInvoiceId, grossTotal, discountPercent, cgst, sgst, finalTotal,
        sellerPhone, sellerGst, // <--- New fields mapped here
        items: purchaseCart.map(item => ({ productId: item.id || item.product?.id, quantity: item.quantity, purchasePrice: item.purchasePrice }))
      }),
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Purchase invoice update failed');
      return res.json()
    }),
}

export const historyService = {
  getInventoryHistory: () =>
    fetch(`${API_URL}/api/history/inventory`).then(res => {
      if (!res.ok) throw new Error('Failed to load inventory history')
      return res.json()
    }),
  getInvoiceHistory: () =>
    fetch(`${API_URL}/api/history/invoices`).then(res => {
      if (!res.ok) throw new Error('Failed to load invoice history')
      return res.json()
    }),
  getPurchaseInvoiceHistory: () =>
    fetch(`${API_URL}/api/history/purchase-invoices`).then(res => {
      if (!res.ok) throw new Error('Failed to load purchase history')
      return res.json()
    })
}

export const receiptService = {
  create: (customerId, amount, discountAmount, paymentMode, receiptDate, remarks) =>
    fetch(`${API_URL}/api/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, amount, discountAmount, paymentMode, receiptDate, remarks })
    }).then(async res => {
      if (!res.ok) throw new Error(await res.text() || 'Failed to generate receipt');
      return res.json();
    }),

  getReceipts: () =>
    fetch(`${API_URL}/api/receipts`).then(res => {
      if (!res.ok) throw new Error('Failed to load receipts');
      return res.json();
    })
}