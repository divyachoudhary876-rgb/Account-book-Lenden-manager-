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
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'Neelkanth Groups';
  }
  return 'Neelkanth Groups';
};

/**
 * Ultra-Robust Typography & Spacing Normalizer
 * Eliminates weird spacing around colons, rates, parentheses, and multiple spaces
 */
export const cleanTypographySpacing = (rawText) => {
  if (!rawText) return '';
  let str = String(rawText);

  // Normalize colon spacing: "Issue : 100" -> "Issue: 100"
  str = str.replace(/\s*:\s*/g, ': ');

  // Normalize rate symbol spacing: "@ 102" or "@Rs 102" -> " @ Rs "
  str = str.replace(/\s*@\s*(?:rs\.?|â‚¹)?\s*/gi, ' @ Rs ');

  // Normalize commas and hyphens
  str = str.replace(/\s*,\s*/g, ', ');
  str = str.replace(/\s*-\s*/g, ' - ');

  // Clean brackets inner spacing: "( 141 Liters )" -> "(141 Liters)"
  str = str.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  // Collapse multiple whitespaces/tabs into a single neat space
  str = str.replace(/\s{2,}/g, ' ');

  return str.trim();
};

/**
 * Ultra-Robust Account Name Sanitizer (Completely eliminates '(OK !<)', '(OK !-)', etc.)
 */
const cleanAccountTitle = (rawName) => {
  if (!rawName) return '';
  let str = String(rawName).trim();

  // Special case: Cash account ko hamesha pure 'Cash in Hand' me convert karein
  if (/cash\s*in\s*hand/i.test(str) || /^cash$/i.test(str)) {
    return 'Cash in Hand';
  }

  // Remove any bracket containing 'OK', exclamation marks, or comparison symbols
  str = str.replace(/\s*\([^)]*OK[^)]*\)/gi, '');
  str = str.replace(/\s*\[[^\]]*OK[^\]]*\]/gi, '');
  str = str.replace(/\s*\([^)]*![^)]*\)/gi, '');
  str = str.replace(/\s*\([^)]*<[^)]*\)/gi, '');
  str = str.replace(/\s*\(OK\s*!?.*$/gi, '');
  str = str.replace(/\s*\[OK\s*!?.*$/gi, '');

  return cleanTypographySpacing(str) || 'Account';
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
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT (A4 Portrait)
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const cleanParty = cleanAccountTitle(partyName);
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

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
    doc.text(`Account Statement: ${cleanParty}`, 14, y);
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
    doc.text('Particulars & Description', 38, y + 4.8);
    doc.text('Debit (Rs)', 132, y + 4.8, { align: 'right' });
    doc.text('Credit (Rs)', 162, y + 4.8, { align: 'right' });
    doc.text('Balance (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();

  txs.forEach((t, index) => {
    const rawTitle = cleanTypographySpacing(`${t.voucher_type || 'TX'} #${t.voucher_number || t.reference_no || ''}`);
    const descText = cleanTypographySpacing(t.narration || '');

    const splitTitle = doc.splitTextToSize(rawTitle, 68);
    const splitDesc = descText ? doc.splitTextToSize(descText, 68) : [];
    const totalLines = splitTitle.length + splitDesc.length;
    const rowHeight = Math.max(7, 3 + (totalLines * 3.4));

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

    doc.text(String(t.date || '-'), 16, y);
    doc.text(splitTitle, 38, y);

    const deb = Number(t.debit || 0);
    const cr = Number(t.credit || 0);
    const runBal = Number(t.runningBalance || 0);

    doc.text(deb > 0 ? deb.toFixed(2) : '-', 132, y, { align: 'right' });
    doc.text(cr > 0 ? cr.toFixed(2) : '-', 162, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${runBal.toFixed(2)} ${t.balanceType || 'Dr'}`, 193, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (splitDesc.length > 0) {
      const descY = y + (splitTitle.length * 3.4);
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(splitDesc, 38, descY);
      doc.setTextColor(15, 23, 42);
    }

    y += rowHeight;
  });

  return await exportTruePDF(doc, `Statement_${cleanParty}`);
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
      if (arg.legal_name || arg.trade_name || arg.name || arg.id) firmInput = arg;
      if (arg.trialBalance || arg.trading || arg.balanceSheet || arg.gstSummary || arg.pnl) reportData = arg;
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
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;
  };

  printReportTop();

  // A. TRIAL BALANCE EXPORT
  if (activeTab === 'TRIAL_BALANCE' || activeTab === 'TB') {
    const printTBHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Account Name', 16, y + 4.8);
      doc.text('Category', 95, y + 4.8);
      doc.text('Debit (Rs)', 150, y + 4.8, { align: 'right' });
      doc.text('Credit (Rs)', 193, y + 4.8, { align: 'right' });
      y += 9;
    };

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
        doc.rect(14, y - 3, 182, 6, 'F');
      }

      const deb = Number(row.dr || row.debit || 0);
      const cr = Number(row.cr || row.credit || 0);
      const cleanName = cleanAccountTitle(row.name || row.account_name || 'Account');
      const accName = doc.splitTextToSize(cleanName, 75)[0];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(accName, 16, y);
      doc.text(String(row.category || row.primary_type || 'General'), 95, y);
      doc.text(deb > 0 ? deb.toFixed(2) : '-', 150, y, { align: 'right' });
      doc.text(cr > 0 ? cr.toFixed(2) : '-', 193, y, { align: 'right' });
      y += 6;
    });

    if (y > 270) { 
      doc.addPage(); 
      pageNum += 1; 
      y = 18; 
      printReportTop(); 
    }
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Grand Total:', 95, y);
    doc.text(`Rs ${(reportData?.totalDebit || 0).toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`Rs ${(reportData?.totalCredit || 0).toFixed(2)}`, 193, y, { align: 'right' });

  // B. BALANCE SHEET EXPORT
  } else if (activeTab === 'BALANCE_SHEET' || activeTab === '4') {
    const assets = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.assets)) ? reportData.balanceSheet.assets : [];
    const liabilities = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.liabilities)) ? reportData.balanceSheet.liabilities : [];

    // ASSETS
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Assets (Property & Current Assets)', 16, y + 4.8);
    doc.text('Amount (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    assets.forEach((a, index) => {
      if (y > 275) { 
        doc.addPage(); 
        pageNum += 1; 
        y = 18; 
        printReportTop(); 
      }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }
      doc.setFontSize(7.5);
      doc.text(cleanAccountTitle(a.name || 'Asset'), 16, y);
      doc.text(Number(a.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Total Assets: Rs ${(reportData.balanceSheet?.totalAssets || 0).toFixed(2)}`, 193, y, { align: 'right' });
    y += 9;

    // LIABILITIES
    if (y > 240) { 
      doc.addPage(); 
      pageNum += 1; 
      y = 18; 
      printReportTop(); 
    }

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Liabilities & Capital', 16, y + 4.8);
    doc.text('Amount (Rs)', 193, y + 4.8, { align: 'right' });
    y += 9;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');

    liabilities.forEach((l, index) => {
      if (y > 275) { 
        doc.addPage(); 
        pageNum += 1; 
        y = 18; 
        printReportTop(); 
      }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 3, 182, 6, 'F');
      }
      doc.setFontSize(7.5);
      doc.text(cleanAccountTitle(l.name || 'Liability'), 16, y);
      doc.text(Number(l.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Total Liabilities: Rs ${(reportData.balanceSheet?.totalLiabilities || 0).toFixed(2)}`, 193, y, { align: 'right' });
  }

  return await exportTruePDF(doc, reportTitle);
};

export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};

/**
 * 3. JOURNAL DAYBOOK REGISTER PDF (A4 LANDSCAPE - FIXED SPACING)
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const rows = Array.isArray(vouchers) ? vouchers : [];

  // A4 Landscape: width = 297mm, height = 210mm
  const doc = new jsPDF('l', 'mm', 'a4');
  let y = 16;
  let pageNum = 1;

  const printJournalHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Journal Daybook Register', 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Page ${pageNum}`, 14, y);
    y += 6;

    // Header Bar: Total Width 269mm (x=14 to x=283)
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 269, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('#', 16, y + 4.8);
    doc.text('Date', 27, y + 4.8);
    doc.text('Voucher Type', 48, y + 4.8);
    doc.text('Reference No', 78, y + 4.8);
    doc.text('Debit Account (Dr)', 118, y + 4.8);
    doc.text('Credit Account (Cr)', 175, y + 4.8);
    doc.text('Amount (Rs)', 278, y + 4.8, { align: 'right' });
    y += 9;
  };

  printJournalHeader();

  rows.forEach((vch, idx) => {
    const rawRef = cleanTypographySpacing(String(vch.reference_no || vch.voucher_number || vch.id || '-'));
    const vType = String(vch.voucher_type || vch.type || 'JOURNAL');

    // Strict cleaning for both Dr & Cr accounts
    const drName = cleanAccountTitle(vch.dr_account || vch.dr_party || 'Dr Account');
    const crName = cleanAccountTitle(vch.cr_account || vch.cr_party || 'Cr Account');

    // Clean narration and material issue string
    const itemsList = Array.isArray(vch.items) ? vch.items : [];
    let itemStr = itemsList.map(it => {
      const iName = cleanTypographySpacing(it.itemName || it.name || 'Item');
      const iQty = it.qty || it.quantity || 0;
      const iUnit = (it.unit || 'Pcs').trim();
      const iRate = parseFloat(it.rate || it.price || 0);
      return cleanTypographySpacing(`${iName} (Qty: ${iQty} ${iUnit} @ Rs ${iRate.toFixed(2)})`);
    }).join(', ');

    const rawNote = vch.narration || vch.remarks || vch.description || '';
    const cleanNote = cleanTypographySpacing(rawNote);
    const noteText = cleanNote 
      ? (itemStr ? `${itemStr} - ${cleanNote}` : cleanNote) 
      : itemStr;

    const splitDr = doc.splitTextToSize(drName, 54);
    const splitCr = doc.splitTextToSize(crName, 75);
    const splitNote = noteText ? doc.splitTextToSize(noteText, 125) : [];

    const namesHeight = Math.max(splitDr.length, splitCr.length) * 3.4;
    const noteHeight = splitNote.length > 0 ? (splitNote.length * 3.2) : 0;
    const rowHeight = Math.max(6.5, 3.5 + namesHeight + noteHeight);

    // Landscape height = 210mm, safe break at 190mm
    if (y + rowHeight > 190) {
      doc.addPage();
      pageNum += 1;
      y = 16;
      printJournalHeader();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, 269, rowHeight, 'F');
    }

    const amt = parseFloat(vch.amount || vch.total_amount || 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), 16, y);
    doc.text(String(vch.voucher_date || vch.date || '-'), 27, y);
    doc.text(vType, 48, y);

    const splitRef = doc.splitTextToSize(rawRef, 36);
    doc.text(splitRef[0] || rawRef, 78, y);

    doc.text(splitDr, 118, y);
    doc.text(splitCr, 175, y);

    doc.setFont('helvetica', 'bold');
    doc.text(amt.toFixed(2), 278, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (splitNote.length > 0) {
      const noteY = y + namesHeight;
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(splitNote, 118, noteY);
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
  const invNumber = cleanTypographySpacing(invoice?.invoice_number || ('INV-' + Date.now()));
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
