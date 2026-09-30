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
 * 100% Universal & Stable PDF Exporter using DataUri string
 */
export const exportTruePDF = async (doc, rawFileName = 'Report') => {
  const cleanName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = `${cleanName}_${Date.now()}.pdf`;

  try {
    // Generate base64 data uri string directly from jsPDF (Stable across all platforms)
    const dataUri = doc.output('datauristring');
    const base64Data = dataUri.split(',')[1];

    if (Capacitor.isNativePlatform()) {
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

    // Web Browser Download using Base64 Data URI
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = dataUri;
    downloadAnchor.setAttribute('download', fullFileName);
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
    }, 1500);

    return { success: true };

  } catch (err) {
    console.error('PDF Export Error:', err);
    throw new Error('Failed to generate or download PDF file.');
  }
};

/**
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

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
  doc.text(`Account Statement: ${partyName}`, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
  y += 12;

  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  
  doc.text('Date', 18, y + 5.5);
  doc.text('Particulars', 45, y + 5.5);
  doc.text('Dr (Rs)', 125, y + 5.5, { align: 'right' });
  doc.text('Cr (Rs)', 155, y + 5.5, { align: 'right' });
  doc.text('Balance', 192, y + 5.5, { align: 'right' });
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'normal');

  txs.forEach((t, index) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }

    doc.text(String(t.date || '-'), 18, y);
    doc.text(String(`${t.voucher_type || 'TX'} #${t.voucher_number || ''}`), 45, y);
    doc.text(t.debit > 0 ? t.debit.toFixed(2) : '-', 125, y, { align: 'right' });
    doc.text(t.credit > 0 ? t.credit.toFixed(2) : '-', 155, y, { align: 'right' });
    doc.text(`${(t.runningBalance || 0).toFixed(2)} ${t.balanceType || 'Dr'}`, 192, y, { align: 'right' });
    y += 7;
  });

  return await exportTruePDF(doc, `Statement_${partyName}`);
};

/**
 * 2. FINANCIAL STATEMENTS REPORT (Trial Balance, Trading, P&L, Balance Sheet, GST)
 */
export const downloadFinancialStatementsReport = async (param1, param2, param3) => {
  let firmInput = 'Neelkanth Groups';
  let reportData = {};
  let activeTab = 'TRIAL_BALANCE';

  [param1, param2, param3].forEach(arg => {
    if (!arg) return;
    if (typeof arg === 'object' && (arg.legal_name || arg.trade_name || arg.name || arg.id)) {
      firmInput = arg;
    } else if (typeof arg === 'object' && (arg.trialBalance || arg.tradingAccount || arg.profitAndLoss || arg.balanceSheet || arg.gstSummary)) {
      reportData = arg;
    } else if (typeof arg === 'string') {
      const upper = arg.toUpperCase();
      if (['TB', 'TRADING', 'PNL', 'BALANCE_SHEET', 'GST_SUMMARY', 'TRIAL_BALANCE', '1', '2', '3', '4', '5'].includes(upper)) {
        activeTab = upper;
      } else {
        firmInput = arg;
      }
    }
  });

  const firmName = getCleanFirmName(firmInput);
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(firmName.toUpperCase(), 14, y);
  y += 8;

  let reportTitle = 'Financial Report';

  // 1. TRIAL BALANCE TAB
  if (activeTab === 'TRIAL_BALANCE' || activeTab === 'TB' || activeTab === '1') {
    reportTitle = 'Trial Balance (तलपट विवरण)';
    const rows = reportData?.trialBalance?.rows || reportData?.trialBalance || [];
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, 14, y);
    y += 12;

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

      const deb = row.debit || row.dr || 0;
      const cr = row.credit || row.cr || 0;

      doc.text(String(row.account_name || row.name || 'Account'), 18, y);
      doc.text(String(row.primary_type || row.category || 'General'), 95, y);
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
    doc.text(`Rs ${(reportData?.trialBalance?.totalDebit || reportData?.totalDebit || 0).toFixed(2)}`, 145, y, { align: 'right' });
    doc.text(`Rs ${(reportData?.trialBalance?.totalCredit || reportData?.totalCredit || 0).toFixed(2)}`, 192, y, { align: 'right' });

  } 
  // 2. TRADING ACCOUNT TAB
  else if (activeTab === 'TRADING' || activeTab === '2') {
    reportTitle = 'Trading Account (व्यापार खाता)';
    const trading = reportData?.tradingAccount || reportData?.trading || {};

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Sales (बिक्री): Rs. ${(trading.sales || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Purchases & Direct Expenses: Rs. ${((trading.purchases || 0) + (trading.directExpenses || 0)).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Closing Stock Valuation: Rs. ${(trading.closingStock || 0).toFixed(2)}`, 18, y); y += 12;

    doc.setFillColor(240, 253, 244);
    doc.rect(14, y, 182, 12, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`Gross Profit / Loss: Rs. ${(trading.grossProfit || trading.grossResult || 0).toFixed(2)}`, 18, y + 8);
  }
  // 3. P&L STATEMENT TAB
  else if (activeTab === 'PNL' || activeTab === '3') {
    reportTitle = 'Profit & Loss Statement (लाभ-हानि विवरण)';
    const pnl = reportData?.profitAndLoss || reportData?.pnl || {};

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Gross Profit: Rs. ${(pnl.grossProfit || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Indirect Incomes: Rs. ${(pnl.indirectIncomes || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Indirect Expenses: Rs. ${(pnl.indirectExpenses || 0).toFixed(2)}`, 18, y); y += 12;

    const net = pnl.netProfit || pnl.netResult || 0;
    doc.setFillColor(net >= 0 ? 240 : 254, net >= 0 ? 253 : 242, net >= 0 ? 244 : 242);
    doc.rect(14, y, 182, 12, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(net >= 0 ? 21 : 220, net >= 0 ? 128 : 38, net >= 0 ? 61 : 38);
    doc.text(`Net Profit / Loss: Rs. ${net.toFixed(2)}`, 18, y + 8);
  }
  // 4. BALANCE SHEET TAB
  else if (activeTab === 'BALANCE_SHEET' || activeTab === '4') {
    reportTitle = 'Balance Sheet Summary (बैलेंस शीट)';
    const bs = reportData?.balanceSheet || {};

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Closing Stock Asset: Rs. ${(bs.closingStock || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Net Profit Addition: Rs. ${(bs.netProfit || 0).toFixed(2)}`, 18, y);
  }
  // 5. GST SUMMARY TAB
  else if (activeTab === 'GST_SUMMARY' || activeTab === '5') {
    reportTitle = 'GSTR Tax Summary';
    const gst = reportData?.gstSummary || {};

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(reportTitle, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Taxable Outward Sales: Rs. ${(gst.taxableSales || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Output GST Collected: Rs. ${(gst.outputTax || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Taxable Inward Purchases: Rs. ${(gst.taxablePurchases || 0).toFixed(2)}`, 18, y); y += 8;
    doc.text(`Input Tax Credit (ITC): Rs. ${(gst.inputTax || 0).toFixed(2)}`, 18, y); y += 12;

    doc.setFillColor(240, 253, 244);
    doc.rect(14, y, 182, 12, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`Net Tax Payable: Rs. ${(gst.netTaxPayable || 0).toFixed(2)}`, 18, y + 8);
  }

  return await exportTruePDF(doc, reportTitle);
};

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

  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);

  doc.text('#', 18, y + 5.5);
  doc.text('Date', 28, y + 5.5);
  doc.text('Reference', 60, y + 5.5);
  doc.text('Particulars (Dr / Cr)', 100, y + 5.5);
  doc.text('Amount (Rs)', 192, y + 5.5, { align: 'right' });
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont(undefined, 'normal');

  rows.forEach((vch, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7, 'F');
    }

    const amt = parseFloat(vch.amount || 0);

    doc.text(String(idx + 1), 18, y);
    doc.text(String(vch.voucher_date || vch.date || '-'), 28, y);
    doc.text(String(vch.reference_no || vch.voucher_number || 'VCH'), 60, y);
    doc.text(String(`Dr: ${vch.dr_account || ''} | Cr: ${vch.cr_account || ''}`), 100, y);
    doc.text(amt.toFixed(2), 192, y, { align: 'right' });
    y += 7;
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
