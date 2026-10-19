/**
 * Frontend Utility: PDF Export Engine (Uncorrupted Binary Export, Account Statement & Financial Reports)
 */

import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const getCleanFirmName = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'Neelkanth Groups';
  }
  return 'Neelkanth Groups';
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
 * Universal Date Normalizer to YYYY-MM-DD for strict comparison
 */
const normalizeDateStr = (dateInput) => {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  // If DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  // If DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-');
    return `${y}-${m}-${d}`;
  }
  return str.substring(0, 10);
};

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const exportTruePDF = async (doc, rawFileName = 'Report') => {
  const cleanName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${cleanName}_${Date.now()}.pdf`;

  try {
    const pdfArrayBuffer = doc.output('arraybuffer');

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
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT (Strict Date Range & Opening Balance Calculation)
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const cleanParty = cleanAccountTitle(partyName);
  
  let txs = [];
  let rawFrom = null;
  let rawTo = null;

  if (statementData && typeof statementData === 'object') {
    if (Array.isArray(statementData.transactions)) txs = statementData.transactions;
    else if (Array.isArray(statementData.entries)) txs = statementData.entries;
    else if (Array.isArray(statementData)) txs = statementData;

    if (statementData.fromDate) rawFrom = statementData.fromDate;
    if (statementData.toDate) rawTo = statementData.toDate;
  } else if (Array.isArray(statementData)) {
    txs = statementData;
  }

  if (!rawFrom) rawFrom = localStorage.getItem('app_statement_from_date') || null;
  if (!rawTo) rawTo = localStorage.getItem('app_statement_to_date') || null;

  const fromDate = normalizeDateStr(rawFrom);
  const toDate = normalizeDateStr(rawTo);

  // Calculate opening balance prior to fromDate
  let openingBalance = 0;
  let openingBalanceType = 'Dr';

  if (fromDate) {
    let preDr = 0;
    let preCr = 0;
    txs.forEach(t => {
      const tDateNorm = normalizeDateStr(t.date || t.voucher_date || '');
      if (tDateNorm && tDateNorm < fromDate) {
        preDr += Number(t.debit || 0);
        preCr += Number(t.credit || 0);
      }
    });
    const netPre = preDr - preCr;
    if (netPre < 0) {
      openingBalance = Math.abs(netPre);
      openingBalanceType = 'Cr';
    } else {
      openingBalance = netPre;
      openingBalanceType = 'Dr';
    }
  }

  // Filter transactions strictly within normalized fromDate and toDate
  let filteredTxs = txs;
  if (fromDate || toDate) {
    filteredTxs = txs.filter(t => {
      const tDateNorm = normalizeDateStr(t.date || t.voucher_date || '');
      if (!tDateNorm) return true;
      if (fromDate && tDateNorm < fromDate) return false;
      if (toDate && tDateNorm > toDate) return false;
      return true;
    });
  }

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
    let dateRangeStr = '';
    if (rawFrom || rawTo) {
      dateRangeStr = ` | Period: ${rawFrom || 'Start'} to ${rawTo || 'Present'}`;
    }
    doc.text(`Account Statement: ${cleanParty}${dateRangeStr}`, 14, y);
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

  // Render Opening Balance Row
  if (fromDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(rawFrom || fromDate, 16, y);
    doc.text('Opening Balance Brought Forward', 38, y);
    doc.text('-', 132, y, { align: 'right' });
    doc.text('-', 162, y, { align: 'right' });
    doc.text(`${openingBalance.toFixed(2)} ${openingBalanceType}`, 193, y, { align: 'right' });
    y += 7;
  }

  let totalDebitSum = 0;
  let totalCreditSum = 0;
  let runningBalCalc = openingBalance;
  let currentBalanceType = openingBalanceType;

  filteredTxs.forEach((t, index) => {
    const rawTitle = cleanTypographySpacing(`${t.voucher_type || t.type || 'TX'} #${t.voucher_number || t.voucher_no || t.reference_no || ''}`);
    const descText = cleanTypographySpacing(t.narration || t.particulars || '');

    const splitTitle = doc.splitTextToSize(rawTitle, 68);
    const splitDesc = descText ? doc.splitTextToSize(descText, 68) : [];
    const totalLines = splitTitle.length + splitDesc.length;
    const rowHeight = Math.max(7, 4 + (totalLines * 3.6));

    if (y + rowHeight > 272) {
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

    doc.text(String(t.date || t.voucher_date || '-'), 16, y);
    doc.text(splitTitle, 38, y);

    const deb = Number(t.debit || 0);
    const cr = Number(t.credit || 0);

    totalDebitSum += deb;
    totalCreditSum += cr;

    if (currentBalanceType === 'Dr') {
      runningBalCalc = runningBalCalc + deb - cr;
    } else {
      runningBalCalc = runningBalCalc + cr - deb;
    }
    if (runningBalCalc < 0) {
      runningBalCalc = Math.abs(runningBalCalc);
      currentBalanceType = currentBalanceType === 'Dr' ? 'Cr' : 'Dr';
    }

    doc.text(deb > 0 ? deb.toFixed(2) : '-', 132, y, { align: 'right' });
    doc.text(cr > 0 ? cr.toFixed(2) : '-', 162, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${runningBalCalc.toFixed(2)} ${currentBalanceType}`, 193, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    if (splitDesc.length > 0) {
      const descY = y + (splitTitle.length * 3.6);
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(splitDesc, 38, descY);
      doc.setTextColor(15, 23, 42);
    }

    y += rowHeight;
  });

  if (y > 265) {
    doc.addPage();
    pageNum += 1;
    y = 18;
    printHeader();
  }

  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PERIOD SUM:', 38, y);
  doc.text(totalDebitSum.toFixed(2), 132, y, { align: 'right' });
  doc.text(totalCreditSum.toFixed(2), 162, y, { align: 'right' });

  return await exportTruePDF(doc, `Statement_${cleanParty}`);
};

/**
 * 2. STOCK ITEM LEDGER & MOVEMENT STATEMENT PDF EXPORT (With Guaranteed Per-Page Subtotals & Grand Totals)
 */
export const downloadStockItemLedgerPDF = async (itemData, firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const itemName = cleanTypographySpacing(itemData?.item_name || itemData?.name || 'Stock Item');
  const unitName = itemData?.unit || 'Units';

  const rows = Array.isArray(itemData?.entries || itemData?.transactions) 
    ? (itemData.entries || itemData.transactions) 
    : (Array.isArray(itemData) ? itemData : []);

  const doc = new jsPDF('p', 'mm', 'a4');
  let y = 18;
  let pageNum = 1;

  const printHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(firmName.toUpperCase(), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Stock Item Ledger & Movement Statement: ${itemName}`, 14, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')} | Unit: ${unitName} | Page ${pageNum}`, 14, y);
    y += 6;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.text('Date', 16, y + 4.8);
    doc.text('Type / Ref', 38, y + 4.8);
    doc.text('Particulars & Description', 70, y + 4.8);
    doc.text('In (+)', 145, y + 4.8, { align: 'right' });
    doc.text('Out (-)', 170, y + 4.8, { align: 'right' });
    doc.text('Balance', 193, y + 4.8, { align: 'right' });
    y += 9;
  };

  printHeader();

  let totalInSum = 0;
  let totalOutSum = 0;
  let pageInSum = 0;
  let pageOutSum = 0;

  const renderPageFooter = (isFinal = false) => {
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    
    if (isFinal) {
      doc.text('GRAND TOTAL MOVEMENT SUM:', 55, y);
      doc.text(`+${totalInSum.toFixed(2)}`, 145, y, { align: 'right' });
      doc.text(`-${totalOutSum.toFixed(2)}`, 170, y, { align: 'right' });
    } else {
      doc.text(`PAGE ${pageNum} SUBTOTAL:`, 65, y);
      doc.text(`+${pageInSum.toFixed(2)}`, 145, y, { align: 'right' });
      doc.text(`-${pageOutSum.toFixed(2)}`, 170, y, { align: 'right' });
    }
  };

  rows.forEach((row, index) => {
    const dateStr = row.date || row.voucher_date || '-';
    const typeStr = cleanTypographySpacing(row.type || row.voucher_type || 'TX');
    const descStr = cleanTypographySpacing(row.narration || row.particulars || row.description || '');
    
    const qtyIn = parseFloat(row.in || row.qty_in || row.purchase_qty || 0);
    const qtyOut = parseFloat(row.out || row.qty_out || row.consumption_qty || 0);
    const balanceStr = String(row.balance || '0');

    if (qtyIn > 0) {
      totalInSum += qtyIn;
      pageInSum += qtyIn;
    }
    if (qtyOut > 0) {
      totalOutSum += qtyOut;
      pageOutSum += qtyOut;
    }

    const splitDesc = doc.splitTextToSize(descStr, 70);
    const rowHeight = Math.max(7, 4 + (splitDesc.length * 3.5));

    if (y + rowHeight > 255) {
      renderPageFooter(false);
      doc.addPage();
      pageNum += 1;
      y = 18;
      pageInSum = 0;
      pageOutSum = 0;
      printHeader();
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 3, 182, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(dateStr, 16, y);
    doc.text(typeStr.substring(0, 15), 38, y);
    doc.text(splitDesc, 70, y);

    doc.text(qtyIn > 0 ? `+${qtyIn.toFixed(2)}` : '-', 145, y, { align: 'right' });
    doc.text(qtyOut > 0 ? `-${qtyOut.toFixed(2)}` : '-', 170, y, { align: 'right' });
    doc.text(`${balanceStr} ${unitName}`, 193, y, { align: 'right' });

    y += rowHeight;
  });

  if (y > 250) {
    doc.addPage();
    pageNum += 1;
    y = 18;
    printHeader();
  }
  renderPageFooter(true);

  return await exportTruePDF(doc, `Stock_Statement_${itemName}`);
};

/**
 * 3. FINANCIAL STATEMENTS REPORT
 */
export const downloadFinancialStatementsReport = async (firmInput = 'Neelkanth Groups', reportData = {}, tabType = 'TRIAL_BALANCE') => {
  let firm = firmInput;
  let data = reportData;
  let tab = tabType;

  [firmInput, reportData, tabType].forEach(arg => {
    if (!arg) return;
    if (typeof arg === 'object') {
      if (arg.legal_name || arg.trade_name || arg.name || arg.id) firm = arg;
      if (arg.trialBalance || arg.trading || arg.balanceSheet || arg.gstSummary || arg.pnl) data = arg;
    } else if (typeof arg === 'string') {
      const upper = arg.toUpperCase();
      if (['TRIAL_BALANCE', 'TRADING', 'PNL', 'BALANCE_SHEET', 'GST_SUMMARY', 'TB', '1', '2', '3', '4', '5'].includes(upper)) {
        if (upper === '1') tab = 'TRIAL_BALANCE';
        else if (upper === '2') tab = 'TRADING';
        else if (upper === '3') tab = 'PNL';
        else if (upper === '4') tab = 'BALANCE_SHEET';
        else if (upper === '5') tab = 'GST_SUMMARY';
        else tab = upper;
      } else {
        firm = arg;
      }
    }
  });

  const firmName = getCleanFirmName(firm);
  let reportTitle = 'Trial Balance Report';
  if (tab === 'TRADING' || tab === '2') reportTitle = 'Trading Account Report';
  else if (tab === 'PNL' || tab === '3') reportTitle = 'Profit & Loss Statement';
  else if (tab === 'BALANCE_SHEET' || tab === '4') reportTitle = 'Balance Sheet (Assets & Liabilities)';
  else if (tab === 'GST_SUMMARY' || tab === '5') reportTitle = 'GSTR Tax Summary Report';

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

  if (tab === 'TRIAL_BALANCE' || tab === 'TB' || tab === '1') {
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
    const rows = (data.trialBalance && Array.isArray(data.trialBalance)) ? data.trialBalance : [];

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

    if (y > 270) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Grand Total:', 95, y);
    doc.text(`Rs ${(data?.totalDebit || 0).toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`Rs ${(data?.totalCredit || 0).toFixed(2)}`, 193, y, { align: 'right' });

  } else if (tab === 'BALANCE_SHEET' || tab === '4') {
    const assets = (data.balanceSheet && Array.isArray(data.balanceSheet.assets)) ? data.balanceSheet.assets : [];
    const liabilities = (data.balanceSheet && Array.isArray(data.balanceSheet.liabilities)) ? data.balanceSheet.liabilities : [];

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
      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
      if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }
      doc.setFontSize(7.5);
      doc.text(cleanAccountTitle(a.name || 'Asset'), 16, y);
      doc.text(Number(a.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Total Assets: Rs ${(data.balanceSheet?.totalAssets || 0).toFixed(2)}`, 193, y, { align: 'right' });
    y += 9;

    if (y > 240) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }

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
      if (y > 275) { doc.addPage(); pageNum += 1; y = 18; printReportTop(); }
      if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 3, 182, 6, 'F'); }
      doc.setFontSize(7.5);
      doc.text(cleanAccountTitle(l.name || 'Liability'), 16, y);
      doc.text(Number(l.amount || 0).toFixed(2), 193, y, { align: 'right' });
      y += 6;
    });

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Total Liabilities: Rs ${(data.balanceSheet?.totalLiabilities || 0).toFixed(2)}`, 193, y, { align: 'right' });
  }

  return await exportTruePDF(doc, reportTitle);
};

export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};

/**
 * 4. JOURNAL DAYBOOK REGISTER PDF (A4 LANDSCAPE)
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const rows = Array.isArray(vouchers) ? vouchers : [];

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

    const drName = cleanAccountTitle(vch.dr_account || vch.dr_party || 'Dr Account');
    const crName = cleanAccountTitle(vch.cr_account || vch.cr_party || 'Cr Account');

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
    const noteText = cleanNote ? (itemStr ? `${itemStr} - ${cleanNote}` : cleanNote) : itemStr;

    const splitDr = doc.splitTextToSize(drName, 52);
    const splitCr = doc.splitTextToSize(crName, 55);
    const splitNote = noteText ? doc.splitTextToSize(noteText, 110) : [];

    const maxAccountLines = Math.max(splitDr.length, splitCr.length);
    const accountsHeight = maxAccountLines * 3.4;
    const noteHeight = splitNote.length > 0 ? (splitNote.length * 3.0) + 1 : 0;
    const rowHeight = Math.max(8, 4 + accountsHeight + noteHeight);

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
      const noteY = y + accountsHeight + 0.8;
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
 * 5. PROFESSIONAL TAX INVOICE GENERATOR
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
