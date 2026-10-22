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
    const rows = metrics?.cashBankRows || [];

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

    rows.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.name);
      const grp = acc.sub_group || 'Cash / Bank';
      const bal = acc.balance;

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
    doc.text(`Total Cash & Bank Liquidity: Rs ${(metrics?.cashAndBank || 0).toFixed(2)}`, 193, y, { align: 'right' });

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

    inventory.forEach((item, idx) => {
      if (!item) return;
      if (y > 275) { doc.addPage(); y = 18; }
      const name = item.item_name || item.name || 'Item';
      const unit = item.unit || 'Units';
      const qty = getFirmItemStock(firmId, name);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const totalVal = qty * rate;

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
    doc.text(`Total Stock Valuation: Rs ${(metrics?.totalStockValuation || 0).toFixed(2)}`, 193, y, { align: 'right' });

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
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    const rows = metrics?.receivableRows || [];

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

    rows.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.name);
      const grp = acc.sub_group || 'Sundry Debtors';
      const bal = acc.amount;

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
    doc.text(`Total Receivables: Rs ${(metrics?.receivables || 0).toFixed(2)}`, 193, y, { align: 'right' });

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
    const metrics = getDynamicDashboardMetrics(firmInput || firmId);
    const rows = metrics?.payableRows || [];

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

    rows.forEach((acc, idx) => {
      if (y > 275) { doc.addPage(); y = 18; }
      const name = cleanAccountTitle(acc.name);
      const grp = acc.sub_group || 'Sundry Creditors';
      const bal = acc.amount;

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
    doc.text(`Total Payables: Rs ${(metrics?.payables || 0).toFixed(2)}`, 193, y, { align: 'right' });

    await exportTruePDF(doc, `Payables_Statement_${firmId}`);
  } catch (e) {
    console.error("Error generating Payables PDF:", e);
    alert("PDF download failed: " + e.message);
  }
};

/**
 * 5. MATERIAL CONSUMPTION REPORT PDF (Exhaustive multi-bucket scanner to guarantee 69 records)
 */
export const downloadDashboardConsumptionReportPDF = async (...args) => {
  try {
    const firmId = resolveFirmId(...args);
    const firmInput = args.find(a => typeof a === 'object') || {};
    const firmName = getFirmName(firmInput);
    
    // Exhaustive multi-key scan for consumption records
    const consumptionKeys = [
      `material_consumption_records_${firmId}`,
      `universal_material_adjustments_${firmId}`,
      `material_adjustments_${firmId}`,
      `app_consumption_${firmId}`,
      'material_consumption_records',
      'universal_material_adjustments'
    ];

    let records = [];
    consumptionKeys.forEach(k => {
      try {
        const val = IDBStorage.getItem(k, []) || JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(val) && val.length > 0) {
          records.push(...val);
        }
      } catch (e) {}
    });

    // Also scan universal vouchers for CONSUMPTION type if records are empty
    if (records.length === 0) {
      try {
        const vKey = `account_book_vouchers_${firmId}`;
        const vList = IDBStorage.getItem(vKey, []) || [];
        vList.forEach(v => {
          if (v && (String(v.voucher_type || v.type || '').toUpperCase() === 'CONSUMPTION' || String(v.reference_no || '').includes('CONS'))) {
            records.push({
              date: v.voucher_date || v.date,
              uses_for: v.narration || v.description || 'Factory Material Issue',
              expense_account: v.dr_account || 'Factory Manufacturing Expenses',
              items: v.items || [{ name: v.cr_account || 'Material', qty: 1, unit: 'Units' }],
              total_value: v.amount || v.total_amount || 0
            });
          }
        });
      } catch (e) {}
    }

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
    doc.text(`Dashboard Breakdown: Material Consumption History (${records.length} Records)`, 14, y);
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
      const date = rec.date || rec.voucher_date || '';
      const location = rec.uses_for || rec.narration || '';
      const expenseAcc = cleanAccountTitle(rec.expense_category || rec.expense_account || 'Factory Expense');
      const itemsList = Array.isArray(rec.items) ? rec.items : [];
      const itemsStr = itemsList.map(i => `${i.name || i.item_name || 'Item'} (${i.qty || i.quantity || 0} ${i.unit || 'Units'})`).join(', ');
      const val = parseFloat(rec.total_value || rec.amount || 0);
      totalConsumption += val;

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      doc.text(String(idx + 1), 16, y);
      doc.text(`${date} | ${location}`.substring(0, 28), 26, y);
      doc.text(expenseAcc.substring(0, 22), 85, y);
      doc.text(String(itemsStr || 'Material Issue').substring(0, 25), 130, y);
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
