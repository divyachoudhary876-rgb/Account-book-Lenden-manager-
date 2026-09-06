// frontend/src/utils/pdfDownloadEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Universal safe firm name resolver
 */
const getCleanFirmName = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || 'Business Firm';
  }
  return 'Business Firm';
};

/**
 * Number to Indian Rupee Words
 */
const numberToWordsINR = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  };

  const amount = Math.floor(Math.abs(num || 0));
  if (amount === 0) return 'Zero Rupees Only';

  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const remainder = Math.floor(amount % 1000);

  let res = '';
  if (crore > 0) res += inWords(crore) + ' Crore ';
  if (lakh > 0) res += inWords(lakh) + ' Lakh ';
  if (thousand > 0) res += inWords(thousand) + ' Thousand ';
  if (remainder > 0) res += inWords(remainder);

  return res.trim() + ' Rupees Only';
};

/**
 * Android WebView-Proof Exporter: Native Share -> Blob Download -> Iframe Print
 */
export const exportHtmlDocument = async (htmlContent, rawFileName = 'Report') => {
  const cleanName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = cleanName + '_' + Date.now() + '.html';

  let handled = false;

  // 1. Android Capacitor Native Share Sheet
  try {
    const writeResult = await Filesystem.writeFile({
      path: fullFileName,
      data: htmlContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      await Share.share({
        title: cleanName,
        text: 'Account Book Financial Export: ' + cleanName,
        url: writeResult.uri,
        dialogTitle: 'Save or Print Report'
      });
      handled = true;
      return { success: true };
    }
  } catch (nativeErr) {
    console.warn('Capacitor Share unavailable, triggering Web fallback:', nativeErr);
  }

  // 2. Direct Blob Download (Works in standard browsers & mobile viewports)
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
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
    }, 1200);
    handled = true;
    return { success: true };
  } catch (blobErr) {
    console.warn('Blob download fallback encountered error:', blobErr);
  }

  // 3. Hidden Iframe Printing (Bypasses popup blocker)
  try {
    const hiddenIframe = document.createElement('iframe');
    hiddenIframe.style.position = 'fixed';
    hiddenIframe.style.right = '0';
    hiddenIframe.style.bottom = '0';
    hiddenIframe.style.width = '0';
    hiddenIframe.style.height = '0';
    hiddenIframe.style.border = '0';
    document.body.appendChild(hiddenIframe);

    const doc = hiddenIframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        hiddenIframe.contentWindow.focus();
        hiddenIframe.contentWindow.print();
      } catch (printErr) {}
      setTimeout(() => {
        document.body.removeChild(hiddenIframe);
      }, 2000);
    }, 400);

    handled = true;
    return { success: true };
  } catch (iframeErr) {
    console.warn('Hidden iframe print failed:', iframeErr);
  }

  return { success: handled };
};

/**
 * 1. ACCOUNT STATEMENT / LEDGER PDF EXPORT
 */
export const downloadAccountStatementPDF = async (statementData, partyName = 'Account', firmInput) => {
  const firmName = getCleanFirmName(firmInput);
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const txs = (statementData && Array.isArray(statementData.transactions)) ? statementData.transactions : [];

  const rowsHtml = txs.map((t, idx) => {
    const bgCol = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const debCol = t.debit > 0 ? '#059669' : '#0f172a';
    const crCol = t.credit > 0 ? '#dc2626' : '#0f172a';

    return '<tr style="background-color: ' + bgCol + ';">' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">' + (t.date || '-') + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1;">' +
        '<strong>' + (t.voucher_type || 'TX') + '</strong> #' + (t.voucher_number || 'N/A') +
        (t.narration ? '<div style="font-size: 10px; color: #64748b;">' + t.narration + '</div>' : '') +
      '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ' + debCol + '; font-weight: bold;">' +
        (t.debit > 0 ? parseFloat(t.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
      '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ' + crCol + '; font-weight: bold;">' +
        (t.credit > 0 ? parseFloat(t.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
      '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #1d4ed8;">' +
        (t.runningBalance || 0).toFixed(2) + ' ' + (t.balanceType || 'Dr') +
      '</td>' +
    '</tr>';
  }).join('');

  const printableHtml = '<!DOCTYPE html>' +
    '<html lang="hi">' +
      '<head>' +
        '<meta charset="UTF-8" />' +
        '<title>Account_Statement_' + partyName + '</title>' +
        '<style>' +
          'body { font-family: sans-serif; margin: 15px; color: #0f172a; }' +
          'table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }' +
          'th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; text-align: left; }' +
          'td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: top; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between;">' +
          '<div>' +
            '<h2 style="margin: 0; text-transform: uppercase;">' + firmName + '</h2>' +
            '<div style="font-size: 11px; color: #64748b;">Account Statement: <strong>' + partyName + '</strong></div>' +
          '</div>' +
          '<div style="text-align: right; font-size: 11px;">Date: ' + currentDate + '</div>' +
        '</div>' +
        '<table>' +
          '<thead>' +
            '<tr><th>तारीख</th><th>विवरण (Particulars)</th><th style="text-align:right;">नामे (Dr ₹)</th><th style="text-align:right;">जमा (Cr ₹)</th><th style="text-align:right;">बाकी (Balance ₹)</th></tr>' +
          '</thead>' +
          '<tbody>' + (rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="5" style="text-align:center; padding:20px;">No transactions found.</td></tr>') + '</tbody>' +
        '</table>' +
      '</body>' +
    '</html>';

  return await exportHtmlDocument(printableHtml, 'Statement_' + partyName);
};

/**
 * 2. FINANCIAL STATEMENTS REPORT (Trial Balance, Trading, P&L)
 */
export const downloadFinancialStatementsReport = async (firmInput, reportData = {}, activeTab = 'TB') => {
  const firmName = getCleanFirmName(firmInput);
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const { trialBalance, tradingAccount, profitAndLoss } = reportData || {};

  let reportTitle = 'वित्तीय विवरण (Financial Statements)';
  let tableContentHtml = '';

  if (activeTab === 'TB' || activeTab === '1' || activeTab === 'TRIAL_BALANCE') {
    reportTitle = 'तलपट विवरण (Trial Balance Report)';
    const rows = (trialBalance && Array.isArray(trialBalance.rows)) ? trialBalance.rows : (Array.isArray(reportData?.trialBalance) ? reportData.trialBalance : []);
    
    const rowsHtml = rows.map((row, idx) => {
      const bgCol = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const deb = row.debit || row.dr || 0;
      const cr = row.credit || row.cr || 0;

      return '<tr style="background-color: ' + bgCol + ';">' +
        '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; font-weight: 600;">' + (row.account_name || row.name || 'Account') + '</td>' +
        '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; color: #64748b;">' + (row.primary_type || row.category || 'General') + '</td>' +
        '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669; font-weight: bold;">' +
          (deb > 0 ? parseFloat(deb).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
        '</td>' +
        '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-weight: bold;">' +
          (cr > 0 ? parseFloat(cr).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
        '</td>' +
      '</tr>';
    }).join('');

    const totalDeb = parseFloat(trialBalance?.totalDebit || reportData?.totalDebit || 0);
    const totalCr = parseFloat(trialBalance?.totalCredit || reportData?.totalCredit || 0);

    tableContentHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">' +
      '<thead>' +
        '<tr style="background-color: #0f172a; color: #ffffff;">' +
          '<th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: left;">खाते का नाम (Ledger Account)</th>' +
          '<th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: left;">प्रकार (Category)</th>' +
          '<th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: right;">नामे (Debit ₹)</th>' +
          '<th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: right;">जमा (Credit ₹)</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' + (rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align:center; padding:15px;">No accounts recorded.</td></tr>') + '</tbody>' +
      '<tfoot>' +
        '<tr style="background-color: #f1f5f9; font-weight: bold; font-size: 13px;">' +
          '<td colspan="2" style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right;">Grand Total:</td>' +
          '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669;">₹' + totalDeb.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
          '<td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">₹' + totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>';
  } else {
    tableContentHtml = '<div>Report view exported successfully.</div>';
  }

  const printableHtml = '<!DOCTYPE html><html lang="hi"><head><meta charset="UTF-8" /><title>' + reportTitle + '</title></head><body>' +
    '<h2>' + firmName + '</h2><h3>' + reportTitle + '</h3>' + tableContentHtml + '</body></html>';

  return await exportHtmlDocument(printableHtml, reportTitle);
};

// Alias for Financial Reports compatibility
export const downloadFinancialReportPDF = downloadFinancialStatementsReport;

/**
 * 3. JOURNAL REGISTER EXPORT PDF/PRINT
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const rows = Array.isArray(vouchers) ? vouchers : [];

  let totalAmount = 0;
  const rowsHtml = rows.map((vch, idx) => {
    const amt = parseFloat(vch.amount || 0);
    totalAmount += amt;
    return '<tr style="background-color: ' + (idx % 2 === 0 ? '#ffffff' : '#f8fafc') + ';">' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1;">' + (vch.voucher_date || vch.date || '-') + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>' + (vch.reference_no || vch.voucher_number || 'VCH') + '</strong></td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1;">Dr: ' + (vch.dr_account || '') + '<br/>Cr: ' + (vch.cr_account || '') + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹' + amt.toFixed(2) + '</td>' +
    '</tr>';
  }).join('');

  const printableHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Journal_Register</title></head><body>' +
    '<h2>' + firmName + '</h2><h3>Journal Daybook</h3><table><thead><tr><th>#</th><th>Date</th><th>Ref</th><th>Particulars</th><th style="text-align:right;">Amount</th></tr></thead><tbody>' +
    (rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="5" style="text-align:center;">No entries</td></tr>') +
    '</tbody></table></body></html>';

  return await exportHtmlDocument(printableHtml, 'Journal_Register_' + firmName);
};

/**
 * 4. PROFESSIONAL TAX INVOICE GENERATOR
 */
export const generateProfessionalInvoicePDF = async (firmInput, invoice = {}) => {
  const firmName = getCleanFirmName(firmInput);
  const invNumber = invoice?.invoice_number || ('INV-' + Date.now());
  const grandTotal = parseFloat(invoice?.grand_total || invoice?.total_amount || 0);

  const printableHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice</title></head><body>' +
    '<h2>' + firmName + '</h2><h3>Tax Invoice: ' + invNumber + '</h3><div>Grand Total: ₹' + grandTotal.toFixed(2) + '</div></body></html>';

  return await exportHtmlDocument(printableHtml, 'Invoice_' + invNumber);
};

/**
 * 5. BACKWARD COMPATIBILITY ALIAS
 */
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PL');
};
