/**
 * Frontend Utility: Inventory Item Ledger & Statement Generator (PDF Export)
 * Traces all Inward (Purchases) and Outward (Sales, Consumption, Adjustments) transactions date-wise.
 */

import { StorageService } from './storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const generateStockItemLedgerStatement = (firmId, item) => {
  const cleanFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const itemId = String(item?.id || '');
  const itemName = String(item?.item_name || item?.name || item?.itemName || '').trim();

  if (!itemName) {
    throw new Error("Invalid Stock Item selected for statement.");
  }

  // 1. Gather Purchase Bills (Stock Inward)
  const purchaseBills = StorageService.getItem(`purchase_bills_${cleanFirmId}`, []) || StorageService.getItem('purchase_bills', []);
  const relevantPurchases = purchaseBills.filter(p => {
    const pItemId = String(p?.itemId || p?.item_id || '');
    const pItemName = String(p?.itemName || p?.item_name || p?.name || '').trim().toLowerCase();
    return pItemId === itemId || pItemName === itemName.toLowerCase();
  });

  // 2. Gather Sales Invoices (Stock Outward)
  const salesInvoices = StorageService.getItem(`sales_invoices_${cleanFirmId}`, []) || StorageService.getItem('sales_invoices', []) || StorageService.getItem('app_invoices', []);
  const relevantSales = [];
  salesInvoices.forEach(s => {
    const itemsList = Array.isArray(s?.items) ? s.items : [];
    itemsList.forEach(si => {
      const sItemId = String(si?.itemId || si?.item_id || '');
      const sItemName = String(si?.itemName || si?.item_name || si?.name || '').trim().toLowerCase();
      if (sItemId === itemId || sItemName === itemName.toLowerCase()) {
        relevantSales.push({ ...s, specific_item: si });
      }
    });
  });

  // 3. Gather Material Consumptions / Adjustments (Stock Outward / Inward)
  const adjustments = StorageService.getItem(`universal_material_adjustments_${cleanFirmId}`, []) || StorageService.getItem('universal_material_adjustments', []);
  const relevantAdjustments = adjustments.filter(a => {
    const aItemName = String(a?.item_name || a?.itemName || '').trim().toLowerCase();
    return aItemName === itemName.toLowerCase();
  });

  // 4. Combine and Sort Chronologically by Date
  const ledgerEntries = [];

  relevantPurchases.forEach(p => {
    const qty = parseFloat(p?.quantity || p?.qty || p?.items?.[0]?.qty || 0);
    const rate = parseFloat(p?.rate || p?.unit_rate || p?.items?.[0]?.rate || 0);
    ledgerEntries.push({
      date: p?.voucher_date || p?.date || new Date().toISOString().slice(0, 10),
      type: 'PURCHASE (IN)',
      ref: p?.voucher_number || p?.reference_no || p?.bill_number || 'PUR',
      particulars: `Purchase from ${p?.supplier || p?.party || p?.cr_account || 'Supplier'}`,
      in_qty: qty,
      out_qty: 0,
      rate: rate,
      amount: round2(qty * rate)
    });
  });

  relevantSales.forEach(s => {
    const qty = parseFloat(s?.specific_item?.quantity || s?.specific_item?.qty || 0);
    const rate = parseFloat(s?.specific_item?.rate || 0);
    ledgerEntries.push({
      date: s?.voucher_date || s?.date || new Date().toISOString().slice(0, 10),
      type: 'SALE (OUT)',
      ref: s?.reference_no || s?.voucher_number || 'INV',
      particulars: `Sale to ${s?.dr_account || s?.party || 'Customer'}`,
      in_qty: 0,
      out_qty: qty,
      rate: rate,
      amount: round2(qty * rate)
    });
  });

  relevantAdjustments.forEach(a => {
    const qty = parseFloat(a?.quantity || a?.qty || 0);
    const rate = parseFloat(a?.rate || 0);
    const isOutward = true; // Material issue/consumption is generally outward
    ledgerEntries.push({
      date: a?.date || new Date().toISOString().slice(0, 10),
      type: isOutward ? 'CONSUMPTION / ADJUSTMENT (OUT)' : 'ADJUSTMENT (IN)',
      ref: a?.id || 'ADJ',
      particulars: `Adjustment / Issue to ${a?.party || 'Factory'} (${a?.remarks || 'N/A'})`,
      in_qty: isOutward ? 0 : qty,
      out_qty: isOutward ? qty : 0,
      rate: rate,
      amount: round2(qty * rate)
    });
  });

  // Sort ascending by date
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 5. Calculate Running Balance
  let runningStock = 0;
  const processedLedger = ledgerEntries.map(entry => {
    runningStock = round2(runningStock + entry.in_qty - entry.out_qty);
    return {
      ...entry,
      balance_qty: runningStock
    };
  });

  return {
    item_name: itemName,
    unit: item?.unit || 'Units',
    current_stock: item?.current_stock || item?.stock || runningStock,
    entries: processedLedger
  };
};

/**
 * Generates an HTML Printable / PDF Report for the Stock Ledger
 */
export const exportStockLedgerPDF = (firmProfile, itemData, statementResult) => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || 'Neelkanth Int Udyog';
  const nowStr = new Date().toLocaleDateString('hi-IN');

  let rowsHtml = '';
  if (statementResult.entries.length === 0) {
    rowsHtml = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Is item ke liye koi transaction record nahi mila.</td></tr>`;
  } else {
    statementResult.entries.forEach((row, index) => {
      rowsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${row.date}</td>
          <td><b>${row.type}</b><br/><small>${row.ref}</small></td>
          <td>${row.particulars}</td>
          <td style="color: green; font-weight: bold;">${row.in_qty > 0 ? `+${row.in_qty}` : '-'}</td>
          <td style="color: red; font-weight: bold;">${row.out_qty > 0 ? `-${row.out_qty}` : '-'}</td>
          <td style="background: #f4f6f8; font-weight: bold;">${row.balance_qty} ${statementResult.unit}</td>
        </tr>
      `;
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Stock Item Ledger Statement - ${statementResult.item_name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; }
        .header h2 { margin: 0; color: #2c3e50; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .item-info { background: #ecf0f1; padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th, td { border: 1px solid #bdc3c7; padding: 8px 10px; text-align: left; }
        th { background-color: #2c3e50; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 30px; text-align: right; font-size: 12px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${firmName}</h2>
        <p><b>Stock Item Ledger / Movement Statement</b></p>
        <p>Generated On: ${nowStr}</p>
      </div>

      <div class="item-info">
        <div><b>Item Name:</b> ${statementResult.item_name}</div>
        <div><b>Unit:</b> ${statementResult.unit}</div>
        <div><b>Current Stock Balance:</b> <span style="color: #27ae60; font-weight: bold;">${statementResult.current_stock} ${statementResult.unit}</span></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Type / Ref</th>
            <th>Particulars & Description</th>
            <th>Inward (+)</th>
            <th>Outward (-)</th>
            <th>Remaining Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <p>AccountBook Smart Manager - Certified Inventory Module</p>
      </div>
    </body>
    </html>
  `;

  // Open print/PDF window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  }
};
