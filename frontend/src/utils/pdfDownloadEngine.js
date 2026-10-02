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
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT (Updated with Item & Description Details)
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

  const doc = new jsPDF();
  let y = 20;

  // Header Section
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Account Statement: ${partyName}`, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
  y += 12;

  // Table Headers
  doc.setFillColor(15, 23, 42); // Dark Slate #0f172a
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  
  doc.text('Date', 18, y + 5.5);
  doc.text('Particulars & Description', 45, y + 5.5);
  doc.text('Dr (Rs)', 125, y + 5.5, { align: 'right' });
  doc.text('Cr (Rs)', 155, y + 5.5, { align: 'right' });
  doc.text('Balance', 192, y + 5.5, { align: 'right' });
  y += 10;

  // Table Rows
  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'normal');

  txs.forEach((t, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 9, 'F');
    }

    doc.setFontSize(9);
    doc.text(String(t.date || '-'), 18, y);
    doc.text(String(`${t.voucher_type || 'TX'} #${t.voucher_number || ''}`), 45, y);
    
    doc.text(t.debit > 0 ? t.debit.toFixed(2) : '-', 125, y, { align: 'right' });
    doc.text(t.credit > 0 ? t.credit.toFixed(2) : '-', 155, y, { align: 'right' });
    doc.text(`${(t.runningBalance || 0).toFixed(2)} ${t.balanceType || 'Dr'}`, 192, y, { align: 'right' });
    
    // Print description / narration / items below voucher type
    if (t.narration) {
      y += 4.5;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const splitNarration = doc.splitTextToSize(String(t.narration), 75);
      doc.text(splitNarration, 45, y);
      y += (splitNarration.length * 3.5);
      doc.setTextColor(15, 23, 42);
    } else {
      y += 7;
    }
    y += 2;
  });

  return await exportTruePDF(doc, `Statement_${partyName}`);
};

/**
 * 2. FINANCIAL STATEMENTS REPORT (Trial Balance, Trading, P&L, Balance Sheet, GST) - Fully Corrected
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

  const doc = new jsPDF();
  let y = 20;

  // Header Section
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(reportTitle, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
  y += 12;

  // 1. BALANCE SHEET EXPORT
  if (activeTab === 'BALANCE_SHEET' || activeTab === '4') {
    const assets = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.assets)) ? reportData.balanceSheet.assets : [];
    const liabilities = (reportData.balanceSheet && Array.isArray(reportData.balanceSheet.liabilities)) ? reportData.balanceSheet.liabilities : [];

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Assets (Property & Current Assets)', 18, y + 5.5);
    doc.text('Amount (Rs)', 192, y + 5.5, { align: 'right' });
    y += 10;

    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');

    assets.forEach((a, index) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 7, 'F');
      }
      doc.text(String(a.name || 'Asset'), 18, y);
      doc.text(Number(a.amount || 0).toFixed(2), 192, y, { align: 'right' });
      y += 7;
    });

    y += 2;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Assets: Rs ${(reportData.balanceSheet?.totalAssets || 0).toFixed(2)}`, 192, y, { align: 'right' });
    y += 12;

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Liabilities & Capital', 18, y + 5.5);
    doc.text('Amount (Rs)', 192, y + 5.5, { align: 'right' });
    y += 10;

    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');

    liabilities.forEach((l, index) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 7, 'F');
      }
      doc.text(String(l.name || 'Liability'), 18, y);
      doc.text(Number(l.amount || 0).toFixed(2), 192, y, { align: 'right' });
      y += 7;
    });

    y += 2;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Liabilities: Rs ${(reportData.balanceSheet?.totalLiabilities || 0).toFixed(2)}`, 192, y, { align: 'right' });

  // 2. TRADING ACCOUNT EXPORT
  } else if (activeTab === 'TRADING' || activeTab === '2') {
    const trading = reportData.trading || { sales: 0, directExpenses: 0, grossResult: 0 };
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Sales: Rs ${(trading.sales || 0).toFixed(2)}`, 18, y);
    y += 10;
    doc.text(`Purchases & Direct Expenses: Rs ${(trading.directExpenses || 0).toFixed(2)}`, 18, y);
    y += 10;
    doc.text(`Gross Profit / Loss: Rs ${(trading.grossResult || 0).toFixed(2)}`, 18, y);

  // 3. P&L STATEMENT EXPORT
  } else if (activeTab === 'PNL' || activeTab === '3') {
    const pnl = reportData.pnl || { netResult: 0 };
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Net Profit / Loss: Rs ${(pnl.netResult || 0).toFixed(2)}`, 18, y);

  // 4. GST SUMMARY EXPORT
  } else if (activeTab === 'GST_SUMMARY' || activeTab === '5') {
    const gst = reportData.gstSummary || { taxableSales: 0, outputTax: 0, taxablePurchases: 0, inputTax: 0, netTaxPayable: 0 };
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Taxable Outward Sales: Rs ${(gst.taxableSales || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Output GST Collected: Rs ${(gst.outputTax || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Taxable Inward Purchases: Rs ${(gst.taxablePurchases || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Input Tax Credit (ITC): Rs ${(gst.inputTax || 0).toFixed(2)}`, 18, y); y += 10;
    doc.text(`Net Tax Payable: Rs ${(gst.netTaxPayable || 0).toFixed(2)}`, 18, y);

  // 5. DEFAULT TRIAL BALANCE EXPORT
  } else {
    const rows = (reportData.trialBalance && Array.isArray(reportData.trialBalance)) ? reportData.trialBalance : [];

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);

    doc.text('Account Name', 18, y + 5.5);
    doc.text('Category', 95, y + 5.5);
    doc.text('Debit (Rs)', 145, y + 5.5, { align: 'right' });
    doc.text('Credit (Rs)', 192, y + 5.5, { align: 'right' });
    y += 10;

    doc.setTextColor(15, 23, 42);
    doc.setFont(undefined, 'normal');

    rows.forEach((row, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 7, 'F');
      }

      const deb = row.dr || row.debit || 0;
      const cr = row.cr || row.credit || 0;

      doc.text(String(row.name || row.account_name || 'Account'), 18, y);
      doc.text(String(row.category || row.primary_type || 'General'), 95, y);
      doc.text(deb > 0 ? deb.toFixed(2) : '-', 145, y, { align: 'right' });
      doc.text(cr > 0 ? cr.toFixed(2) : '-', 192, y, { align: 'right' });
      y += 7;
    });

    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Grand Total:', 95, y);
    doc.text(`Rs ${(reportData?.totalDebit || 0).toFixed(2)}`, 145, y, { align: 'right' });
    doc.text(`Rs ${(reportData?.totalCredit || 0).toFixed(2)}`, 192, y, { align: 'right' });
  }

  return await exportTruePDF(doc, reportTitle);
};

export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};

/**
 * 3. JOURNAL REGISTER EXPORT PDF (Fixed Text & Amount Overlap with Strict Column Limits)
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const rows = Array.isArray(vouchers) ? vouchers : [];

  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Journal Daybook Register', 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
  y += 12;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);

  doc.text('#', 18, y + 5.5);
  doc.text('Date', 28, y + 5.5);
  doc.text('Reference', 55, y + 5.5);
  doc.text('Particulars, Accounts & Items', 85, y + 5.5);
  doc.text('Amount (Rs)', 192, y + 5.5, { align: 'right' });
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'normal');

  rows.forEach((vch, idx) => {
    const itemsList = Array.isArray(vch.items) ? vch.items : [];
    let itemStr = itemsList.map(it => `${it.itemName} (Qty: ${it.qty} @ Rs ${it.rate})`).join(', ');
    const extraText = itemStr ? `${itemStr} - ${vch.narration || ''}` : (vch.narration || '');
    
    // Restrict Particulars text width to 65mm so it never touches the amount column at x=192
    const splitText = extraText ? doc.splitTextToSize(extraText, 65) : [];
    const rowHeight = 9 + (splitText.length > 0 ? (splitText.length * 4) : 0);

    if (y + rowHeight > 275) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, rowHeight, 'F');
    }

    const amt = parseFloat(vch.amount || 0);

    doc.setFontSize(8.5);
    doc.text(String(idx + 1), 18, y);
    doc.text(String(vch.voucher_date || vch.date || '-'), 28, y);
    doc.text(String(vch.reference_no || vch.voucher_number || 'VCH'), 55, y);
    
    // Main line truncated strictly to 65mm width
    const mainLine = `[${vch.voucher_type || 'JV'}] Dr: ${vch.dr_account || ''} | Cr: ${vch.cr_account || ''}`;
    const truncatedMainLine = doc.splitTextToSize(mainLine, 65)[0] || mainLine;
    doc.text(truncatedMainLine, 85, y);

    // Amount printed safely on the right margin with zero overlap
    doc.setFont(undefined, 'bold');
    doc.text(amt.toFixed(2), 192, y, { align: 'right' });
    doc.setFont(undefined, 'normal');

    if (splitText.length > 0) {
      y += 4.5;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(splitText, 85, y);
      doc.setTextColor(15, 23, 42);
      y += (splitText.length * 3.5);
    } else {
      y += 5;
    }
    y += 3;
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
  let y = 20;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Tax Invoice: ${invNumber}`, 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Grand Total: Rs ${grandTotal.toFixed(2)}`, 14, y);

  return await exportTruePDF(doc, `Invoice_${invNumber}`);
};
