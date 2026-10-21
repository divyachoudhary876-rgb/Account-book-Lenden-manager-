/**
 * Frontend Utility: PDF Export Engine (Uncorrupted Binary Export & Financial Reports)
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

const normalizeDateStr = (dateInput) => {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
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
 * FINANCIAL STATEMENTS REPORT PDF EXPORT (Trial Balance, Trading, PnL, Balance Sheet)
 */
export const downloadFinancialStatementsReport = async (firmInput = 'Neelkanth Groups', reportData = {}, tabType = 'TRIAL_BALANCE') => {
  let firm = firmInput;
  let data = reportData;
  let tab = tabType;

  [firmInput, reportData, tabType].forEach(arg => {
    if (!arg) return;
    if (typeof arg === 'object') {
      if (arg.legal_name || arg.trade_name || arg.name || arg.id) firm = arg;
      if (arg.trialBalance || arg.tradingAccount || arg.profitAndLoss || arg.balanceSheet) data = arg;
    } else if (typeof arg === 'string') {
      const upper = arg.toUpperCase();
      if (['TRIAL_BALANCE', 'TRADING', 'PNL', 'BALANCE_SHEET', 'GST_SUMMARY', 'TB', '1', '2', '3', '4', '5'].includes(upper)) {
        if (upper === '1' || upper === 'TB') tab = 'TRIAL_BALANCE';
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
  else if (tab === 'BALANCE_SHEET' || tab === '4') reportTitle = 'Balance Sheet Report';
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

  // 1. TRIAL BALANCE
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
    const rows = (data.trialBalance && Array.isArray(data.trialBalance.rows)) ? data.trialBalance.rows : (Array.isArray(data.rows) ? data.rows : []);

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

      const deb = Number(row.debit || row.dr || 0);
      const cr = Number(row.credit || row.cr || 0);
      const cleanName = cleanAccountTitle(row.account_name || row.name || 'Account');
      const accName = doc.splitTextToSize(cleanName, 75)[0];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(accName, 16, y);
      doc.text(String(row.primary_type || row.category || 'General'), 95, y);
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
    doc.text(`Rs ${(data.trialBalance?.totalDebit || data.totalDebit || 0).toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`Rs ${(data.trialBalance?.totalCredit || data.totalCredit || 0).toFixed(2)}`, 193, y, { align: 'right' });

  } 
  // 2. TRADING ACCOUNT
  else if (tab === 'TRADING' || tab === '2') {
    const trading = data.tradingAccount || data.trading || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Trading Account Summary', 14, y);
    y += 8;

    const items = [
      { label: 'Total Sales (बिक्री)', val: Number(trading.sales || 0).toFixed(2) },
      { label: 'Purchases & Direct Expenses', val: Number(trading.purchases || 0).toFixed(2) },
      { label: 'Closing Stock Valuation', val: Number(trading.closingStock || 0).toFixed(2) },
      { label: 'Gross Profit / Loss', val: Number(trading.grossProfit || 0).toFixed(2) }
    ];

    items.forEach((it, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 4, 182, 8, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(it.label, 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs ${it.val}`, 193, y, { align: 'right' });
      y += 9;
    });
  } 
  // 3. PROFIT & LOSS
  else if (tab === 'PNL' || tab === '3') {
    const pnl = data.profitAndLoss || data.pnl || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Profit & Loss Statement', 14, y);
    y += 8;

    const items = [
      { label: 'Gross Profit', val: Number(pnl.grossProfit || 0).toFixed(2) },
      { label: 'Indirect Incomes', val: Number(pnl.indirectIncomes || 0).toFixed(2) },
      { label: 'Indirect Expenses', val: Number(pnl.indirectExpenses || 0).toFixed(2) },
      { label: 'Net Profit / Loss', val: Number(pnl.netProfit || 0).toFixed(2) }
    ];

    items.forEach((it, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 4, 182, 8, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(it.label, 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs ${it.val}`, 193, y, { align: 'right' });
      y += 9;
    });
  } 
  // 4. BALANCE SHEET
  else if (tab === 'BALANCE_SHEET' || tab === '4') {
    const bs = data.balanceSheet || {};
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Balance Sheet Summary', 14, y);
    y += 8;

    const items = [
      { label: 'Net Profit Carried Forward', val: Number(bs.netProfit || 0).toFixed(2) },
      { label: 'Closing Stock', val: Number(bs.closingStock || 0).toFixed(2) }
    ];

    items.forEach((it, idx) => {
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y - 4, 182, 8, 'F'); }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(it.label, 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs ${it.val}`, 193, y, { align: 'right' });
      y += 9;
    });
  }

  return await exportTruePDF(doc, reportTitle);
};

export const downloadFinancialReportPDF = downloadFinancialStatementsReport;
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PNL');
};
