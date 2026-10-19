// frontend/src/utils/dashboardReportEngine.js

import jsPDF from 'jspdf';
import { StorageService } from './storageSync';

const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

const getFirmName = (firmInput) => {
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.firm_name || firmInput.name || 'Neelkanth Int Udyog';
  }
  return 'Neelkanth Int Udyog';
};

// Universal helper to trigger download in both Web Browsers & Android WebViews (APK)
const triggerPDFDownload = (doc, filename) => {
  try {
    const pdfOutput = doc.output('blob');
    const blobURL = URL.createObjectURL(pdfOutput);
    const link = document.createElement('a');
    link.href = blobURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobURL), 10000);
  } catch (err) {
    // Fallback for strict mobile webviews
    doc.save(filename);
  }
};

export const downloadDashboardCashBankReportPDF = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const firmName = getFirmName(firmInput);
    const accounts = StorageService.getItem(`app_accounts_${firmId}`, []) || StorageService.getItem('app_account_heads', []) || [];

    const cashBankAccounts = accounts.filter(acc => {
      if (!acc) return false;
      const name = String(acc.account_name || acc.name || '').toLowerCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      return name.includes('cash') || name.includes('bank') || grp.includes('cash') || grp.includes('bank');
    });

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(firmName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dashboard Breakdown: Cash & Bank Accounts Statement`, 14, 22);
    doc.text(`Generated On: ${new Date().toISOString().split('T')[0]}`, 14, 28);

    let y = 38;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 16, y);
    doc.text('Account / Bank Name', 30, y);
    doc.text('Sub Group', 100, y);
    doc.text('Net Balance (Rs)', 155, y);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    cashBankAccounts.forEach((acc, idx) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const name = acc.account_name || acc.name || 'Account';
      const grp = acc.sub_group || acc.group || 'Cash-in-Hand / Bank Accounts';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 35), 30, y);
      doc.text(String(grp).substring(0, 25), 100, y);
      doc.text(`Rs. ${bal.toFixed(2)}`, 155, y);
      y += 7;
    });

    triggerPDFDownload(doc, `Cash_Bank_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Cash & Bank PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

export const downloadDashboardStockReportPDF = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const firmName = getFirmName(firmInput);
    const inventory = StorageService.getItem(`inventory_items_${firmId}`, []) || StorageService.getItem('inventory_items', []) || [];

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(firmName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dashboard Breakdown: Stock Valuation Report`, 14, 22);
    doc.text(`Generated On: ${new Date().toISOString().split('T')[0]}`, 14, 28);

    let y = 38;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 16, y);
    doc.text('Item Name', 30, y);
    doc.text('Unit', 90, y);
    doc.text('Quantity', 115, y);
    doc.text('Rate (Rs)', 140, y);
    doc.text('Total (Rs)', 165, y);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    let totalValuation = 0;
    inventory.forEach((item, idx) => {
      if (!item) return;
      if (y > 280) { doc.addPage(); y = 20; }
      const name = item.item_name || item.name || 'Item';
      const unit = item.unit || 'Units';
      const qty = parseFloat(item.current_stock || item.stock || item.current_qty || item.qty || 0);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const totalVal = qty * rate;
      totalValuation += totalVal;

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 25), 30, y);
      doc.text(String(unit), 90, y);
      doc.text(qty.toFixed(2), 115, y);
      doc.text(rate.toFixed(2), 140, y);
      doc.text(totalVal.toFixed(2), 165, y);
      y += 7;
    });

    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Stock Valuation: Rs ${totalValuation.toFixed(2)}`, 14, y);

    triggerPDFDownload(doc, `Stock_Valuation_Report_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Stock PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

export const downloadDashboardReceivablesReportPDF = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const firmName = getFirmName(firmInput);
    const accounts = StorageService.getItem(`app_accounts_${firmId}`, []) || StorageService.getItem('app_account_heads', []) || [];

    const debtors = accounts.filter(acc => {
      if (!acc) return false;
      const type = String(acc.primary_type || acc.type || '').toUpperCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const isDebtor = grp.includes('debtor') || grp.includes('customer') || grp.includes('grahak') || grp.includes('lena');
      const isInvalid = grp.includes('expense') || grp.includes('stock') || grp.includes('inventory') || grp.includes('asset') || grp.includes('income');
      return type === 'ASSETS' && isDebtor && !isInvalid;
    });

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(firmName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dashboard Breakdown: Receivables (Lena Baaki - Customers)`, 14, 22);
    doc.text(`Generated On: ${new Date().toISOString().split('T')[0]}`, 14, 28);

    let y = 38;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 16, y);
    doc.text('Customer / Party Name', 30, y);
    doc.text('Category', 100, y);
    doc.text('Receivable (Rs)', 150, y);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    let totalReceivables = 0;
    debtors.forEach((acc, idx) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const name = acc.account_name || acc.name || 'Customer';
      const grp = acc.sub_group || acc.group || 'Sundry Debtors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      if (bal > 0) totalReceivables += bal;

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 35), 30, y);
      doc.text(String(grp).substring(0, 25), 100, y);
      doc.text(`Rs. ${bal.toFixed(2)}`, 150, y);
      y += 7;
    });

    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Receivables: Rs ${totalReceivables.toFixed(2)}`, 14, y);

    triggerPDFDownload(doc, `Receivables_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Receivables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

export const downloadDashboardPayablesReportPDF = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const firmName = getFirmName(firmInput);
    const accounts = StorageService.getItem(`app_accounts_${firmId}`, []) || StorageService.getItem('app_account_heads', []) || [];

    const creditors = accounts.filter(acc => {
      if (!acc) return false;
      const type = String(acc.primary_type || acc.type || '').toUpperCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const isCreditor = grp.includes('creditor') || grp.includes('supplier') || grp.includes('vendor') || grp.includes('thekedar') || grp.includes('dena');
      const isInvalid = grp.includes('expense') || grp.includes('stock') || grp.includes('inventory');
      return type === 'LIABILITIES' && isCreditor && !isInvalid;
    });

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(firmName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dashboard Breakdown: Payables (Dena Baaki - Creditors & Suppliers)`, 14, 22);
    doc.text(`Generated On: ${new Date().toISOString().split('T')[0]}`, 14, 28);

    let y = 38;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 16, y);
    doc.text('Supplier / Vendor Name', 30, y);
    doc.text('Category', 100, y);
    doc.text('Payable (Rs)', 150, y);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    let totalPayables = 0;
    creditors.forEach((acc, idx) => {
      if (y > 280) { doc.addPage(); y = 20; }
      const name = acc.account_name || acc.name || 'Supplier';
      const grp = acc.sub_group || acc.group || 'Sundry Creditors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      if (bal > 0) totalPayables += bal;

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 35), 30, y);
      doc.text(String(grp).substring(0, 25), 100, y);
      doc.text(`Rs. ${bal.toFixed(2)}`, 150, y);
      y += 7;
    });

    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Payables: Rs ${totalPayables.toFixed(2)}`, 14, y);

    triggerPDFDownload(doc, `Payables_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Payables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

export const downloadDashboardConsumptionReportPDF = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const firmName = getFirmName(firmInput);
    const records = StorageService.getItem(`material_consumption_records_${firmId}`, []) || StorageService.getItem('material_consumption_records', []) || [];

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(firmName, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dashboard Breakdown: Material Consumption History`, 14, 22);
    doc.text(`Generated On: ${new Date().toISOString().split('T')[0]}`, 14, 28);

    let y = 38;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 5, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('#', 16, y);
    doc.text('Date & Location', 25, y);
    doc.text('Expense Account', 80, y);
    doc.text('Items Consumed', 125, y);
    doc.text('Total (Rs)', 165, y);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);

    let totalConsumption = 0;
    records.forEach((rec, idx) => {
      if (!rec) return;
      if (y > 275) { doc.addPage(); y = 20; }
      const date = rec.date || '';
      const location = rec.uses_for || '';
      const expenseAcc = rec.expense_account || '';
      const itemsStr = (rec.items || []).map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ');
      const val = parseFloat(rec.total_value || 0);
      totalConsumption += val;

      doc.text(String(idx + 1), 16, y);
      doc.text(`${date} | ${location}`.substring(0, 30), 25, y);
      doc.text(String(expenseAcc).substring(0, 22), 80, y);
      doc.text(String(itemsStr).substring(0, 25), 125, y);
      doc.text(`Rs. ${val.toFixed(2)}`, 165, y);
      y += 8;
    });

    y += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Material Consumption Value: Rs ${totalConsumption.toFixed(2)}`, 14, y);

    triggerPDFDownload(doc, `Material_Consumption_Report_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Consumption PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};
