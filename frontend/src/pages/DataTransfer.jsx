import React from 'react';
import * as XLSX from 'xlsx';
import { formatProductId } from '../utils/formatters';
import { customerService, productService } from '../services/api';

export default function DataTransfer({ customers, products, loadCustomers, loadProducts, loadHistory }) {

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
      } catch (err) { window.alert("Error parsing Excel file: " + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) return window.alert("No customers to export.");
    const dataToExport = customers.map(c => ({
      'Customer ID': c.id, 'Name': c.name, 'Phone Number': c.mobile, 'City': c.city,
      'Location': c.location, 'State': c.state, 'GST': c.gstno, 'Balance': c.balance
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            id: parsedId, name: row.Name || row.name || 'Unknown Product',
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
            loadProducts(); loadHistory(); 
          })
          .catch(err => window.alert("Failed to import products: " + err.message));
      } catch (err) { window.alert("Error parsing Excel file: " + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; 
  };

  const handleExportProducts = () => {
    if (products.length === 0) return window.alert("No products to export.");
    const dataToExport = products.map(p => ({
      'Product ID': formatProductId(p.id), 'Name': p.name, 'HSN Code': p.hsnCode,
      'Purchase Price': p.purchasePrice, 'MRP': p.mrp || p.price, 'Selling Price': p.price, 'Stock': p.stock
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `Products_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="card bg-transparent">
      <div className="reports-layout">
        <div className="card mb-0">
          <div className="card-header"><h2 className="card-title">Customer Database</h2></div>
          <div className="dashboard-stats-grid single-col mt-1">
            <div className="card stat-card report-card report-card-export">
              <h4>Export Customers</h4>
              <p className="text-muted mb-1-5">Download a complete backup of all your customers and their ledger balances.</p>
              <div className="mt-auto">
                <button className="btn btn-primary w-100" onClick={handleExportCustomers}>Download Excel Backup</button>
              </div>
            </div>
            <div className="card stat-card report-card report-card-import">
              <h4>Import & Update Customers</h4>
              <p className="text-muted mb-1-5">Upload Excel file to add new customers or update existing ones (matches by Phone/Name).</p>
              <div className="mt-auto">
                <input type="file" id="excel-upload-customers" accept=".xlsx, .xls" className="d-none" onChange={handleImportCustomers} />
                <label htmlFor="excel-upload-customers" className="btn btn-success w-100 d-block cursor-pointer">Select Excel File</label>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-0">
          <div className="card-header"><h2 className="card-title">Product Database</h2></div>
          <div className="dashboard-stats-grid single-col mt-1">
            <div className="card stat-card report-card report-card-export-prod">
              <h4>Export Products</h4>
              <p className="text-muted mb-1-5">Download a complete list of your products, prices, and current stock levels.</p>
              <div className="mt-auto">
                <button className="btn btn-warning w-100" onClick={handleExportProducts}>Download Excel Backup</button>
              </div>
            </div>
            <div className="card stat-card report-card report-card-import-prod">
              <h4>Import & Update Products</h4>
              <p className="text-muted mb-1-5">Upload Excel file to add new products or update prices/stock (matches by ID/Name).</p>
              <div className="mt-auto">
                <input type="file" id="excel-upload-products" accept=".xlsx, .xls" className="d-none" onChange={handleImportProducts} />
                <label htmlFor="excel-upload-products" className="btn btn-purple w-100 d-block cursor-pointer">Select Excel File</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}