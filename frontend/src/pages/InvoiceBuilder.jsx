import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';

const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' }
];

export default function InvoiceBuilder({ externalConfig }) {
  const [config, setConfig] = useState(externalConfig);
  const [selectedEl, setSelectedEl] = useState(null);

  // Sync with the parent component if the user changes tabs
  useEffect(() => {
    setConfig(externalConfig);
  }, [externalConfig]);

  const saveConfig = () => {
    localStorage.setItem('invoice_master_config', JSON.stringify(config));
    window.alert("Master Layout Saved! Your bills will now use these exact borders, fonts, and sizes.");
  };

  const updateNode = (key, field, value) => {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const renderCanvasElement = (key, node) => {
    let content = null;
    const fontStyles = { fontSize: `${node.fontSize || 12}px`, fontFamily: node.fontFamily || 'Arial, sans-serif' };
    
    if (key === 'gstin') content = <div style={{ ...fontStyles, fontWeight: 'bold' }}>{node.text}</div>;
    if (key === 'business') content = <div style={{ ...fontStyles, textAlign: 'center', whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{node.text}</div>;
    if (key === 'logo') content = <img src={node.url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable="false"/>;
    if (key === 'divider1' || key === 'divider2') content = <div style={{ width: '100%', height: '100%', borderTop: '1px solid #000' }}></div>;
    
    if (key === 'customer') content = <div style={{ ...fontStyles, padding: '10px 15px' }}><strong>CUSTOMER NAME</strong><br/>Address Details<br/>9999999999<br/>GST No: 22AAAAA0000A1Z5</div>;
    if (key === 'meta') content = <div style={{ ...fontStyles, padding: '10px 15px', textAlign: 'right', fontWeight: 'bold' }}>15/08/2026<br/>INV-001</div>;
    if (key === 'bank') content = <div style={{ ...fontStyles, whiteSpace: 'pre-wrap', lineHeight: '1.8', padding: '10px' }}>{node.text}</div>;
    
    if (key === 'table') content = (
      <table style={{ ...fontStyles, width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000', textAlign: 'center' }}>
        <thead style={{ backgroundColor: '#d1d5db' }}>
          <tr>
            <th style={{ border: '1px solid #000', borderLeft: 'none', borderTop: 'none', padding: '6px' }}>S.No</th>
            <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px' }}>Product</th>
            <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px' }}>Qty</th>
            <th style={{ border: '1px solid #000', borderRight: 'none', borderTop: 'none', padding: '6px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', borderLeft: 'none', padding: '4px', height: '24px' }}>1</td>
            <td style={{ border: '1px solid #000', padding: '4px' }}>Sample Item</td>
            <td style={{ border: '1px solid #000', padding: '4px' }}>10</td>
            <td style={{ border: '1px solid #000', borderRight: 'none', padding: '4px' }}>1000.00</td>
          </tr>
          {[...Array(21)].map((_, i) => (
            <tr key={`empty-${i}`}>
              <td style={{ border: '1px solid #000', borderLeft: 'none', height: '24px' }}></td>
              <td style={{ border: '1px solid #000' }}></td><td style={{ border: '1px solid #000' }}></td>
              <td style={{ border: '1px solid #000', borderRight: 'none' }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    if (key === 'summary') content = (
      <table style={{ ...fontStyles, width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
        <tbody>
          <tr><td style={{ border: '1px solid #000', padding: '4px' }}>Subtotal</td><td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>1000.00</td></tr>
          <tr><td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Total</td><td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>1050.00</td></tr>
        </tbody>
      </table>
    );

    return (
      <Rnd
        bounds="parent"
        dragAxis={node.type === 'divider' ? 'y' : 'both'}
        position={{ x: node.x, y: node.y }}
        size={node.width ? { width: node.width, height: node.height || 'auto' } : undefined}
        onDragStop={(e, d) => { updateNode(key, 'x', d.x); updateNode(key, 'y', d.y); }}
        onResizeStop={(e, dir, ref, delta, position) => {
          if (node.type !== 'divider') { updateNode(key, 'width', parseInt(ref.style.width)); updateNode(key, 'height', parseInt(ref.style.height)); }
          if (key === 'logo') updateNode(key, 'height', parseInt(ref.style.height));
        }}
        onClick={(e) => { e.stopPropagation(); setSelectedEl(key); }}
        style={{ border: selectedEl === key ? '2px dashed #0ea5e9' : 'none', cursor: node.type === 'divider' ? 'ns-resize' : 'move', backgroundColor: 'white' }}
      >
        {content}
      </Rnd>
    );
  };

  return (
    <div className="card bg-transparent" style={{ padding: 0, boxShadow: 'none' }}>
      <div className="card-header header-actions bg-white mb-1" style={{ padding: '15px 20px', borderRadius: '8px' }}>
        <div>
          <h2 className="card-title mb-0">Layout Editor</h2>
          <p className="text-muted mb-0 fs-sm">Change element positions, sizes, and fonts here.</p>
        </div>
        <button className="btn btn-success" onClick={saveConfig}>💾 Save Layout</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div className="invoice-a4-box" onClick={() => setSelectedEl(null)}>
          {Object.entries(config).map(([key, node]) => renderCanvasElement(key, node))}
        </div>

        <div className="card shadow-panel" style={{ flex: 1, minWidth: '320px', position: 'sticky', top: '20px' }}>
          {selectedEl ? (
            <div className="builder-settings">
              <h3 className="text-primary border-bottom-padded mb-1">Layout: {selectedEl.toUpperCase()}</h3>
              
              <div className="sales-control-row">
                <div className="form-group w-100"><label>Y (Top/Down)</label><input type="number" className="form-control" value={config[selectedEl].y} onChange={e => updateNode(selectedEl, 'y', Number(e.target.value))} /></div>
                {config[selectedEl].type !== 'divider' && <div className="form-group w-100"><label>X (Left/Right)</label><input type="number" className="form-control" value={config[selectedEl].x} onChange={e => updateNode(selectedEl, 'x', Number(e.target.value))} /></div>}
              </div>
              
              {config[selectedEl].type !== 'divider' && (
                <div className="sales-control-row">
                  <div className="form-group w-100"><label>Width (px)</label><input type="number" className="form-control" value={config[selectedEl].width} onChange={e => updateNode(selectedEl, 'width', Number(e.target.value))} /></div>
                  <div className="form-group w-100"><label>Height (px)</label><input type="number" className="form-control" value={config[selectedEl].height || 0} onChange={e => updateNode(selectedEl, 'height', Number(e.target.value))} /></div>
                </div>
              )}

              {config[selectedEl].type !== 'divider' && selectedEl !== 'logo' && (
                <>
                  <h4 className="mt-1 mb-0-5 text-muted border-bottom-light">Typography</h4>
                  <div className="sales-control-row">
                    <div className="form-group w-100">
                      <label>Font Size (px)</label>
                      <input type="number" className="form-control" value={config[selectedEl].fontSize || 12} onChange={e => updateNode(selectedEl, 'fontSize', Number(e.target.value))} />
                    </div>
                    <div className="form-group w-100">
                      <label>Font Family</label>
                      <select className="form-control" value={config[selectedEl].fontFamily || 'Arial, sans-serif'} onChange={e => updateNode(selectedEl, 'fontFamily', e.target.value)}>
                        {FONT_OPTIONS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              
              <div className="mt-1 text-muted fs-sm">* Note: To edit the actual text or logo image, use the "Business" or "Bank" tabs on the left sidebar.</div>
            </div>
          ) : <div className="text-muted text-center mt-2">Click an element to edit layout properties.</div>}
        </div>
      </div>
    </div>
  );
}