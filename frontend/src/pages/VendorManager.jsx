import React, { useState, useEffect } from 'react';
import { vendorService } from '../services/api';

export default function VendorManager({ vendors, loadVendors }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingVendor, setViewingVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isVendorEditMode, setIsVendorEditMode] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  
  const [vendorForm, setVendorForm] = useState({ 
    name: '', phone: '', gstno: '', address: '', city: '', balance: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredVendors = vendors.filter(v =>
    (v.name && v.name.toLowerCase().includes(safeSearch)) ||
    (v.phone && v.phone.includes(safeSearch)) ||
    (v.city && v.city.toLowerCase().includes(safeSearch)) ||
    (v.gstno && v.gstno.toLowerCase().includes(safeSearch))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedVendors = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);

  function handleSaveVendor() {
    const { name, phone, gstno, address, city } = vendorForm;
    if (!name?.trim()) return window.alert('Vendor Name is required');
    
    const existingBalance = isVendorEditMode ? (vendors.find(v => v.id === editingVendorId)?.balance || 0) : 0;

    const action = isVendorEditMode
      ? vendorService.updateVendor(editingVendorId, name, phone, gstno, address, city, existingBalance)
      : vendorService.addVendor(name, phone, gstno, address, city, existingBalance);
      
    action.then(() => { loadVendors(); closeVendorModal(); });
  }

  function handleDeleteVendor(id, name) {
    if (window.confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      vendorService.deleteVendor(id).then(() => { loadVendors(); closeVendorModal(); });
    }
  }

  function closeVendorModal() {
    setShowVendorModal(false);
    setVendorForm({ name: '', phone: '', gstno: '', address: '', city: '', balance: 0 });
  }

  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
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
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header header-actions">
        <h2 className="card-title mb-0">Vendor Management</h2>
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
            setIsVendorEditMode(false);
            setVendorForm({ name: '', phone: '', gstno: '', address: '', city: '', balance: 0 });
            setShowVendorModal(true);
          }}
        >
          + Add New Vendor
        </button>
      </div>
      
      <div className="table-responsive">
        <table className="block-table data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vendor Name</th>
              <th>Contact</th>
              <th>Location Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedVendors.length ? paginatedVendors.map((v, index) => (
              <tr key={v.id} className="product-row available">
                <td className="cell-padded">{indexOfFirstItem + index + 1}</td>
                <td className="fw-bold cell-padded">
                  {v.name}
                  {v.gstno && <div className="text-muted fs-sm">GST: {v.gstno}</div>}
                </td>
                <td className="cell-padded">{v.phone || 'N/A'}</td>
                <td className="cell-padded">
                  {v.city || 'No City'}
                  {v.address && <div className="text-muted fs-sm">{v.address}</div>}
                </td>
                <td className="cell-padded">
                  <div className="btn-group">
                    <button className="btn btn-secondary" onClick={() => setViewingVendor(v)}>
                      View Details
                    </button>
                    <button 
                      className="btn btn-warning" 
                      onClick={() => { 
                        setIsVendorEditMode(true);
                        setEditingVendorId(v.id);
                        setVendorForm({ 
                          name: v.name, phone: v.phone || '', gstno: v.gstno || '', 
                          address: v.address || '', city: v.city || '', balance: v.balance || 0
                        });
                        setShowVendorModal(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="empty-state">No vendors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {renderPagination(filteredVendors.length)}

      {/* --- MODALS --- */}
      {viewingVendor && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="modal-header-title">Vendor Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block"><span className="info-label">Vendor Name</span><strong className="info-value">{viewingVendor.name}</strong></div>
              <div className="info-block"><span className="info-label">GST No</span><strong className="info-value">{viewingVendor.gstno || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Phone</span><strong className="info-value">{viewingVendor.phone || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">City</span><strong className="info-value">{viewingVendor.city || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Address</span><strong className="info-value">{viewingVendor.address || 'N/A'}</strong></div>
            </div>
            <div className="modal-actions center-actions mt-1">
              <button onClick={() => setViewingVendor(null)} className="btn btn-secondary w-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {showVendorModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">{isVendorEditMode ? 'Edit Vendor' : 'Add New Vendor'}</h3>
            <div className="modal-scroll-area">
              <div className="form-group">
                <label className="form-label">Vendor Name:</label>
                <input type="text" className="form-control" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="Company name" />
              </div>
              <div className="form-group">
                <label className="form-label">GST No:</label>
                <input type="text" className="form-control" value={vendorForm.gstno} onChange={e => setVendorForm({ ...vendorForm, gstno: e.target.value })} placeholder="GST Number" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone:</label>
                <input type="text" className="form-control" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} placeholder="Phone Number" />
              </div>
              <div className="form-group">
                <label className="form-label">City:</label>
                <input type="text" className="form-control" value={vendorForm.city} onChange={e => setVendorForm({ ...vendorForm, city: e.target.value })} placeholder="City" />
              </div>
              <div className="form-group">
                <label className="form-label">Address:</label>
                <input type="text" className="form-control" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} placeholder="Full Address" />
              </div>
            </div>
            <div className={`modal-actions modal-footer-actions ${isVendorEditMode ? 'justify-between' : 'justify-end'}`}>
              {isVendorEditMode && <button className="btn btn-danger" onClick={() => handleDeleteVendor(editingVendorId, vendorForm.name)}>Delete</button>}
              <div className="flex-gap-1">
                <button onClick={closeVendorModal} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveVendor} className="btn btn-success">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}