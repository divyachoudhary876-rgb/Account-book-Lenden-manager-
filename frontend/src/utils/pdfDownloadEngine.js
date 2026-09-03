// frontend/src/utils/pdfDownloadEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Safe String Extraction (Prevents "e.replace is not a function")
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
 * Utility: Convert Numeric Amount to Indian Currency Words
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
 * Universal Mobile (Capacitor) & Desktop Print/Share Dispatcher
 */
const exportHtmlDocument = async (htmlContent, rawFileName = 'Report') => {
  const safeName = String(rawFileName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fullFileName = safeName + '_' + Date.now() + '.html';

  // 1. Capacitor Native Storage & Share
  try {
    const writeResult = await Filesystem.writeFile({
      path: fullFileName,
      data: htmlContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      await Share.share({
        title: safeName,
        text: safeName + ' - Account Book Export',
        url: writeResult.uri,
        dialogTitle: 'Save or Share PDF Report'
      });
      return;
    }
  } catch (nativeErr) {
    console.warn('Native Capacitor storage bypassed:', nativeErr);
  }

  // 2. Blob Download Fallback
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fullFileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (blobErr) {
    console.warn('Blob fallback failed:', blobErr);
  }

  // 3. Window Print Fallback
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {}
      }, 500);
    }
  } catch (printErr) {
    console.warn('Window print failed:', printErr);
  }
};

/**
 * 1. JOURNAL REGISTER EXPORT PDF/PRINT
 */
export const downloadJournalRegisterPDF = async (firmInput, vouchers = []) => {
  const firmName = getCleanFirmName(firmInput);
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const rows = Array.isArray(vouchers) ? vouchers : [];

  let totalAmount = 0;
  const rowsHtml = rows.map((vch, idx) => {
    const amt = parseFloat(vch.amount || 0);
    totalAmount += amt;
    const dateStr = vch.voucher_date || vch.date || '-';
    const vchNo = vch.reference_no || vch.voucher_number || ('VCH-' + (idx + 1));
    const vchType = vch.voucher_type || vch.type || 'JOURNAL';
    const dr = vch.dr_account || vch.dr_party || '-';
    const cr = vch.cr_account || vch.cr_party || '-';
    const note = vch.narration || '';

    const bgCol = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const noteSection = note ? '<div style="font-size: 10px; color: #475569; margin-top: 3px;">Note: ' + note + '</div>' : '';

    return '<tr style="background-color: ' + bgCol + ';">' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">' + dateStr + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">' + vchNo +
        '<div style="font-size: 10px; color: #64748b;">' + vchType + '</div>' +
      '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1;">' +
        '<div style="color: #059669; font-weight: 600;">Dr: ' + dr + '</div>' +
        '<div style="color: #dc2626; font-weight: 600;">Cr: ' + cr + '</div>' +
        noteSection +
      '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f172a;">₹' +
        amt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
      '</td>' +
    '</tr>';
  }).join('');

  const printableHtml = '<!DOCTYPE html>' +
    '<html lang="hi">' +
      '<head>' +
        '<meta charset="UTF-8" />' +
        '<title>Journal_Register_' + firmName + '</title>' +
        '<style>' +
          '@media print { body { margin: 0; padding: 10mm; font-size: 12px; } .no-print { display: none !important; } }' +
          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 15px; }' +
          '.header-box { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }' +
          'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
          'th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; font-size: 11px; }' +
          'td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; vertical-align: top; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="header-box">' +
          '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
            '<div>' +
              '<h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">' + firmName + '</h2>' +
              '<div style="font-size: 11px; color: #64748b; margin-top: 3px;">Daybook & Journal Register | Double-Entry System</div>' +
            '</div>' +
            '<div style="text-align: right; font-size: 11px; color: #475569;">' +
              '<div><strong>Export Date:</strong> ' + currentDate + '</div>' +
              '<div><strong>Total Records:</strong> ' + rows.length + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<table>' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 5%;">#</th>' +
              '<th style="width: 12%; text-align: left;">Date</th>' +
              '<th style="width: 18%; text-align: left;">Voucher No</th>' +
              '<th style="width: 47%; text-align: left;">Particulars (Dr / Cr) & Narration</th>' +
              '<th style="width: 18%; text-align: right;">Amount (₹)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            (rows.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 20px;">No journal vouchers found.</td></tr>' : rowsHtml) +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="background-color: #f1f5f9; font-weight: bold; font-size: 12px;">' +
              '<td colspan="4" style="text-align: right; padding: 8px; border: 1px solid #cbd5e1;">Grand Total:</td>' +
              '<td style="text-align: right; padding: 8px; border: 1px solid #cbd5e1; color: #059669; font-size: 13px;">₹' +
                totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
              '</td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
      '</body>' +
    '</html>';

  await exportHtmlDocument(printableHtml, 'Journal_Register_' + firmName);
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

  if (activeTab === 'TB') {
    reportTitle = 'तलपट विवरण (Trial Balance Report)';
    const rowsHtml = (trialBalance?.rows || []).map((row, idx) => {
      const bgCol = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const debCol = row.debit > 0 ? '#059669' : '#000';
      const debWeight = row.debit > 0 ? 'bold' : 'normal';
      const crCol = row.credit > 0 ? '#dc2626' : '#000';
      const crWeight = row.credit > 0 ? 'bold' : 'normal';

      return '<tr style="background-color: ' + bgCol + ';">' +
        '<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 600;">' + row.account_name + '</td>' +
        '<td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b;">' + row.primary_type + '</td>' +
        '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ' + debCol + '; font-weight: ' + debWeight + ';">' +
          (row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
        '</td>' +
        '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ' + crCol + '; font-weight: ' + crWeight + ';">' +
          (row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-') +
        '</td>' +
      '</tr>';
    }).join('');

    tableContentHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">' +
      '<thead>' +
        '<tr style="background-color: #0f172a; color: #ffffff;">' +
          '<th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">खाता विवरण (Account)</th>' +
          '<th style="padding: 8px; border: 1px solid #0f172a; text-align: left;">प्रकार (Type)</th>' +
          '<th style="padding: 8px; border: 1px solid #0f172a; text-align: right;">नामे (Debit ₹)</th>' +
          '<th style="padding: 8px; border: 1px solid #0f172a; text-align: right;">जमा (Credit ₹)</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        (rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align:center; padding:15px;">No transactions recorded.</td></tr>') +
      '</tbody>' +
      '<tfoot>' +
        '<tr style="background-color: #f1f5f9; font-weight: bold;">' +
          '<td colspan="2" style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">कुल योग (Total):</td>' +
          '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669; font-size: 13px;">₹' +
            (trialBalance?.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
          '</td>' +
          '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-size: 13px;">₹' +
            (trialBalance?.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
          '</td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>';
  } else if (activeTab === 'TRADING') {
    reportTitle = 'व्यापार खाता (Trading Account Report)';
    tableContentHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">' +
      '<thead>' +
        '<tr style="background-color: #0f172a; color: #ffffff;">' +
          '<th style="padding: 10px; border: 1px solid #0f172a; text-align: left; width: 50%;">व्यय विवरण (Debit / Expenses)</th>' +
          '<th style="padding: 10px; border: 1px solid #0f172a; text-align: left; width: 50%;">आय व स्टॉक (Credit / Revenue)</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        '<tr>' +
          '<td style="padding: 12px; border: 1px solid #cbd5e1; vertical-align: top;">' +
            '<div>कुल खरीद (Purchases): <strong>₹' + (tradingAccount?.purchases || 0).toFixed(2) + '</strong></div>' +
            '<div style="margin-top: 6px;">प्रत्यक्ष खर्चे (Direct Expenses): <strong>₹' + (tradingAccount?.directExpenses || 0).toFixed(2) + '</strong></div>' +
          '</td>' +
          '<td style="padding: 12px; border: 1px solid #cbd5e1; vertical-align: top;">' +
            '<div>कुल बिक्री (Sales Revenue): <strong>₹' + (tradingAccount?.sales || 0).toFixed(2) + '</strong></div>' +
            '<div style="margin-top: 6px;">अंतिम स्टॉक (Closing Stock): <strong>₹' + (tradingAccount?.closingStock || 0).toFixed(2) + '</strong></div>' +
          '</td>' +
        '</tr>' +
      '</tbody>' +
      '<tfoot>' +
        '<tr style="background-color: #ecfdf5; font-size: 13px; font-weight: bold;">' +
          '<td colspan="2" style="padding: 10px; border: 1px solid #a7f3d0; color: #065f46; text-align: right;">' +
            'सकल लाभ / Gross Profit: ₹' + (tradingAccount?.grossProfit || 0).toFixed(2) +
          '</td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>';
  } else {
    reportTitle = 'लाभ-हानि विवरण (Profit & Loss Statement)';
    const netProfit = profitAndLoss?.netProfit || 0;
    const netCol = netProfit >= 0 ? '#059669' : '#dc2626';

    tableContentHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">' +
      '<tbody>' +
        '<tr style="border-bottom: 1px solid #cbd5e1;">' +
          '<td style="padding: 10px;">सकल लाभ (Gross Profit b/d):</td>' +
          '<td style="padding: 10px; text-align: right; font-weight: bold;">₹' + (profitAndLoss?.grossProfit || 0).toFixed(2) + '</td>' +
        '</tr>' +
        '<tr style="border-bottom: 1px solid #cbd5e1;">' +
          '<td style="padding: 10px;">अन्य आय (Indirect Incomes):</td>' +
          '<td style="padding: 10px; text-align: right; font-weight: bold; color: #059669;">+ ₹' + (profitAndLoss?.indirectIncomes || 0).toFixed(2) + '</td>' +
        '</tr>' +
        '<tr style="border-bottom: 1px solid #cbd5e1;">' +
          '<td style="padding: 10px; color: #dc2626;">कार्यालय व अन्य खर्चे (Indirect Expenses):</td>' +
          '<td style="padding: 10px; text-align: right; font-weight: bold; color: #dc2626;">- ₹' + (profitAndLoss?.indirectExpenses || 0).toFixed(2) + '</td>' +
        '</tr>' +
        '<tr style="background-color: #f8fafc; font-size: 13px; font-weight: bold; border-top: 2px solid #0f172a;">' +
          '<td style="padding: 12px;">शुद्ध लाभ / Net Profit:</td>' +
          '<td style="padding: 12px; text-align: right; color: ' + netCol + '; font-size: 15px;">₹' + netProfit.toFixed(2) + '</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>';
  }

  const printableHtml = '<!DOCTYPE html>' +
    '<html lang="hi">' +
      '<head>' +
        '<meta charset="UTF-8" />' +
        '<title>' + reportTitle + ' - ' + firmName + '</title>' +
        '<style>' +
          '@media print { body { margin: 0; padding: 8mm; font-size: 12px; } .no-print { display: none !important; } }' +
          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 15px; color: #0f172a; }' +
          '.header-box { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="header-box">' +
          '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
            '<div>' +
              '<h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase;">' + firmName + '</h2>' +
              '<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Double-Entry Ledger System | FY 2026-27</div>' +
            '</div>' +
            '<div style="text-align: right; font-size: 11px; color: #475569;">' +
              '<div><strong>दिनांक:</strong> ' + currentDate + '</div>' +
              '<div><strong>रिपोर्ट:</strong> ' + reportTitle + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        tableContentHtml +
      '</body>' +
    '</html>';

  await exportHtmlDocument(printableHtml, reportTitle + '_' + activeTab);
};

/**
 * 3. PROFESSIONAL TAX INVOICE GENERATOR
 */
export const generateProfessionalInvoicePDF = async (firmInput, invoice = {}) => {
  const firmName = getCleanFirmName(firmInput);
  const firmAddress = (firmInput && typeof firmInput === 'object') ? (firmInput.registered_address || firmInput.address || '') : '';
  const firmGstin = (firmInput && typeof firmInput === 'object') ? (firmInput.gstin || 'N/A') : 'N/A';

  const invNumber = invoice?.invoice_number || ('INV-' + Date.now());
  const invDate = invoice?.invoice_date || new Date().toISOString().split('T')[0];
  const customerName = invoice?.customer_name || 'Cash Customer';
  const customerPhone = invoice?.customer_phone || '';
  const customerAddress = invoice?.customer_address || '';

  const items = Array.isArray(invoice?.items) && invoice.items.length > 0 ? invoice.items : [];
  const subtotal = parseFloat(invoice?.subtotal || 0);
  const taxTotal = parseFloat(invoice?.tax_total || 0);
  const grandTotal = parseFloat(invoice?.grand_total || invoice?.total_amount || (subtotal + taxTotal));

  const itemsRowsHtml = items.map((item, idx) => {
    const qty = parseFloat(item.quantity || 0);
    const rate = parseFloat(item.rate || 0);
    const lineTotal = parseFloat(item.line_total || (qty * rate));
    const bgCol = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return '<tr style="background-color: ' + bgCol + ';">' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">' + (idx + 1) + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 600;">' + item.item_name + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">' + qty + ' ' + (item.unit || '') + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">₹' + rate.toFixed(2) + '</td>' +
      '<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">₹' + lineTotal.toFixed(2) + '</td>' +
    '</tr>';
  }).join('');

  const printableHtml = '<!DOCTYPE html>' +
    '<html lang="en">' +
      '<head>' +
        '<meta charset="UTF-8" />' +
        '<title>Invoice_' + invNumber + '</title>' +
        '<style>' +
          '@media print { body { margin: 0; padding: 10mm; font-size: 12px; } }' +
          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 15px; }' +
          '.header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }' +
          'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
          'th { background-color: #0f172a; color: #ffffff; padding: 8px; border: 1px solid #0f172a; font-size: 11px; }' +
          'td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="header-box">' +
          '<div style="display: flex; justify-content: space-between;">' +
            '<div>' +
              '<h2 style="margin: 0; text-transform: uppercase;">' + firmName + '</h2>' +
              '<div style="font-size: 11px; color: #475569;">' + firmAddress + '</div>' +
              '<div style="font-size: 11px; font-weight: bold; color: #0284c7;">GSTIN: ' + firmGstin + '</div>' +
            '</div>' +
            '<div style="text-align: right;">' +
              '<h3 style="margin: 0; color: #0284c7;">TAX INVOICE</h3>' +
              '<div style="font-size: 11px;">Invoice No: ' + invNumber + '</div>' +
              '<div style="font-size: 11px;">Date: ' + invDate + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">' +
          '<div style="font-size: 12px; font-weight: bold;">Billed To: ' + customerName + '</div>' +
          '<div style="font-size: 11px; color: #475569;">' + customerAddress + (customerPhone ? ' | Phone: ' + customerPhone : '') + '</div>' +
        '</div>' +
        '<table>' +
          '<thead>' +
            '<tr><th>#</th><th>Description</th><th>Qty</th><th>Rate (₹)</th><th>Total (₹)</th></tr>' +
          '</thead>' +
          '<tbody>' + itemsRowsHtml + '</tbody>' +
          '<tfoot>' +
            '<tr>' +
              '<td colspan="4" style="text-align: right; font-weight: bold;">Grand Total:</td>' +
              '<td style="text-align: right; font-weight: bold; color: #059669;">₹' + grandTotal.toFixed(2) + '</td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
        '<div style="margin-top: 10px; font-size: 11px;"><strong>In Words:</strong> ' + numberToWordsINR(grandTotal) + '</div>' +
      '</body>' +
    '</html>';

  await exportHtmlDocument(printableHtml, 'Invoice_' + invNumber);
};

/**
 * 4. BACKWARD COMPATIBILITY ALIAS
 */
export const downloadProfitAndLossPDF = async (firmInput, reportData) => {
  return downloadFinancialStatementsReport(firmInput, reportData, 'PL');
};
