// frontend/src/utils/pdfDownloadEngine.js

import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
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
 * Safely convert ArrayBuffer to Base64 without text encoding corruption
 */
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * 100% Corruption-Free True PDF Exporter (ArrayBuffer Binary Stream)
 */
export const exportTruePDF = async (doc, rawFileName = 'Report') => {
  const cleanName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${cleanName}_${Date.now()}.pdf`;

  try {
    const pdfArrayBuffer = doc.output('arraybuffer');

    // 1. Mobile Capacitor Native Environment (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const base64Data = arrayBufferToBase64(pdfArrayBuffer);
      const writeResult = await Filesystem.writeFile({
        path: fullFileName,
        data: base64Data,
        directory: Directory.Cache
      });

      if (writeResult && writeResult.uri) {
        await Share.share({
          title: cleanName,
          text: `Account Book PDF Report: ${cleanName}`,
          url: writeResult.uri,
          dialogTitle: 'Open or Save PDF Report'
        });
        return { success: true };
      }
    }

    // 2. Standard Web Browser Download via Blob
    const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.setAttribute('download', fullFileName);
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return { success: true };

  } catch (err) {
    console.error('True PDF Binary Export Error:', err);
    throw new Error('Failed to generate uncorrupted PDF file.');
  }
};

/**
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT (With Persistent Multi-Page Headers)
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  let pageNum = 1;

  const printHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Account Statement: ${partyName}`, 14, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 8;

    // Table Header Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('Date', 17, y + 5);
    doc.text('Particulars & Description', 40, y + 5);
    doc.text('Debit (Rs)', 132, y + 5, { align: 'right' });
    doc.text('Credit (Rs)', 162, y + 5, { align: 'right' });
    doc.text('Balance (Rs)', 193, y + 5, { align: 'right' });
    y += 10;
  };

  printHeader();

  doc.setTextColor(15, 23, 42);

  txs.forEach((t, index) => {
    const mainTitle = `${t.voucher_type || 'TX'} #${t.voucher_number || t.reference_no || ''}`;
    const descText = t.narration || '';
    const splitDesc = descText ? doc.splitTextToSize(descText, 85) : [];
    const rowHeight = 7 + (splitDesc.length > 0 ? (splitDesc.length * 3.5) : 0);

    // Page Break with Header Repeat
    if (y + rowHeight > 280) {
      doc.addPage();
      pageNum += 1;
      y = 18;
      printHeader();
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3.5, 182, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(t.date || '-'), 17, y);
    doc.text(mainTitle, 40, y);

    const deb = Number(t.debit || 0);
    const cr = Number(t.credit || 0);
    const runBal = Number(t.runningBalance || 0);

    doc.text(deb > 0 ? deb.toFixed(2) : '-', 132, y, { align: 'right' });
    doc.text(cr > 0 ? cr.toFixed(2) : '-', 162, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${runBal.toFixed(2)} ${t.balanceType || 'Dr'}`, 193, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (splitDesc.length > 0) {
      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(splitDesc, 40, y);
      doc.setTextColor(15, 23, 42);
      y += (splitDesc.length * 3.5);
    } else {
      y += 5;
    }
  });

  return await exportTruePDF(doc, `Statement_${partyName}`);
};

/**
 * 2. FINANCIAL STATEMENTS REPORT (Trial Balance, P&L, Balance Sheet)
 */
export const downloadFinancialStatementsReport = async (param1, param2, param3) => {
  let firmInput = 'Neelkanth Groups';
  let reportData = {};
  let activeTab = 'TRIAL_BALANCE';

  [param1, param2, param3].forEach(arg => {
    if (!arg) return;
    if (typeof arg === 'object') {
      if (arg.legal_name || arg.trade_name || arg.name || arg.id) {
        firmInput = arg;
      }
      if (arg.trialBalance || arg.trading || arg.balanceSheet || arg.gstSummary || arg.pnl) {
        reportData = arg;
      }
    } else if (typeof arg === 'string') {
      const upper = arg.toUpperCase();
      if (['TRIAL_BALANCE', 'TRADING', 'PNL', 'BALANCE_SHEET', 'GST_SUMMARY', 'TB', '1', '2', '3', '4', '5'].includes(upper)) {
        if (upper === '1') activeTab = 'TRIAL_BALANCE';
        else if (upper === '2') activeTab = 'TRADING';
        else if (upper === '3') activeTab = 'PNL';
        else if (upper === '4') activeTab = 'BALANCE_SHEET';
        else if (upper === '5') activeTab = 'GST_SUMMARY';
        else activeTab = upper;
      } else {
        firmInput = arg;
      }
    }
  });

  const firmName = getCleanFirmName(firmInput);
  let reportTitle = 'Trial Balance Report';
  if (activeTab === 'TRADING' || activeTab === '2') reportTitle = 'Trading Account Report';
  else if (activeTab === 'PNL' || activeTab === '3') reportTitle = 'Profit & Loss Statement';
  else if (activeTab === 'BALANCE_SHEET' || activeTab === '4') reportTitle = 'Balance Sheet (Assets & Liabilities)';
  else if (activeTab === 'GST_SUMMARY' || activeTab === '5') reportTitle = 'GSTR Tax Summary Report';

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  let pageNum = 1;

  const printReportTop = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 8;
  };

  const printTBHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('Account Name', 17, y + 5);
    doc.text('Category', 95, y + 5);
    doc.text('Debit (Rs)', 152, y + 5, { align: 'right' });
    doc.text('Credit (Rs)', 193, y + 5, { align: 'right' });
    y += 9.5;
  };

  printReportTop();

  // DEFAULT TRIAL BALANCE EXPORT (With Multi-Page Headers)
  if (activeTab === 'TRIAL_BALANCE' || activeTab === 'TB') {
    printTBHeader();
    const rows = (reportData.trialBalance && Array.isArray(reportData.trialBalance)) ? reportData.trialBalance : [];

    rows.forEach((row, index) => {
      if (y > 275) {
        doc.addPage();
        pageNum += 1;
        y = 18;
        printReportTop();
        printTBHeader();
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6.5, 'F');
      }

      const deb = Number(row.dr || row.debit || 0);
      const cr = Number(row.cr || row.credit || 0);
      const accName = String(row.name || row.account_name || 'Account');
      const cat = String(row.category || row.primary_type || 'General');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      // Truncate name if too long so it never clashes with Category
      const truncatedName = doc.splitTextToSize(accName, 75)[0] || accName;
      doc.text(truncatedName, 17, y);
      doc.text(cat, 95, y);

      doc.text(deb > 0 ? deb.toFixed(2) : '-', 152, y, { align: 'right' });
      doc.text(cr > 0 ? cr.toFixed(2) : '-', 193, y, { align: 'right' });
      y += 6.5;
    });

    // Grand Total Footer
    if (y > 270) {
      doc.addPage();
      pageNum += 1;
      y = 18;
      printReportTop();
    }

    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Grand Total:', 95, y);
    doc.text(`Rs ${(reportData?.totalDebit || 0).toFixed(2)}`, 152, y, { align: 'right' });
    doc.text(`Rs ${(reportData?.totalCredit || 0).toFixed(2)}`, 193, y, { align: 'right' });

  // BALANCE SHEET EXPORT
  } else if (activeTab === 'BALANCE_SHEET' || activeTab === '4') {
    const assets = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.assets)) ? reportData.balanceSheet.assets : [];
    const liabilities = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.liabilities)) ? reportData.balanceSheet.liabilities : [];

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Assets (Property & Current Assets)', 17, y + 5);
    doc.text('Amount (Rs)', 193, y + 5, { align: 'right' });
    y += 9.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    assets.forEach((a, index) => {
      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6.5, 'F');
      }
      doc.text(String(a.name || 'Asset'), 17, y);
      doc.text(Number(a.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6.5;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Assets: Rs ${(reportData.balanceSheet?.totalAssets || 0).toFixed(2)}`, 193, y, { align: 'right' });
    y += 10;

    if (y > 240) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Liabilities & Capital', 17, y + 5);
    doc.text('Amount (Rs)', 193, y + 5, { align: 'right' });
    y += 9.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    liabilities.forEach((l, index) => {
      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3.5, 182, 6.5, 'F');
      }
      doc.text(String(l.name || 'Liability'), 17, y);
      doc.text(Number(l.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6.5;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Liabilities: Rs ${(reportData.balanceSheet?.totalLiabilities || 0).toFixed(2)}`, 193, y, { align: 'right' });
  }

  return await exportTruePDF(doc, reportTitle);
};

export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};

/**
 * 3. JOURNAL REGISTER EXPORT PDF (Strict Fixed Column Coordinates - ZERO OVERLAP)
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const rows = Array.isArray(vouchers) ? vouchers : [];

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  let pageNum = 1;

  const printJournalHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text('Journal Daybook Register', 14, y);
    y += 5;

    doc.setFontSize(8.5);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 8;

    // Table Header Bar (Width: 182mm)
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    doc.text('#', 17, y + 5);
    doc.text('Date', 26, y + 5);
    doc.text('Reference No', 48, y + 5);
    doc.text('Accounts & Particulars', 88, y + 5);
    doc.text('Amount (Rs)', 193, y + 5, { align: 'right' });
    y += 9.5;
  };

  printJournalHeader();

  rows.forEach((vch, idx) => {
    const rawRef = String(vch.reference_no || vch.voucher_number || vch.id || 'VCH');
    // Truncate ref to 16 characters or 36mm width max so it NEVER collides with column at x=88
    const cleanRef = rawRef.length > 17 ? (rawRef.slice(0, 16) + '..') : rawRef;

    const vType = vch.voucher_type || vch.type || 'JOURNAL';
    const drName = vch.dr_account || vch.dr_party || 'Dr Account';
    const crName = vch.cr_account || vch.cr_party || 'Cr Account';

    // Description text (items or narration)
    const itemsList = Array.isArray(vch.items) ? vch.items : [];
    let itemStr = itemsList.map(it => `${it.itemName} (Qty: ${it.qty} @ Rs ${it.rate})`).join(', ');
    const noteText = vch.narration ? (itemStr ? `${itemStr} - ${vch.narration}` : vch.narration) : itemStr;

    // Restrict Particulars width to 72mm max (x=88 to x=160), leaving plenty of space before Amount at x=193
    const mainLine = `[${vType}] Dr: ${drName} | Cr: ${crName}`;
    const splitMainLine = doc.splitTextToSize(mainLine, 72);
    const splitNote = noteText ? doc.splitTextToSize(noteText, 72) : [];

    const rowHeight = 6 + (splitMainLine.length * 3.2) + (splitNote.length * 3);

    // Multi-page break handling
    if (y + rowHeight > 280) {
      doc.addPage();
      pageNum += 1;
      y = 18;
      printJournalHeader();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3.5, 182, rowHeight, 'F');
    }

    const amt = parseFloat(vch.amount || vch.total_amount || 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    // Column 1: Index
    doc.text(String(idx + 1), 17, y);

    // Column 2: Date
    doc.text(String(vch.voucher_date || vch.date || '-'), 26, y);

    // Column 3: Reference No (Strict boundary at x=48)
    doc.text(cleanRef, 48, y);

    // Column 4: Particulars (Strict boundary at x=88)
    doc.text(splitMainLine, 88, y);

    // Column 5: Amount (Strict right align at x=193)
    doc.setFont('helvetica', 'bold');
    doc.text(amt.toFixed(2), 193, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Sub-text Note/Narration below main line
    if (splitNote.length > 0) {
      const noteY = y + (splitMainLine.length * 3.2);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(splitNote, 88, noteY);
      doc.setTextColor(15, 23, 42);
    }

    y += rowHeight;
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

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tax Invoice: ${invNumber}`, 14, y);
  y += 9;

  doc.setFontSize(9.5);
  doc.text(`Grand Total: Rs ${grandTotal.toFixed(2)}`, 14, y);

  return await exportTruePDF(doc, `Invoice_${invNumber}`);
};
