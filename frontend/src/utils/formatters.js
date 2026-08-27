export const formatProductId = (id) => id ? `PR${String(id).padStart(4, '0')}` : 'N/A';
export const formatInvoiceId = (id) => id ? `INV-${String(id).padStart(4, '0')}` : 'N/A';
export const formatPurchaseInvoiceId = (id) => id ? `PINV-${String(id).padStart(4, '0')}` : 'N/A';
export const formatReceiptId = (id) => id ? `REC-${String(id).padStart(4, '0')}` : 'N/A';

export const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  return '₹ ' + num.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

export const formatPrintDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};