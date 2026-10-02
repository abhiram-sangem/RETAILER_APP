import React, { useState, useEffect } from 'react';
import { employeeService } from '../services/api';
import Pagination from '../components/Pagination';

export default function EmployeeManager({ employees, loadEmployees }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({ 
    name: '', phone: '', email: '', role: '', salary: '', address: '', joinDate: '', status: 'Active'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage]);

  const safeSearch = (searchQuery || '').toLowerCase();
  const filteredEmployees = employees.filter(e =>
    (e.name && e.name.toLowerCase().includes(safeSearch)) ||
    (e.phone && e.phone.includes(safeSearch)) ||
    (e.role && e.role.toLowerCase().includes(safeSearch))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;

  function handleSave() {
    if (!form.name?.trim() || !form.role?.trim()) return window.alert('Name and Role are required.');
    
    const payload = { ...form, salary: Number(form.salary) || 0 };

    const action = isEditMode
      ? employeeService.updateEmployee(editingId, payload)
      : employeeService.addEmployee(payload);
      
    action.then(() => { loadEmployees(); closeModal(); })
          .catch(err => window.alert('Error: ' + err.message));
  }

  function handleDelete(id, name) {
    if (window.confirm(`Are you sure you want to completely delete employee "${name}"?`)) {
      employeeService.deleteEmployee(id).then(() => { loadEmployees(); closeModal(); });
    }
  }

  function closeModal() {
    setShowModal(false);
    setForm({ name: '', phone: '', email: '', role: '', salary: '', address: '', joinDate: '', status: 'Active' });
  }

  return (
    <div className="card">
      <div className="card-header header-actions">
        <h2 className="card-title mb-0">Staff & Employees</h2>
        <input 
          type="text" className="form-control header-search search-expanded" 
          placeholder="Search name, phone, role..." 
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
        />
        <button 
          className="btn btn-primary" 
          onClick={() => { 
            setIsEditMode(false);
            setForm({ name: '', phone: '', email: '', role: '', salary: '', address: '', joinDate: new Date().toISOString().split('T')[0], status: 'Active' });
            setShowModal(true);
          }}
        >
          + Add Employee
        </button>
      </div>
      
      <div className="table-responsive">
        <table className="block-table data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role / Position</th>
              <th>Contact</th>
              <th>Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.length ? paginatedEmployees.map(emp => (
              <tr key={emp.id} className="product-row available">
                <td className="fw-bold cell-padded">{emp.name}</td>
                <td className="cell-padded">{emp.role}</td>
                <td className="cell-padded">{emp.phone || 'N/A'}</td>
                <td className="cell-padded text-success fw-bold">₹ {emp.salary ? emp.salary.toLocaleString('en-IN') : '0'}</td>
                <td className="cell-padded">
                  <span className={`badge ${emp.status === 'Active' ? 'btn-success text-white' : 'bg-slate-200'}`}>{emp.status}</span>
                </td>
                <td className="cell-padded">
                  <div className="btn-group">
                    <button className="btn btn-secondary" onClick={() => setViewingEmployee(emp)}>View</button>
                    <button className="btn btn-warning" onClick={() => { 
                      setIsEditMode(true); setEditingId(emp.id);
                      setForm({ 
                        name: emp.name, phone: emp.phone || '', email: emp.email || '', role: emp.role || '', 
                        salary: emp.salary || '', address: emp.address || '', joinDate: emp.joinDate || '', status: emp.status || 'Active'
                      });
                      setShowModal(true);
                    }}>Edit</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="empty-state">No employees found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pagination-wrapper">
        <div>
          <label className="fw-bold">Rows per page:</label>
          <select className="form-control mb-0 pagination-select" value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}>
            <option value={10}>10</option><option value={20}>20</option><option value={40}>40</option>
          </select>
        </div>
        <div className="pagination-info">
          <span className="pagination-text">Showing {filteredEmployees.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length}</span>
          <div className="btn-group">
            <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button className="btn btn-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* --- VIEW MODAL --- */}
      {viewingEmployee && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-small">
            <h3 className="modal-header-title">Employee Details</h3>
            <div className="invoice-summary-grid single-col-grid">
              <div className="info-block"><span className="info-label">Name</span><strong className="info-value">{viewingEmployee.name}</strong></div>
              <div className="info-block"><span className="info-label">Role</span><strong className="info-value">{viewingEmployee.role}</strong></div>
              <div className="info-block"><span className="info-label">Phone</span><strong className="info-value">{viewingEmployee.phone || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Salary</span><strong className="info-value text-success">₹ {viewingEmployee.salary?.toLocaleString('en-IN') || 0}</strong></div>
              <div className="info-block"><span className="info-label">Joining Date</span><strong className="info-value">{viewingEmployee.joinDate ? new Date(viewingEmployee.joinDate).toLocaleDateString('en-GB') : 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Address</span><strong className="info-value">{viewingEmployee.address || 'N/A'}</strong></div>
              <div className="info-block"><span className="info-label">Status</span><strong className="info-value">{viewingEmployee.status}</strong></div>
            </div>
            <div className="modal-actions mt-1"><button onClick={() => setViewingEmployee(null)} className="btn btn-secondary w-100">Close</button></div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="modal-overlay no-print">
          <div className="modal-content modal-medium">
            <h3 className="modal-header-title">{isEditMode ? 'Edit Employee' : 'Add Employee'}</h3>
            <div className="modal-scroll-area">
              <div className="sales-control-row">
                <div className="form-group" style={{flex: 1}}><label className="form-label">Full Name:</label><input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group" style={{flex: 1}}><label className="form-label">Role / Position:</label><input type="text" className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="e.g. Manager, Cashier" /></div>
              </div>
              <div className="sales-control-row">
                <div className="form-group" style={{flex: 1}}><label className="form-label">Phone:</label><input type="text" className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group" style={{flex: 1}}><label className="form-label">Email:</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div className="sales-control-row">
                <div className="form-group" style={{flex: 1}}><label className="form-label">Salary (₹):</label><input type="number" className="form-control" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
                <div className="form-group" style={{flex: 1}}><label className="form-label">Joining Date:</label><input type="date" className="form-control" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} /></div>
              </div>
              <div className="sales-control-row">
                <div className="form-group" style={{flex: 2}}><label className="form-label">Address:</label><input type="text" className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <div className="form-group" style={{flex: 1}}><label className="form-label">Status:</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`modal-actions modal-footer-actions ${isEditMode ? 'justify-between' : 'justify-end'}`}>
              {isEditMode && <button className="btn btn-danger" onClick={() => handleDelete(editingId, form.name)}>Delete</button>}
              <div className="flex-gap-1">
                <button onClick={closeModal} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSave} className="btn btn-success">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}