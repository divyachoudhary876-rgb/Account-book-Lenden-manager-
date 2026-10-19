// frontend/src/utils/dashboardReportEngine.js

import jsPDF from 'jspdf';
import { StorageService } from './storageSync';
import { exportTruePDF } from './pdfDownloadEngine';

const resolveFirmId = (...args) => {
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string' && arg.trim() !== '' && !arg.includes('-')) return arg.trim();
    if (typeof arg === 'string' && arg.includes('FIRM')) return arg.trim();
    if (typeof arg === 'object') {
      const fId = arg.id || arg.firm_id || arg.firmId;
      if (fId) return String(fId).trim();
    }
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

const getFirmName = (firmInput) => {
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.firm_name || firmInput.name || firmInput.legal_name || 'Neelkanth Int Udyog';
  }
  return 'Neelkanth Int Udyog';
};

export const cleanTypographySpacing = (rawText) => {
  if (!rawText) return '';
  let str = String(rawText);
  str = str.replace(/\s*:\s*/g, ': ');
  str = str.replace(/\s*@\s*(?:rs\.?|₹)?\s*/gi, ' @ Rs ');
  str = str.replace(/\s*,\s*/g, ', ');
  str = str.replace(/\s*-\s*/g, ' - ');
  str = str.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  str = str.replace(/\s{2,}/g, ' ');
  return str.trim();
};

export const cleanAccountTitle = (rawName) => {
  if (!rawName) return '';
  let str = String(rawName).trim();
  if (/cash\s*in\s*hand/i.test(str) || /^cash$/i.test(str)) {
    return 'Cash in Hand';
  }
  str = str.replace(/\s*\([^)]*OK[^)]*\)/gi, '');
  str = str.replace(/\s*\[[^\]]*OK[^\]]*\]/gi, '');
  str = str.replace(/\s*\([^)]*![^)]*\)/gi, '');
  str = str.replace(/\s*\([^)]*<[^)]*\)/gi, '');
  str = str.replace(/\s*\(OK\s*!?.*$/gi, '');
  str = str.replace(/\s*\[OK\s*!?.*$/gi, '');
  return cleanTypographySpacing(str) || 'Account';
};

const getFirmAccounts = (firmId) => {
  return StorageService.getItem(`app_accounts_${firmId}`, []) || 
         StorageService.getItem(`account_heads_${firmId}`, []) || 
         StorageService.getItem('app_accounts', []) || 
         StorageService.getItem('app_account_heads', []) || [];
};

const getFirmInventory = (firmId) => {
  return StorageService.getItem(`inventory_items_${firmId}`, []) || 
         StorageService.getItem('inventory_items', []) || 
         StorageService.getItem('app_inventory', []) || [];
};

const getFirmConsumptionRecords = (firmId) => {
  return StorageService.getItem(`material_consumption_records_${firmId}`, []) || 
         StorageService.getItem(`material_consumptions_${firmId}`, []) || 
         StorageService.getItem('material_consumption_records', []) || 
         StorageService.getItem('material_consumptions', []) || [];
};

/**
 * 1. CASH & BANK REPORT PDF
 */
export const downloadDashboardCashBankReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const accounts = getFirmAccounts(firmId);
    const vouchers = StorageService.getItem(`app_vouchers_${firmId}`, []) || StorageService.getItem('app_vouchers', []) || [];

    const cashBankAccounts = accounts.filter(acc => {
      if (!acc) return false;
      const name = String(acc.account_name || acc.name || '').toLowerCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      return name.includes('cash') || name.includes('bank') || grp.includes('bank') || grp.includes('cash');
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dashboard Breakdown: Cash & Bank Accounts Statement`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Account / Bank Name', 30, y + 4.8);
    doc.text('Sub Group', 100, y + 4.8);
    doc.text('Net Balance (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalCashBank = 0;
    cashBankAccounts.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Account');
      const grp = acc.sub_group || acc.group || 'Cash-in-Hand / Bank Accounts';
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      let bal = acc.balance_type === 'Cr' ? -op : op;

      vouchers.forEach(v => {
        if (!v) return;
        const amt = parseFloat(v.amount || v.total_amount || 0);
        const dr = String(v.dr_account || '').toLowerCase();
        const cr = String(v.cr_account || '').toLowerCase();
        if (dr.includes(name.toLowerCase())) bal += amt;
        if (cr.includes(name.toLowerCase())) bal -= amt;
      });

      totalCashBank += bal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 35), 30, y);
      doc.text(String(grp).substring(0, 30), 100, y);
      doc.text(`${bal.toFixed(2)} ${bal < 0 ? 'Cr' : 'Dr'}`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Cash & Bank Liquidity: Rs ${totalCashBank.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Cash_Bank_Statement_${firmId}`);
  } catch (e) {
    console.error("Error generating Cash & Bank PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 2. STOCK VALUATION REPORT PDF
 */
export const downloadDashboardStockReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const inventory = getFirmInventory(firmId);

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dashboard Breakdown: Stock Valuation Report`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Item Name', 30, y + 4.8);
    doc.text('Unit', 95, y + 4.8);
    doc.text('Qty', 125, y + 4.8, { align: 'right' });
    doc.text('Rate (Rs)', 155, y + 4.8, { align: 'right' });
    doc.text('Total (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalValuation = 0;
    inventory.forEach((item, idx) => {
      if (!item) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const name = item.item_name || item.name || 'Item';
      const unit = item.unit || 'Units';
      const qty = parseFloat(item.current_stock || item.stock || item.current_qty || item.qty || 0);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const totalVal = qty * rate;
      totalValuation += totalVal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(String(name).substring(0, 30), 30, y);
      doc.text(String(unit), 95, y);
      doc.text(qty.toFixed(2), 125, y, { align: 'right' });
      doc.text(rate.toFixed(2), 155, y, { align: 'right' });
      doc.text(totalVal.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Stock Valuation: Rs ${totalValuation.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Stock_Valuation_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Stock PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 3. RECEIVABLES REPORT PDF
 */
export const downloadDashboardReceivablesReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const accounts = getFirmAccounts(firmId);

    const debtors = accounts.filter(acc => {
      if (!acc) return false;
      const type = String(acc.primary_type || acc.type || '').toUpperCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const isDebtor = grp.includes('debtor') || grp.includes('customer') || grp.includes('grahak') || grp.includes('lena');
      const isInvalid = grp.includes('expense') || grp.includes('stock') || grp.includes('inventory') || grp.includes('asset') || grp.includes('income');
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      return (type === 'ASSETS' || isDebtor) && !isInvalid && bal > 0;
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dashboard Breakdown: Receivables (Lena Baaki - Customers)`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Customer / Party Name', 30, y + 4.8);
    doc.text('Category', 105, y + 4.8);
    doc.text('Receivable (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalReceivables = 0;
    debtors.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Customer');
      const grp = acc.sub_group || acc.group || 'Sundry Debtors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      totalReceivables += bal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 38), 30, y);
      doc.text(String(grp).substring(0, 30), 105, y);
      doc.text(`${bal.toFixed(2)} ${acc.balance_type || 'Dr'}`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Receivables: Rs ${totalReceivables.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Receivables_Statement_${firmId}`);
  } catch (e) {
    console.error("Error generating Receivables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 4. PAYABLES REPORT PDF
 */
export const downloadDashboardPayablesReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const accounts = getFirmAccounts(firmId);

    const creditors = accounts.filter(acc => {
      if (!acc) return false;
      const type = String(acc.primary_type || acc.type || '').toUpperCase();
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const isCreditor = grp.includes('creditor') || grp.includes('supplier') || grp.includes('vendor') || grp.includes('thekedar') || grp.includes('dena');
      const isInvalid = grp.includes('expense') || grp.includes('stock') || grp.includes('inventory');
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      return (type === 'LIABILITIES' || isCreditor) && !isInvalid && bal !== 0;
    });

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dashboard Breakdown: Payables (Dena Baaki - Creditors & Suppliers)`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Supplier / Vendor Name', 30, y + 4.8);
    doc.text('Category', 105, y + 4.8);
    doc.text('Payable (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let totalPayables = 0;
    creditors.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Supplier');
      const grp = acc.sub_group || acc.group || 'Sundry Creditors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      totalPayables += Math.abs(bal);

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 38), 30, y);
      doc.text(String(grp).substring(0, 30), 105, y);
      doc.text(`${bal.toFixed(2)} ${acc.balance_type || 'Cr'}`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Payables: Rs ${totalPayables.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Payables_Statement_${firmId}`);
  } catch (e) {
    console.error("Error generating Payables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 5. MATERIAL CONSUMPTION REPORT PDF
 */
export const downloadDashboardConsumptionReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const records = getFirmConsumptionRecords(firmId);

    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dashboard Breakdown: Material Consumption History`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 16, y + 4.8);
    doc.text('Date & Location', 26, y + 4.8);
    doc.text('Expense Account', 85, y + 4.8);
    doc.text('Items Consumed', 130, y + 4.8);
    doc.text('Total (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    let totalConsumption = 0;
    records.forEach((rec, idx) => {
      if (!rec) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const date = rec.date || '';
      const location = rec.uses_for || '';
      const expenseAcc = cleanAccountTitle(rec.expense_account || '');
      const itemsStr = (rec.items || []).map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ');
      const val = parseFloat(rec.total_value || 0);
      totalConsumption += val;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(`${date} | ${location}`.substring(0, 28), 26, y);
      doc.text(expenseAcc.substring(0, 22), 85, y);
      doc.text(String(itemsStr).substring(0, 25), 130, y);
      doc.text(val.toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Material Consumption Value: Rs ${totalConsumption.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Material_Consumption_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Consumption PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};
