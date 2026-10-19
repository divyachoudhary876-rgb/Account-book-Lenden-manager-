// frontend/src/utils/dashboardReportEngine.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

    const tableRows = cashBankAccounts.map((acc, idx) => {
      const name = acc.account_name || acc.name || 'Account';
      const grp = acc.sub_group || acc.group || 'Cash-in-Hand / Bank Accounts';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      return [idx + 1, name, grp, `Rs. ${bal.toFixed(2)}`];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Account / Bank Name', 'Sub Group', 'Net Balance (Rs)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Cash_Bank_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Cash & Bank PDF:", e);
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

    let totalValuation = 0;
    const tableRows = inventory.map((item, idx) => {
      if (!item) return null;
      const name = item.item_name || item.name || 'Item';
      const unit = item.unit || 'Units';
      const qty = parseFloat(item.current_stock || item.stock || item.current_qty || item.qty || 0);
      const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
      const totalVal = qty * rate;
      totalValuation += totalVal;

      return [idx + 1, name, unit, qty.toFixed(2), rate.toFixed(2), totalVal.toFixed(2)];
    }).filter(Boolean);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Item Name', 'Unit', 'Quantity', 'Rate (Rs)', 'Total Value (Rs)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Stock_Valuation_Report_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Stock PDF:", e);
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

    let totalReceivables = 0;
    const tableRows = debtors.map((acc, idx) => {
      const name = acc.account_name || acc.name || 'Customer';
      const grp = acc.sub_group || acc.group || 'Sundry Debtors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      if (bal > 0) totalReceivables += bal;

      return [idx + 1, name, grp, `Rs. ${bal.toFixed(2)}`];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Customer / Party Name', 'Category', 'Receivable Amount (Rs)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Receivables_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Receivables PDF:", e);
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

    let totalPayables = 0;
    const tableRows = creditors.map((acc, idx) => {
      const name = acc.account_name || acc.name || 'Supplier';
      const grp = acc.sub_group || acc.group || 'Sundry Creditors';
      const bal = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));
      if (bal > 0) totalPayables += bal;

      return [idx + 1, name, grp, `Rs. ${bal.toFixed(2)}`];
    });

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Supplier / Vendor Name', 'Category', 'Payable Amount (Rs)']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Payables_Statement_${firmId}.pdf`);
  } catch (e) {
    console.error("Error generating Payables PDF:", e);
  }
};
