// frontend/src/utils/pdfDownloadEngine.js
import { jsPDF } from 'jspdf';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Universal safe firm name resolver
 */
const getCleanFirmName = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || 'Neelkanth Groups';
  }
  return 'Neelkanth Groups';
};

/**
 * Universal True PDF Exporter (Works natively on Mobile Apps & Web Browsers)
 */
export const exportTruePDF = async (doc, rawFileName = 'Report') => {
  const cleanName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${cleanName}_${Date.now()}.pdf`;

  try {
    const pdfOutput = doc.output('datauristring');

    // 1. Mobile Capacitor Native Environment (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const base64Data = pdfOutput.split(',')[1];
      const writeResult = await Filesystem.writeFile({
        path: fullFileName,
        data: base64Data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      if (writeResult && writeResult.uri) {
        await Share.share({
          title: cleanName,
          text: `Account Book PDF Report: ${cleanName}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share PDF Report'
        });
        return { success: true };
      }
    }

    // 2. Standard Web Browser Download
    doc.save(fullFileName);
    return { success: true };

  } catch (err) {
    console.error('True PDF Export Error:', err);
    throw new Error('Failed to generate professional PDF file.');
  }
};

/**
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

  const doc = new jsPDF();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Account Statement: ${partyName}`, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
  y += 10;

  // Table Headers
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Date', 16, y + 6);
  doc.text('Particulars', 45, y + 6);
  doc.text('Dr (Rs)', 125, y + 6, { align: 'right' });
  doc.text('Cr (Rs)', 152, y + 6, { align: 'right' });
  doc.text('Balance', 185, y + 6, { align: 'right' });
  y += 10;

  // Table Rows
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  txs.forEach((t) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
    }

    doc.text(String(t.date || '-'), 16, y);
    doc.text(String(`${t.voucher_type || 'TX'} #${t.voucher_number || ''}`), 45, y);
    doc.text(t.debit > 0 ? t.debit.toFixed(2) : '-', 125, y, { align: 'right' });
    doc.text(t.credit > 0 ? t.credit.toFixed(2) : '-', 152, y, { align: 'right' });
    doc.text(`${(t.runningBalance || 0).toFixed(2)} ${t.balanceType || 'Dr'}`, 185, y, { align: 'right' });
    y += 7;
  });

  return await exportTruePDF(doc, `Statement_${partyName}`);
};

/**
 * 2. FINANCIAL STATEMENTS REPORT (Trial Balance, Trading, P&L) - Flexible Resolver
 */
export const downloadFinancialStatementsReport = async (param1, param2, param3) => {
  let firmInput = 'Neelkanth Groups';
  let reportData = {};
  let activeTab = 'TB';

  [param1, param2, param3].forEach(arg => {
    if (!arg) return;
    if (typeof arg === 'object' && (arg.legal_name || arg.trade_name || arg.name || arg.id)) {
      firmInput = arg;
    } else if (typeof arg === 'object' && (arg.trialBalance || arg.totalDebit !== undefined || arg.trading)) {
      reportData = arg;
    } else if (typeof arg === 'string') {
      const upper = arg.toUpperCase();
      if (['TB', 'TRADING', 'PNL', 'TRIAL_BALANCE', '1', '2', '3'].includes(upper)) {
        activeTab = upper;
      } else {
        firmInput = arg;
      }
    }
  });

  const firmName = getCleanFirmName(firmInput);
  const rows = (reportData.trialBalance && Array.isArray(reportData.trialBalance)) ? reportData.trialBalance : [];

  let reportTitle = 'Trial Balance Report';
  if (activeTab === 'TRADING' || activeTab === '2') reportTitle = 'Trading Account';
  if (activeTab === 'PNL' || activeTab === '3') reportTitle = 'Profit & Loss Statement';

  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(reportTitle, 14, y);
  y += 10;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('Account Name', 16, y + 6);
  doc.text('Category', 95, y + 6);
  doc.text('Debit (Rs)', 140, y + 6, { align: 'right' });
  doc.text('Credit (Rs)', 185, y + 6, { align: 'right' });
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  rows.forEach((row) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
    }
    const deb = row.dr || row.debit || 0;
    const cr = row.cr || row.credit || 0;

    doc.text(String(row.name || row.account_name || 'Account'), 16, y);
    doc.text(String(row.category || row.primary_type || 'General'), 95, y);
    doc.text(deb > 0 ? deb.toFixed(2) : '-', 140, y, { align: 'right' });
    doc.text(cr > 0 ? cr.toFixed(2) : '-', 185, y, { align: 'right' });
    y += 7;
  });

  // Totals Footer
  y += 4;
  doc.setFont(undefined, 'bold');
  doc.text('Grand Total:', 95, y);
  doc.text(`Rs ${(reportData?.totalDebit || 0).toFixed(2)}`, 140, y, { align: 'right' });
  doc.text(`Rs ${(reportData?.totalCredit || 0).toFixed(2)}`, 185, y, { align: 'right' });

  return await exportTruePDF(doc, reportTitle);
};

// Universal Aliases for Financial Reports compatibility
export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};

/**
 * 3. JOURNAL REGISTER EXPORT PDF
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const rows = Array.isArray(vouchers) ? vouchers : [];

  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Journal Daybook Register', 14, y);
  y += 10;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.text('#', 16, y + 6);
  doc.text('Date', 26, y + 6);
  doc.text('Reference', 60, y + 6);
  doc.text('Particulars (Dr / Cr)', 100, y + 6);
  doc.text('Amount (Rs)', 185, y + 6, { align: 'right' });
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  rows.forEach((vch, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
    }
    const amt = parseFloat(vch.amount || 0);

    doc.text(String(idx + 1), 16, y);
    doc.text(String(vch.voucher_date || vch.date || '-'), 26, y);
    doc.text(String(vch.reference_no || vch.voucher_number || 'VCH'), 60, y);
    doc.text(String(`Dr: ${vch.dr_account || ''} | Cr: ${vch.cr_account || ''}`), 100, y);
    doc.text(amt.toFixed(2), 185, y, { align: 'right' });
    y += 8;
  });

  return await exportTruePDF(doc, 'Journal_Register');
};

/**
 * 4. PROFESSIONAL TAX INVOICE GENERATOR
 */
export const generateProfessionalInvoicePDF = async (firmInput, invoice = {}) => {
  const firmName = getCleanFirmName(firmInput);
  const invNumber = invoice?.invoice_number || ('INV-' + Date.now());
  const grandTotal = parseFloat(invoice?.grand_total || invoice?.total_amount || 0);

  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Tax Invoice: ${invNumber}`, 14, y);
  y += 10;

  doc.text(`Grand Total: Rs ${grandTotal.toFixed(2)}`, 14, y);

  return await exportTruePDF(doc, `Invoice_${invNumber}`);
};
