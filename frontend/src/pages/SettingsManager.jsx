import React, { useState, useEffect } from 'react';
import InvoiceBuilder from './InvoiceBuilder';

export default function SettingsManager() {
  const [activeTab, setActiveTab] = useState('topbar');
  const [config, setConfig] = useState(null);

  // Load the master config on boot
  useEffect(() => {
    const DEFAULT_CONFIG = {
      gstin: { x: 15, y: 20, width: 220, height: 30, fontSize: 12, fontFamily: 'Arial, sans-serif', text: 'GSTIN: 36AQOPM2633B1ZO' },
      business: { x: 209, y: 15, width: 300, height: 90, fontSize: 14, fontFamily: 'Arial, sans-serif', text: 'Invoice\nRamesh Enterprises\nShop No. 21/B, S.P.T Market, Nalgonda\nrameshenterprises.nalgonda@gmail.com\n9440970457' },
      logo: { x: 550, y: 15, width: 150, height: 60, url: 'https://via.placeholder.com/300x120.png?text=YOUR+LOGO' },
      divider1: { x: 0, y: 110, width: 716, type: 'divider' },
      customer: { x: 15, y: 120, width: 400, height: 80, fontSize: 12, fontFamily: 'Arial, sans-serif' },
      meta: { x: 500, y: 120, width: 200, height: 50, fontSize: 12, fontFamily: 'Arial, sans-serif' },
      divider2: { x: 0, y: 200, width: 716, type: 'divider' },
      table: { x: 0, y: 201, width: 716, fontSize: 12, fontFamily: 'Arial, sans-serif' },
      bank: { x: 15, y: 780, width: 280, height: 100, fontSize: 12, fontFamily: 'Arial, sans-serif', text: 'Acc No: 31440400000058\nBank Name: BANK OF BARODA\nBranch Name: NALGONDA\nIFSC: BARB0NALGON' },
      summary: { x: 360, y: 780, width: 340, height: 160, fontSize: 12, fontFamily: 'Arial, sans-serif' }
    };

    const saved = localStorage.getItem('invoice_master_config');
    setConfig(saved ? JSON.parse(saved) : DEFAULT_CONFIG);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('invoice_master_config', JSON.stringify(config));
    window.alert("Settings saved successfully!");
  };

  const handleTextChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], text: value } }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2000000) return window.alert("Image is too large. Please use a logo under 2MB.");
      const reader = new FileReader();
      reader.onloadend = () => setConfig(prev => ({ ...prev, logo: { ...prev.logo, url: reader.result } }));
      reader.readAsDataURL(file);
    }
  };

  if (!config) return <div>Loading Settings...</div>;

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      {/* SIDEBAR NAVIGATION */}
      <div className="card" style={{ width: '250px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 className="border-bottom-padded mb-1">Settings ⚙️</h3>
        <button className={`btn ${activeTab === 'topbar' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left' }} onClick={() => setActiveTab('topbar')}>
          🏢 Business (Top Bar)
        </button>
        <button className={`btn ${activeTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`} style={{ textAlign: 'left' }} onClick={() => setActiveTab('bank')}>
          🏦 Bank Details
        </button>
        <button className={`btn ${activeTab === 'layout' ? 'btn-purple' : 'btn-secondary'}`} style={{ textAlign: 'left' }} onClick={() => setActiveTab('layout')}>
          📐 Edit Invoice Layout
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={{ flex: 1 }}>
        {activeTab === 'topbar' && (
          <div className="card">
            <h2 className="card-title mb-1-5">Top Bar Settings (Business Details)</h2>
            <div className="form-group w-100">
              <label className="form-label">GST Number Text</label>
              <input type="text" className="form-control" value={config.gstin.text} onChange={e => handleTextChange('gstin', e.target.value)} />
            </div>
            <div className="form-group w-100 mt-1">
              <label className="form-label">Business Name, Address & Contact Info</label>
              <textarea className="form-control" rows={5} value={config.business.text} onChange={e => handleTextChange('business', e.target.value)} />
            </div>
            <div className="form-group w-100 mt-1">
              <label className="form-label">Upload Business Logo</label>
              <input type="file" accept="image/*" className="form-control mb-1" onChange={handleImageUpload} />
              {config.logo.url && <img src={config.logo.url} alt="Preview" style={{ height: '60px', objectFit: 'contain', border: '1px solid #ccc', padding: '5px' }} />}
            </div>
            <button className="btn btn-success mt-1" onClick={saveSettings}>💾 Save Details</button>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="card">
            <h2 className="card-title mb-1-5">Bank Details & Terms</h2>
            <div className="form-group w-100">
              <label className="form-label">Banking Information (Printed at bottom left)</label>
              <textarea className="form-control" rows={6} value={config.bank.text} onChange={e => handleTextChange('bank', e.target.value)} />
            </div>
            <button className="btn btn-success mt-1" onClick={saveSettings}>💾 Save Details</button>
          </div>
        )}

        {/* INJECT THE INVOICE BUILDER */}
        {activeTab === 'layout' && (
          <InvoiceBuilder externalConfig={config} />
        )}
      </div>
    </div>
  );
}