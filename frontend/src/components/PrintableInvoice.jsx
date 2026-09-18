import React, { useEffect, useState } from 'react';
import { formatInvoiceId, formatMoney } from '../utils/formatters';

export default function PrintableInvoice({ selectedInvoice, selectedInvoiceMath, customers }) {
  const [config, setConfig] = useState(null);

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

    try {
      const saved = localStorage.getItem('invoice_master_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.gstin || !parsed.gstin.fontSize) { setConfig(DEFAULT_CONFIG); } 
        else { setConfig(parsed); }
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (e) {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  if (!selectedInvoice || !selectedInvoiceMath || !config) return null;
  
  const inv = selectedInvoice;
  const math = selectedInvoiceMath;
  const cust = customers.find(c => c.name === inv.customerName) || {};

  // --- UPGRADED 22/30 ROW SMART PAGINATION ---
  const items = inv.items || [];
  const pages = [];
  
  if (items.length <= 22) {
    // 1-Page Bill: Pad exactly to 22 rows
    pages.push({ items: items, isLastPage: true, padTo: 22 });
  } else {
    // Multi-Page Bill: Page 1 fills completely with 30 rows
    pages.push({ items: items.slice(0, 30), isLastPage: false, padTo: 30 });
    
    const remainingItems = items.slice(30);
    if (remainingItems.length === 0) {
      // Edge Case: Exactly 23-30 items. Page 2 is created just to hold the summary box.
      pages.push({ items: [], isLastPage: true, padTo: 0 });
    } else {
      // Chunk remaining into 30s. The final page pads to the EXACT item count, avoiding blank rows!
      for (let i = 0; i < remainingItems.length; i += 30) {
        const chunk = remainingItems.slice(i, i + 30);
        const isLast = (i + 30) >= remainingItems.length;
        pages.push({ items: chunk, isLastPage: isLast, padTo: isLast ? chunk.length : 30 });
      }
    }
  }

  const specialDiscountPct = math.discountPercent > 0 ? `${math.discountPercent.toFixed(2)} %` : '';
  const cgstPct = math.cgstPercent > 0 ? `${math.cgstPercent.toFixed(2)} %` : '';
  const sgstPct = math.sgstPercent > 0 ? `${math.sgstPercent.toFixed(2)} %` : '';
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

  // Reusable function to draw the summary blocks dynamically or absolutely
  const renderSummaryBlocks = (isRelative = false) => (
    <>
      <div style={{ 
        position: 'absolute', 
        left: isRelative ? (config.bank.x - config.table.x) : config.bank.x, 
        top: isRelative ? 0 : config.bank.y, 
        width: config.bank.width, 
        height: config.bank.height || 'auto', 
        fontSize: `${config.bank.fontSize || 12}px`, 
        fontFamily: config.bank.fontFamily, 
        lineHeight: '1.8', 
        whiteSpace: 'pre-wrap', 
        padding: '10px' 
      }}>
        {config.bank.text}
      </div>

      <div style={{ 
        position: 'absolute', 
        left: isRelative ? (config.summary.x - config.table.x) : config.summary.x, 
        top: isRelative ? 0 : config.summary.y, 
        width: config.summary.width, 
        height: config.summary.height || 'auto', 
        fontSize: `${config.summary.fontSize || 12}px`, 
        fontFamily: config.summary.fontFamily, 
        backgroundColor: 'white' 
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
          <tbody>
            <tr>
              <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>Total Quantity</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', width: '30%' }}>{totalQty}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>Subtotal</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>Special Discount</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>{specialDiscountPct}</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.discountAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>Subtotal (excl Tax)</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.taxableAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>CGST</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{cgstPct}</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.cgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>SGST</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{sgstPct}</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right' }}>Round off</td>
              <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{math.roundoff.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan="2" style={{ border: '1px solid #000', borderBottom: 'none', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Total</td>
              <td style={{ border: '1px solid #000', borderBottom: 'none', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2em' }}>{formatMoney(math.finalTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {pages.map((page, pageIndex) => {
        const emptyRowsCount = Math.max(0, page.padTo - page.items.length);

        return (
          <div key={pageIndex} className="invoice-a4-box" style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: '12px' }}>
            
            {/* PAGE 1 HEADER */}
            {pageIndex === 0 && (
              <>
                <div style={{ position: 'absolute', left: config.gstin.x, top: config.gstin.y, width: config.gstin.width, height: config.gstin.height || 'auto', fontSize: `${config.gstin.fontSize || 12}px`, fontFamily: config.gstin.fontFamily, fontWeight: 'bold' }}>
                  {config.gstin.text}
                </div>
                <div style={{ position: 'absolute', left: config.business.x, top: config.business.y, width: config.business.width, height: config.business.height || 'auto', fontSize: `${config.business.fontSize || 14}px`, fontFamily: config.business.fontFamily, textAlign: 'center', whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
                  {config.business.text}
                </div>
                <div style={{ position: 'absolute', left: config.logo.x, top: config.logo.y, width: config.logo.width, height: config.logo.height }}>
                  <img src={config.logo.url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ position: 'absolute', left: config.divider1.x, top: config.divider1.y, width: '100%', borderTop: '1px solid #000' }}></div>

                <div style={{ position: 'absolute', left: config.customer.x, top: config.customer.y, width: config.customer.width, height: config.customer.height || 'auto', fontSize: `${config.customer.fontSize || 12}px`, fontFamily: config.customer.fontFamily, padding: '10px 15px', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{inv.customerName}</div>
                  <div>{cust.address || cust.location || cust.city || ''}</div>
                  <div>{cust.mobile || ''}</div>
                  <div style={{ marginTop: '4px', fontWeight: 'bold' }}>GST No: {cust.gstno || 'URD'}</div>
                </div>

                <div style={{ position: 'absolute', left: config.meta.x, top: config.meta.y, width: config.meta.width, height: config.meta.height || 'auto', fontSize: `${config.meta.fontSize || 12}px`, fontFamily: config.meta.fontFamily, padding: '10px 15px', lineHeight: '1.8', fontWeight: 'bold', textAlign: 'right' }}>
                  <div>{new Date(inv.orderDate).toLocaleDateString('en-GB')} {new Date(inv.orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  <div>{formatInvoiceId(inv.id)}</div>
                </div>

                <div style={{ position: 'absolute', left: config.divider2.x, top: config.divider2.y, width: '100%', borderTop: '1px solid #000' }}></div>
              </>
            )}

            {/* PRODUCTS TABLE */}
            <div style={{ position: 'absolute', left: config.table.x, top: pageIndex === 0 ? config.table.y : 0, width: config.table.width, fontSize: `${config.table.fontSize || 12}px`, fontFamily: config.table.fontFamily }}>
              
              {/* Only render table if there are items, or if it's the very first page */}
              {(page.items.length > 0 || pageIndex === 0) && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', borderBottom: '1px solid #000' }}>
                  <thead style={{ backgroundColor: '#d1d5db' }}>
                    <tr>
                      <th style={{ border: '1px solid #000', borderLeft: 'none', borderTop: 'none', padding: '6px', width: '5%' }}>S.No</th>
                      <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px', width: '10%' }}>HSN</th>
                      <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px', width: '40%' }}>Product</th>
                      <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px', width: '15%' }}>Qty</th>
                      <th style={{ border: '1px solid #000', borderTop: 'none', padding: '6px', width: '15%' }}>Price (₹)</th>
                      <th style={{ border: '1px solid #000', borderRight: 'none', borderTop: 'none', padding: '6px', width: '15%' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #000', borderLeft: 'none', padding: '4px', height: '24px' }}>{(pageIndex === 0 ? 0 : 30 + ((pageIndex - 1) * 30)) + i + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>{item.product?.hsnCode || ''}</td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>{item.product?.name || item.name || 'Unknown'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>{item.quantity} pcs</td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>{(item.price || 0).toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', borderRight: 'none', padding: '4px', textAlign: 'right' }}>{((item.price || 0) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                    {/* Prints empty rows if needed (Only kicks in on Page 1 or if specifically padded) */}
                    {[...Array(emptyRowsCount)].map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td style={{ border: '1px solid #000', borderLeft: 'none', height: '24px' }}></td>
                        <td style={{ border: '1px solid #000' }}></td><td style={{ border: '1px solid #000' }}></td>
                        <td style={{ border: '1px solid #000' }}></td><td style={{ border: '1px solid #000' }}></td>
                        <td style={{ border: '1px solid #000', borderRight: 'none' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {!page.isLastPage && (
                <div style={{ textAlign: 'right', fontStyle: 'italic', padding: '10px' }}>Continued on next page...</div>
              )}

              {/* DYNAMIC SUMMARY FOR PAGE 2+ (Stays glued to the bottom of the table) */}
              {page.isLastPage && pageIndex > 0 && (
                <div style={{ position: 'relative', width: '100%', height: Math.max(config.bank.height || 160, config.summary.height || 160) + 'px', marginTop: '15px' }}>
                  {renderSummaryBlocks(true)}
                </div>
              )}
            </div>

            {/* STATIC SUMMARY FOR PAGE 1 (1-Page Bills Only) */}
            {page.isLastPage && pageIndex === 0 && (
              renderSummaryBlocks(false)
            )}

          </div>
        );
      })}
    </div>
  );
}