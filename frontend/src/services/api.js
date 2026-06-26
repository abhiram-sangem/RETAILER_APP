const API_URL = import.meta.env.VITE_API_URL

export const productService = {
  getProducts: () =>
    fetch(`${API_URL}/api/products`).then(res => {
      if (!res.ok) throw new Error('Failed to load products')
      return res.json()
    }),

  addProduct: (name, price) =>
    fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, quantity: 0 }),
    }).then(res => {
      if (!res.ok) throw new Error('Failed to add product')
      return res.json()
    }),

  updateProduct: (id, name, price) =>
    fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, quantity: 0 }),
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
  create: (customerName, cartItems) =>
    fetch(`${API_URL}/api/invoices/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, cartItems }),
    }).then(res => {
      if (!res.ok) throw new Error('Invoice creation failed')
      return res.json()
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
