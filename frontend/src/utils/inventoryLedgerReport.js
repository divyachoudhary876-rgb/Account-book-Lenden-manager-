/**
 * Frontend Utility: Inventory Item Ledger & Statement Generator (PDF Export)
 * Exact Synchronization with App Inventory Stock Calculation & Running Balance.
 */

import { StorageService } from './storageSync';
import { exportTruePDF, cleanTypographySpacing } from './pdfDownloadEngine';
import { jsPDF } from 'jspdf';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const generateStockItemLedgerStatement = (firmId, item) => {
  const cleanFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const itemId = String(item?.id || '');
  const itemName = String(item?.item_name || item?.name || item?.itemName || '').trim().toLowerCase();

  if (!itemName) {
    throw new Error("Invalid Stock Item selected for statement.");
  }

  // 1. Gather Purchase Bills (Stock Inward / Plus)
  const purchaseBills = StorageService.getItem(`purchase_bills_${cleanFirmId}`, []) || StorageService.getItem('purchase_bills', []);
  const relevantPurchases = purchaseBills.filter(p => {
    if (!p) return false;
    const pItemId = String(p?.itemId || p?.item_id || p?.item || '');
    const pItemName = String(p?.itemName || p?.item_name || p?.name || '').trim().toLowerCase();
    return pItemId === itemId || pItemName === itemName;
  });

  // 2. Gather Sales Invoices / Issues (Stock Outward / Minus)
  const salesInvoices = StorageService.getItem(`sales_invoices_${cleanFirmId}`, []) || StorageService.getItem('sales_invoices', []) || StorageService.getItem('app_invoices', []);
  const relevantSales = [];
  salesInvoices.forEach(s => {
    if (!s) return;
    const itemsList = Array.isArray(s?.items) ? s.items : [];
    itemsList.forEach(si => {
      if (!si) return;
      const sItemId = String(si?.itemId || si?.item_id || '');
      const sItemName = String(si?.itemName || si?.item_name || si?.name || '').trim().toLowerCase();
      if (sItemId === itemId || sItemName === itemName) {
        relevantSales.push({ ...s, specific_item: si });
      }
    });
  });

  // 3. Compile Chronological Ledger Entries
  const ledgerEntries = [];

  relevantPurchases.forEach(p => {
    const qty = parseFloat(p?.quantity || p?.qty || p?.items?.[0]?.qty || 0);
    const rate = parseFloat(p?.rate || p?.unit_rate || p?.items?.[0]?.rate || 0);
    if (qty > 0) {
      ledgerEntries.push({
        date: p?.voucher_date || p?.date || p?.purchase_date || new Date().toISOString().slice(0, 10),
        type: 'PURCHASE',
        ref: p?.voucher_number || p?.reference_no || p?.bill_number || 'PUR',
        particulars: cleanTypographySpacing(`Purchase from ${p?.supplier || p?.supplier_name || p?.party || p?.cr_account || 'Supplier'}`),
        in_qty: qty,
        out_qty: 0,
        rate: rate,
        amount: round2(qty * rate)
      });
    }
  });

  relevantSales.forEach(s => {
    const qty = parseFloat(s?.specific_item?.quantity || s?.specific_item?.qty || 0);
    const rate = parseFloat(s?.specific_item?.rate || 0);
    if (qty > 0) {
      ledgerEntries.push({
        date: s?.voucher_date || s?.date || new Date().toISOString().slice(0, 10),
        type: 'SALE / ISSUE',
        ref: s?.reference_no || s?.voucher_number || 'INV',
        particulars: cleanTypographySpacing(`Issued to ${s?.dr_account || s?.party || 'Party'}`),
        in_qty: 0,
        out_qty: qty,
        rate: rate,
        amount: round2(qty * rate)
      });
    }
  });

  // Sort ascending by date chronologically
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 4. Calculate Running Balance accurately starting strictly from 0
  let runningStock = 0;
  const processedLedger = ledgerEntries.map(entry => {
    runningStock = round2(runningStock + entry.in_qty - entry.out_qty);
    return {
      ...entry,
      balance_qty: runningStock
    };
  });

  return {
    item_name: item?.item_name || item?.name || itemName,
    unit: item?.unit || 'Pcs',
    current_stock: runningStock,
    entries: processedLedger
  };
};

/**
 * Generates true PDF Report for Stock Item Movement
 */
export const exportStockLedgerPDF = async (firmProfile, itemData, statementResult) => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const itemName = statementResult.item_name;
  const unit = statementResult.unit;
  const rows = statementResult.entries;

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  let pageNum = 1;

  const printHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Stock Item Ledger & Movement Statement: ${itemName}`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Unit: ${unit} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Date', 16, y + 4.8);
    doc.text('Type / Ref', 38, y + 4.8);
    doc.text('Particulars & Description', 85, y + 4.8);
    doc.text('In (+)', 152, y + 4.8, { align: 'right' });
    doc.text('Out (-)', 172, y + 4.8, { align: 'right' });
    doc.text('Balance', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();

  rows.forEach((row, index) => {
    const rawParticulars = cleanTypographySpacing(row.particulars);
    const splitPart = doc.splitTextToSize(rawParticulars, 64);
    const rowHeight = Math.max(7, 3 + (splitPart.length * 3.4));

    if (y + rowHeight > 280) {
      doc.addPage();
      pageNum += 1;
      y = 18;
      printHeader();
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, 182, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(String(row.date || '-'), 16, y);
    doc.text(String(row.type), 38, y);
    doc.text(splitPart, 85, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(row.in_qty > 0 ? 5 : 15, row.in_qty > 0 ? 150 : 23, row.in_qty > 0 ? 105 : 42);
    doc.text(row.in_qty > 0 ? `+${row.in_qty}` : '-', 152, y, { align: 'right' });

    doc.setTextColor(row.out_qty > 0 ? 220 : 15, row.out_qty > 0 ? 38 : 23, row.out_qty > 0 ? 38 : 42);
    doc.text(row.out_qty > 0 ? `-${row.out_qty}` : '-', 172, y, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.text(`${row.balance_qty} ${unit}`, 193, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  return await exportTruePDF(doc, `Stock_Statement_${itemName.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
};
