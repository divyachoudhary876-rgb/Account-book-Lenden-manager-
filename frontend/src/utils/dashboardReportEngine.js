// frontend/src/utils/dashboardReportEngine.js

import jsPDF from 'jspdf';
import { IDBStorage } from './indexedDbStorage';
import { exportTruePDF } from './pdfDownloadEngine';
import { getDynamicDashboardMetrics, resolveFirmId } from './dashboardDataEngine';
import { getStockItemsByFirm, getFirmItemStock } from './stockInventoryEngine';

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

/**
 * 1. CASH & BANK REPORT PDF
 */
export const downloadDashboardCashBankReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    
    const accounts = IDBStorage.getItem(`app_accounts_${firmId}`, []) || 
                     IDBStorage.getItem(`account_heads_${firmId}`, []) || [];

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

    let evaluatedTotal = 0;
    cashBankAccounts.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Account');
      const grp = acc.sub_group || acc.group || 'Cash-in-Hand / Bank Accounts';
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      const bal = acc.balance_type === 'Cr' ? -op : op;
      evaluatedTotal += bal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 35), 30, y);
      doc.text(String(grp).substring(0, 30), 100, y);
      doc.text(`${Math.abs(bal).toFixed(2)} ${bal < 0 ? 'Cr' : 'Dr'}`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const finalTotal = metrics?.cashAndBank !== undefined ? metrics.cashAndBank : evaluatedTotal;
    doc.text(`Total Cash & Bank Liquidity: Rs ${finalTotal.toFixed(2)}`, 193, y, { align: 'right' });

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
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    const inventory = getStockItemsByFirm(firmId);

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
      const qty = getFirmItemStock(firmId, name);
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
    const finalStockTotal = metrics?.totalStockValuation > 0 ? metrics.totalStockValuation : totalValuation;
    doc.text(`Total Stock Valuation: Rs ${finalStockTotal.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Stock_Valuation_Report_${firmId}`);
  } catch (e) {
    console.error("Error generating Stock PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 3. RECEIVABLES REPORT PDF (STRICTLY SUNDRY DEBTORS / CUSTOMERS ONLY - NO ASSETS/BANK/CASH/EXPENSES)
 */
export const downloadDashboardReceivablesReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    const accounts = IDBStorage.getItem(`app_accounts_${firmId}`, []) || IDBStorage.getItem(`account_heads_${firmId}`, []) || [];

    const debtors = accounts.filter(acc => {
      if (!acc) return false;
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const name = String(acc.account_name || acc.name || '').toLowerCase();
      
      // STRICT EXCLUSION: Never include Cash, Bank, Fixed Assets, Expenses, or Creditors
      const isCashOrBank = name.includes('cash') || name.includes('bank') || grp.includes('bank') || grp.includes('cash');
      const isAssetOrExpense = grp.includes('fixed asset') || grp.includes('expense') || grp.includes('stock') || grp.includes('inventory');
      const isCreditor = grp.includes('creditor') || grp.includes('supplier') || grp.includes('thekedar') || grp.includes('dena');
      
      if (isCashOrBank || isAssetOrExpense || isCreditor) return false;

      // Must explicitly be a Customer / Debtor / Grahak / Lena account with positive Dr balance
      const isCustomerGroup = grp.includes('debtor') || grp.includes('customer') || grp.includes('grahak') || grp.includes('lena');
      
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      const bal = acc.balance_type === 'Cr' ? -op : op;

      return isCustomerGroup && bal > 0;
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

    let evaluatedRecv = 0;
    debtors.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Customer');
      const grp = acc.sub_group || acc.group || 'Sundry Debtors';
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      const bal = acc.balance_type === 'Cr' ? -op : op;
      evaluatedRecv += bal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 38), 30, y);
      doc.text(String(grp).substring(0, 30), 105, y);
      doc.text(`${bal.toFixed(2)} Dr`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const finalRecvTotal = metrics?.receivables !== undefined ? metrics.receivables : evaluatedRecv;
    doc.text(`Total Receivables: Rs ${finalRecvTotal.toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Receivables_Statement_${firmId}`);
  } catch (e) {
    console.error("Error generating Receivables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 4. PAYABLES REPORT PDF (STRICTLY SUNDRY CREDITORS, SUPPLIERS, THEKEDAR & LABOUR ONLY - NO ASSETS/EXPENSES)
 */
export const downloadDashboardPayablesReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    const accounts = IDBStorage.getItem(`app_accounts_${firmId}`, []) || IDBStorage.getItem(`account_heads_${firmId}`, []) || [];

    const creditors = accounts.filter(acc => {
      if (!acc) return false;
      const grp = String(acc.sub_group || acc.group || '').toLowerCase();
      const name = String(acc.account_name || acc.name || '').toLowerCase();

      // STRICT EXCLUSION: Never include Cash, Bank, Fixed Assets, or General Expenses
      const isCashOrBank = name.includes('cash') || name.includes('bank') || grp.includes('bank') || grp.includes('cash');
      const isAssetOrExpense = grp.includes('fixed asset') || grp.includes('expense') || grp.includes('stock') || grp.includes('inventory');
      
      if (isCashOrBank || isAssetOrExpense) return false;

      // Must explicitly be a Creditor / Supplier / Thekedar / Labour account with payable balance
      const isCreditorGroup = grp.includes('creditor') || grp.includes('supplier') || grp.includes('vendor') || grp.includes('thekedar') || grp.includes('dena') || grp.includes('labor') || grp.includes('labour') || name.includes('thekedar') || name.includes('supplier');
      
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      const bal = acc.balance_type === 'Cr' ? -op : op;

      return isCreditorGroup && bal < 0;
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

    let evaluatedPayable = 0;
    creditors.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.account_name || acc.name || 'Supplier');
      const grp = acc.sub_group || acc.group || 'Sundry Creditors';
      const op = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      const bal = Math.abs(acc.balance_type === 'Cr' ? -op : op);
      evaluatedPayable += bal;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(name.substring(0, 38), 30, y);
      doc.text(String(grp).substring(0, 30), 105, y);
      doc.text(`${bal.toFixed(2)} Cr`, 193, y, { align: 'right' });
      y += 6;
    });

    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const finalPayableTotal = metrics?.payables !== undefined ? metrics.payables : evaluatedPayable;
    doc.text(`Total Payables: Rs ${finalPayableTotal.toFixed(2)}`, 193, y, { align: 'right' });

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
    
    const records = IDBStorage.getItem(`material_consumption_records_${firmId}`, []) || 
                    IDBStorage.getItem(`universal_material_adjustments_${firmId}`, []) ||
                    IDBStorage.getItem('material_consumption_records', []) || [];

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
      const itemsStr = (rec.items || []).map(i => `${i.name || i.item_name} (${i.qty || i.quantity} ${i.unit})`).join(', ');
      const val = parseFloat(rec.total_value || rec.amount || 0);
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
  }code: `...`
  } catch (e) {
    console.error("Error generating Consumption PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};
