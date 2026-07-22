const API_URL = import.meta.env.VITE_API_URL

export const productService = {
  getProducts: () =>
    fetch(`${API_URL}/api/products`).then(res => {
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    }),

  addProduct: (name, purchasePrice, price, stock, hsnCode) =>
    fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        purchasePrice, 
        price, 
        stock,
        hsnCode
      }), 
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add product')
      return res.json()
    }),

  updateProduct: (id, name, purchasePrice, price, stock, hsnCode) =>
    fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        purchasePrice, 
        price, 
        stock,
        hsnCode
      }), 
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update product')
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
  create: (customerName, cartItems, grossTotal, discountPercent, cgst, sgst, finalTotal, paymentMethod, orderDate) =>
    fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customerName, 
        // FIX: Strip out extra product details, only send exactly what Java needs
        cartItems: cartItems.map(item => ({ 
          id: item.id, 
          quantity: item.quantity, 
          price: item.price 
        })), 
        grossTotal, 
        discountPercent, 
        cgst, 
        sgst, 
        finalTotal,
        paymentMethod,
        orderDate
      }),
    }).then(async res => {
      if (!res.ok) {
        // This will grab the exact red error text from Spring Boot
        const errText = await res.text();
        throw new Error(errText || 'Invoice creation failed');
      }
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
    }),
}

export const customerService = {
  getCustomers: () =>
    fetch(`${API_URL}/api/customers`).then(res => {
      if (!res.ok) throw new Error('Failed to load customers')
      return res.json()
    }),

  addCustomer: (name, gstno, mobile, city) =>
    fetch(`${API_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        gstno, 
        mobile, 
        city 
      }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add customer')
      return res.json()
    }),

  updateCustomer: (id, name, gstno, mobile, city) =>
    fetch(`${API_URL}/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        gstno, 
        mobile, 
        city 
      }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to update customer')
      return res.json()
    }),

  deleteCustomer: (id) =>
    fetch(`${API_URL}/api/customers/${id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error('Failed to delete customer')
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

  create: (sellerName, purchaseDate, customInvoiceId, purchaseCart, grossTotal, discountPercent, cgst, sgst, finalTotal) =>
    fetch(`${API_URL}/api/purchase-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerName,
        purchaseDate,
        customInvoiceId,
        grossTotal,
        discountPercent,
        cgst,
        sgst,
        finalTotal,
        items: purchaseCart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice
        }))
      }),
    }).then(async res => {
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Purchase invoice creation failed');
      }
      return res.json()
    }),
}