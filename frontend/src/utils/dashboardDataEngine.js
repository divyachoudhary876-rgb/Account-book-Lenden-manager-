/**
 * Frontend Utility: Dashboard Summary Cards Click-to-PDF Report Generator
 * Extracts underlying transactions and accounts for Cash & Bank, Stock, Receivables, Payables, and Consumption.
 */

import { StorageService } from './storageSync';
import { exportTruePDF, cleanTypographySpacing } from './pdfDownloadEngine';
import { jsPDF } from 'jspdf';
import { getNormalizedLedgerLines, getSafeAccounts } from './financialReportEngine';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * 1. DOWNLOAD CASH & BANK BREAKDOWN PDF REPORT
 */
export const downloadDashboardCashBankReportPDF = async (firmProfile, firmId, selectedFY = '2026-27') => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const accounts = getSafeAccounts(firmId, selectedFY);
  const lines = getNormalizedLedgerLines(firmId, selectedFY);

  const balances = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (name) balances[name] = parseFloat(acc.opening_balance || acc.openingBalance || 0) * ((acc.balance_type || acc.balanceType || 'Dr') === 'Dr' ? 1 : -1);
  });

  lines.forEach(l => {
    const name = l.account_name.trim();
    if (!balances[name]) balances[name] = 0;
    if (l.entry_type === 'Dr') balances[name] += l.amount;
    else balances[name] -= l.amount;
  });

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
    doc.text('Dashboard Breakdown: Cash & Bank Accounts Statement', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Account / Bank Name', 16, y + 4.8);
    doc.text('Sub Group', 100, y + 4.8);
    doc.text('Net Balance (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();
  let totalCashBank = 0;
  let count = 0;

  Object.entries(balances).forEach(([name, bal]) => {
    const lower = name.toLowerCase();
    if (lower.includes('cash') || lower.includes('bank') || lower.includes('sbi') || lower.includes('pnb')) {
      totalCashBank += bal;
      count++;

      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printHeader(); }
      if (count % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanTypographySpacing(name), 16, y);
      doc.text('Cash-in-Hand / Bank Accounts', 100, y);
      doc.setFont('helvetica', 'bold');
      doc.text(bal.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    }
  });

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Cash & Bank Liquidity:', 100, y);
  doc.text(`Rs ${totalCashBank.toFixed(2)}`, 193, y, { align: 'right' });

  return await exportTruePDF(doc, 'Cash_And_Bank_Report');
};

/**
 * 2. DOWNLOAD STOCK VALUATION BREAKDOWN PDF
 */
export const downloadDashboardStockReportPDF = async (firmProfile, firmId) => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  
  const inventoryKey = `inventory_items_${cleanFirmId}`;
  const stockItems = StorageService.getItem(inventoryKey, []) || StorageService.getItem('inventory_items', []) || [];

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
    doc.text('Dashboard Breakdown: Stock Valuation Report', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Item Name', 16, y + 4.8);
    doc.text('Category / Unit', 80, y + 4.8);
    doc.text('Quantity', 130, y + 4.8, { align: 'right' });
    doc.text('Rate (Rs)', 162, y + 4.8, { align: 'right' });
    doc.text('Total Value (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();
  let grandTotalStock = 0;

  stockItems.forEach((item, index) => {
    if (!item) return;
    const name = cleanTypographySpacing(item.item_name || item.name || 'Item');
    const unit = item.unit || 'Pcs';
    const qty = parseFloat(item.current_stock || item.stock || item.qty || 0);
    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
    const totalVal = round2(qty * rate);
    grandTotalStock += totalVal;

    if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printHeader(); }
    if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(name, 16, y);
    doc.text(unit, 80, y);
    doc.text(qty.toString(), 130, y, { align: 'right' });
    doc.text(rate.toFixed(2), 162, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(totalVal.toFixed(2), 193, y, { align: 'right' });
    y += 6;
  });

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Stock Valuation:', 130, y);
  doc.text(`Rs ${grandTotalStock.toFixed(2)}`, 193, y, { align: 'right' });

  return await exportTruePDF(doc, 'Stock_Valuation_Report');
};

/**
 * 3. DOWNLOAD RECEIVABLES (LENA BAAKI) BREAKDOWN PDF
 */
export const downloadDashboardReceivablesReportPDF = async (firmProfile, firmId, selectedFY = '2026-27') => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const accounts = getSafeAccounts(firmId, selectedFY);
  const lines = getNormalizedLedgerLines(firmId, selectedFY);

  const balances = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (name) balances[name] = parseFloat(acc.opening_balance || acc.openingBalance || 0) * ((acc.balance_type || acc.balanceType || 'Dr') === 'Dr' ? 1 : -1);
  });

  lines.forEach(l => {
    const name = l.account_name.trim();
    if (!balances[name]) balances[name] = 0;
    if (l.entry_type === 'Dr') balances[name] += l.amount;
    else balances[name] -= l.amount;
  });

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
    doc.text('Dashboard Breakdown: Receivables (Lena Baaki - Customers)', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Customer / Party Name', 16, y + 4.8);
    doc.text('Category', 110, y + 4.8);
    doc.text('Receivable Amount (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();
  let totalReceivables = 0;
  let count = 0;

  Object.entries(balances).forEach(([name, bal]) => {
    if (bal > 0.01) {
      totalReceivables += bal;
      count++;

      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printHeader(); }
      if (count % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanTypographySpacing(name), 16, y);
      doc.text('Sundry Debtors', 110, y);
      doc.setFont('helvetica', 'bold');
      doc.text(bal.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    }
  });

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Receivables:', 110, y);
  doc.text(`Rs ${totalReceivables.toFixed(2)}`, 193, y, { align: 'right' });

  return await exportTruePDF(doc, 'Receivables_Breakdown_Report');
};

/**
 * 4. DOWNLOAD PAYABLES (DENA BAAKI) BREAKDOWN PDF
 */
export const downloadDashboardPayablesReportPDF = async (firmProfile, firmId, selectedFY = '2026-27') => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const accounts = getSafeAccounts(firmId, selectedFY);
  const lines = getNormalizedLedgerLines(firmId, selectedFY);

  const balances = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (name) balances[name] = parseFloat(acc.opening_balance || acc.openingBalance || 0) * ((acc.balance_type || acc.balanceType || 'Dr') === 'Dr' ? 1 : -1);
  });

  lines.forEach(l => {
    const name = l.account_name.trim();
    if (!balances[name]) balances[name] = 0;
    if (l.entry_type === 'Dr') balances[name] += l.amount;
    else balances[name] -= l.amount;
  });

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
    doc.text('Dashboard Breakdown: Payables (Dena Baaki - Creditors & Suppliers)', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Supplier / Vendor Name', 16, y + 4.8);
    doc.text('Category', 110, y + 4.8);
    doc.text('Payable Amount (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();
  let totalPayables = 0;
  let count = 0;

  Object.entries(balances).forEach(([name, bal]) => {
    if (bal < -0.01) {
      const payableAmt = Math.abs(bal);
      totalPayables += payableAmt;
      count++;

      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printHeader(); }
      if (count % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanTypographySpacing(name), 16, y);
      doc.text('Sundry Creditors', 110, y);
      doc.setFont('helvetica', 'bold');
      doc.text(payableAmt.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    }
  });

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Payables:', 110, y);
  doc.text(`Rs ${totalPayables.toFixed(2)}`, 193, y, { align: 'right' });

  return await exportTruePDF(doc, 'Payables_Breakdown_Report');
};

/**
 * 5. DOWNLOAD CONSUMPTION / ISSUE RECORDS BREAKDOWN PDF
 */
export const downloadDashboardConsumptionReportPDF = async (firmProfile, firmId) => {
  const firmName = firmProfile?.legal_name || firmProfile?.trade_name || firmProfile?.name || 'Neelkanth Int Udyog';
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  const adjustmentsKey = `universal_material_adjustments_${cleanFirmId}`;
  const adjustments = StorageService.getItem(adjustmentsKey, []) || StorageService.getItem('universal_material_adjustments', []) || [];

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
    doc.text('Dashboard Breakdown: Material Consumption & Issue Records', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Date', 16, y + 4.8);
    doc.text('Item Name', 45, y + 4.8);
    doc.text('Issued Party / Location', 95, y + 4.8);
    doc.text('Quantity', 145, y + 4.8, { align: 'right' });
    doc.text('Total Value (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();
  let totalConsumptionVal = 0;

  adjustments.forEach((adj, index) => {
    if (!adj) return;
    const date = adj.date || '-';
    const itemName = cleanTypographySpacing(adj.item_name || adj.itemName || 'Material');
    const party = cleanTypographySpacing(adj.party || 'Factory');
    const qty = parseFloat(adj.quantity || adj.qty || 0);
    const totalAmt = parseFloat(adj.total_amount || adj.amount || 0);
    totalConsumptionVal += totalAmt;

    if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printHeader(); }
    if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(date, 16, y);
    doc.text(itemName, 45, y);
    doc.text(party, 95, y);
    doc.text(qty.toString(), 145, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(totalAmt.toFixed(2), 193, y, { align: 'right' });
    y += 6;
  });

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Total Consumption Records Value:', 95, y);
  doc.text(`Rs ${totalConsumptionVal.toFixed(2)}`, 193, y, { align: 'right' });

  return await exportTruePDF(doc, 'Consumption_Records_Report');
};
