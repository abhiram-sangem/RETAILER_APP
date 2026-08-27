import React, { useState } from 'react';
import { formatMoney } from '../utils/formatters';
import { customerService } from '../services/api';
import Pagination from '../components/Pagination';

export default function CustomerManager({ customers, loadCustomers }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({ 
    name: '', gstno: '', mobile: '', city: '', location: '', state: ''
  });

  // Filter & Pagination Logic
  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(safeSearch)) ||
    (c.mobile && c.mobile.includes(safeSearch)) ||
    (c.city && c.city.toLowerCase().includes(safeSearch)) ||
    (c.location && c.location.toLowerCase().includes(safeSearch)) ||
    (c.gstno && c.gstno.toLowerCase().includes(safeSearch))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  // Handlers
  const handleSaveCustomer = () => {
    const { name, gstno, mobile, city, location, state } = customerForm;
    if (!name?.trim()) return window.alert('Name is required');
    
    const existingBalance = isCustomerEditMode ? (customers.find(c => c.id === editingCustomerId)?.balance || 0) : 0;

    const action = isCustomerEditMode
      ? customerService.updateCustomer(editingCustomerId, name, gstno, mobile, city, location, existingBalance, state)
      : customerService.addCustomer(name, gstno, mobile, city, location, existingBalance, state);
      
    action.then(() => { loadCustomers(); closeCustomerModal(); });
  };

  const handleDeleteCustomer = (id, name) => {
    if (window.confirm(`Are you sure you want to completely delete customer "${name}"? This cannot be undone.`)) {
      customerService.deleteCustomer(id).then(() => { loadCustomers(); closeCustomerModal(); });
    }
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setCustomerForm({ name: '', gstno: '', mobile: '', city: '', location: '', state: '' });
  };

  return (
    <>
      <div className="card">
        <div className="card-header header-actions">
          <h2 className="card-title mb-0">Customer Management</h2>
          <input 
            type="text" 
            className="form-control header-search search-expanded" 
            placeholder="Search name, phone, GST, location..." 
            value={searchQuery} 
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
          />
          <button 
            className="btn btn-primary" 
            onClick={() => { 
              setIsCustomerEditMode(false);
              setCustomerForm({ name: '', gstno: '', mobile: '', city: '', location: '', state: '' });
              setShowCustomerModal(true); 
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
                  <td className="cell-padded">
                    <div className="btn-group">
                      <button className="btn btn-secondary" onClick={() => setViewingCustomer(c)}>View Details</button>
                      <button 
                        className="btn btn-warning" 
                        onClick={() => { 
                          setIsCustomerEditMode(true);
                          setEditingCustomerId(c.id);
                          setCustomerForm({ 
                            name: c.name, gstno: c.gstno || '', mobile: c.mobile || '', 
                            city: c.city || '', location: c.location || '', state: c.state || ''
                          });
                          setShowCustomerModal(true); 
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="empty-state">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination totalItems={filteredCustomers.length} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* --- MODALS --- */}
      {viewingCustomer && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Customer Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block"><span className="info-label">Name</span><strong className="info-value">{viewingCustomer.name}</strong></div>
              <div className="info-block"><span className="info-label">GST No</span><strong className="info-value">{viewingCustomer.gstno || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Mobile</span><strong className="info-value">{viewingCustomer.mobile || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">City</span><strong className="info-value">{viewingCustomer.city || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Location</span><strong className="info-value">{viewingCustomer.location || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">State</span><strong className="info-value">{viewingCustomer.state || 'N/A'}</strong></div>
            </div>
            <div className="modal-actions center-actions mt-1">
              <button onClick={() => setViewingCustomer(null)} className="btn btn-secondary w-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">{isCustomerEditMode ? 'Edit Customer' : 'Add New Customer'}</h3>
            <div className="modal-scroll-area">
              <div className="form-group"><label className="form-label">Customer Name:</label><input type="text" className="form-control" value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="Enter customer name" /></div>
              <div className="form-group"><label className="form-label">GST No:</label><input type="text" className="form-control" value={customerForm.gstno} onChange={e => setCustomerForm({ ...customerForm, gstno: e.target.value })} placeholder="Enter GST Number" /></div>
              <div className="form-group"><label className="form-label">Mobile:</label><input type="text" className="form-control" value={customerForm.mobile} onChange={e => setCustomerForm({ ...customerForm, mobile: e.target.value })} placeholder="Enter Mobile Number" /></div>
              <div className="form-group"><label className="form-label">City:</label><input type="text" className="form-control" value={customerForm.city} onChange={e => setCustomerForm({ ...customerForm, city: e.target.value })} placeholder="Enter City" /></div>
              <div className="form-group"><label className="form-label">Location:</label><input type="text" className="form-control" value={customerForm.location} onChange={e => setCustomerForm({ ...customerForm, location: e.target.value })} placeholder="Enter Location/Area" /></div>
              <div className="form-group"><label className="form-label">State:</label><input type="text" className="form-control" value={customerForm.state} onChange={e => setCustomerForm({ ...customerForm, state: e.target.value })} placeholder="Enter State" /></div>
            </div>
            <div className={`modal-actions modal-footer-actions ${isCustomerEditMode ? 'justify-between' : 'justify-end'}`}>
              {isCustomerEditMode && <button className="btn btn-danger" onClick={() => handleDeleteCustomer(editingCustomerId, customerForm.name)}>Delete</button>}
              <div className="flex-gap-1">
                <button onClick={closeCustomerModal} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveCustomer} className="btn btn-success">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}