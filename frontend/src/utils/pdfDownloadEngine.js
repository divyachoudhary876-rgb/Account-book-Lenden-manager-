// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Universal Native Storage Saver
 * Direct write to device memory + Native Share Sheet + Browser Fallback
 */
export const saveDocumentToLocalMemory = async (htmlContent, fileName, shareTitle) => {
  // Method 1: Android Native Share Sheet (Direct WhatsApp / Drive / Files App)
  try {
    const file = new File([htmlContent], fileName, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: `Official Document: ${fileName}`
      });
      return { success: true, method: 'SHARE_SHEET' };
    }
  } catch (shareErr) {
    console.warn('Native share sheet bypassed:', shareErr);
  }

  // Method 2: Android Native Storage Write (Documents Folder)
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: btoa(unescape(encodeURIComponent(htmlContent))), // UTF-8 safe Base64 encoding
      directory: Directory.Documents
    });

    alert(`✓ Document Local Storage Me Save Ho Gaya!\n\nFile Name: ${fileName}\nLocation: Phone Storage > Documents Folder`);
    return { success: true, method: 'LOCAL_STORAGE' };
  } catch (fsErr) {
    console.warn('Capacitor filesystem write fallback:', fsErr);
  }

  // Method 3: Desktop Browser Download Fallback
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
    return { success: true, method: 'BROWSER_DOWNLOAD' };
  } catch (blobErr) {
    console.warn('Blob download failed:', blobErr);
  }

  // Method 4: Clean Print Window Fallback
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
};

/**
 * 1. Account Milan & General Ledger PDF Export
 */
export const downloadAccountStatementPDF = async (statement, firm) => {
  if (!statement || !statement.accountName) {
    alert('⚠️ Please select a valid account head first.');
    return;
  }

  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const sanitizedName = statement.accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Ledger_${sanitizedName}_${dateStamp}.html`;

  const rows = (statement.entries || []).map(e => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px; font-size: 11px; text-align: center;">${e.index}</td>
      <td style="padding: 6px; font-size: 11px; white-space: nowrap;">${e.date}</td>
      <td style="padding: 6px; font-size: 11px; font-weight: bold;">${e.voucher_type}</td>
      <td style="padding: 6px; font-size: 11px;">${e.particulars} ${e.narration ? `<br><small style="color:#64748b;">(${e.narration})</small>` : ''}</td>
      <td style="padding: 6px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
      <td style="padding: 6px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
      <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: bold;">₹${e.running_balance.toFixed(2)} ${e.balance_type}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Ledger - ${statement.accountName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
        .badge { background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; font-size: 18px;">${firmName}</h2>
        <div style="font-size: 11px; color: #64748b;">GSTIN: ${firmGstin}</div>
        <div class="badge">GENERAL LEDGER STATEMENT (खाता बही)</div>
      </div>
      <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 10px;">
        <div><strong>Account:</strong> ${statement.accountName} (${statement.subGroup})</div>
        <div><strong>Opening:</strong> ₹${statement.openingBalance.toFixed(2)} ${statement.openingBalanceType} | <strong>Closing:</strong> ₹${statement.closingBalance.toFixed(2)} ${statement.closingBalanceType}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align: left;">Date</th>
            <th style="text-align: left;">Type</th>
            <th style="text-align: left;">Particulars</th>
            <th style="text-align: right;">Debit (₹)</th>
            <th style="text-align: right;">Credit (₹)</th>
            <th style="text-align: right;">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #94a3b8;">No entries found.</td></tr>`}
        </tbody>
      </table>
      <div style="margin-top: 14px; text-align: right; font-size: 11px; font-weight: bold;">
        <span style="color: #059669; margin-right: 15px;">Total Debit: ₹${statement.totalDebit.toFixed(2)}</span>
        <span style="color: #dc2626;">Total Credit: ₹${statement.totalCredit.toFixed(2)}</span>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(html, fileName, `Ledger - ${statement.accountName}`);
};

/**
 * 2. General Journal Register (Daybook) PDF Export
 */
export const downloadJournalRegisterPDF = async (vouchers = [], firm) => {
  if (!vouchers || vouchers.length === 0) {
    alert('⚠️ No journal voucher entries to export.');
    return;
  }

  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Journal_Register_${dateStamp}.html`;

  let totalDebit = 0;
  const rows = vouchers.map((v, idx) => {
    const amt = parseFloat(v.amount || 0);
    totalDebit += amt;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px; font-size: 11px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px; font-size: 11px;">${v.voucher_date || v.date}</td>
        <td style="padding: 6px; font-size: 11px; font-weight: bold;">${v.voucher_number || v.reference_no}</td>
        <td style="padding: 6px; font-size: 11px;">${v.voucher_type || v.type}</td>
        <td style="padding: 6px; font-size: 11px;">
          <div style="color: #059669; font-weight: bold;">Dr: ${v.dr_account || v.dr_party}</div>
          <div style="color: #dc2626; font-weight: bold;">Cr: ${v.cr_account || v.cr_party}</div>
          ${v.narration ? `<small style="color: #64748b;">(${v.narration})</small>` : ''}
        </td>
        <td style="padding: 6px; font-size: 11px; text-align: right; font-weight: bold;">₹${amt.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Journal Register</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
        .badge { background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; font-size: 18px;">${firmName}</h2>
        <div style="font-size: 11px; color: #64748b;">GSTIN: ${firmGstin}</div>
        <div class="badge">GENERAL JOURNAL REGISTER / DAYBOOK (रोज़नामचा)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align: left;">Date</th>
            <th style="text-align: left;">Voucher No</th>
            <th style="text-align: left;">Type</th>
            <th style="text-align: left;">Particulars</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 14px; text-align: right; font-size: 12px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 6px;">
        Total Journal Turnover: ₹${totalDebit.toFixed(2)}
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(html, fileName, `Journal Register - ${firmName}`);
};

/**
 * 3. Profit & Loss Statement PDF Export
 */
export const downloadProfitAndLossPDF = async (plData, firm) => {
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Profit_and_Loss_${dateStamp}.html`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Profit & Loss Statement</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #fff; padding: 8px; font-size: 12px; }
        td { padding: 6px 8px; font-size: 11px; border-bottom: 1px dashed #e2e8f0; }
      </style>
    </head>
    <body>
      <h2>${firmName}</h2>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">PROFIT & LOSS STATEMENT</div>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <h4 style="background: #fee2e2; color: #991b1b; padding: 6px; margin: 0 0 8px 0;">EXPENSES & COSTS</h4>
          <table>${plData.directExpenses.map(e => `<tr><td>${e.name}</td><td style="text-align:right; font-weight:bold;">₹${e.amount.toFixed(2)}</td></tr>`).join('')}</table>
          <h5 style="margin: 10px 0 4px 0;">Indirect Expenses</h5>
          <table>${plData.indirectExpenses.map(e => `<tr><td>${e.name}</td><td style="text-align:right; font-weight:bold;">₹${e.amount.toFixed(2)}</td></tr>`).join('')}</table>
        </div>
        <div style="flex: 1;">
          <h4 style="background: #dcfce7; color: #166534; padding: 6px; margin: 0 0 8px 0;">INCOME & REVENUE</h4>
          <table>
            ${plData.directIncomes.map(i => `<tr><td>${i.name}</td><td style="text-align:right; font-weight:bold;">₹${i.amount.toFixed(2)}</td></tr>`).join('')}
            <tr><td style="color:#0284c7; font-weight:bold;">Closing Stock Valuation</td><td style="text-align:right; font-weight:bold; color:#0284c7;">₹${plData.closingStockValuation.toFixed(2)}</td></tr>
          </table>
        </div>
      </div>
      <div style="margin-top: 20px; border-top: 2px solid #0f172a; padding-top: 10px; text-align: right; font-size: 14px; font-weight: bold; color: ${plData.netProfit >= 0 ? '#059669' : '#dc2626'};">
        NET ${plData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(plData.netProfit).toFixed(2)}
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(html, fileName, `Profit & Loss - ${firmName}`);
};

/**
 * 4. Balance Sheet PDF Export
 */
export const downloadBalanceSheetPDF = async (bsData, firm) => {
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Balance_Sheet_${dateStamp}.html`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Balance Sheet</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #fff; padding: 8px; font-size: 12px; }
        td { padding: 6px 8px; font-size: 11px; border-bottom: 1px dashed #e2e8f0; }
      </style>
    </head>
    <body>
      <h2>${firmName}</h2>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">BALANCE SHEET (आर्थिक चिट्ठा)</div>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <h4 style="background: #f1f5f9; padding: 6px; margin: 0 0 8px 0;">LIABILITIES & CAPITAL</h4>
          <table>
            ${bsData.capital.map(c => `<tr><td>${c.name}</td><td style="text-align:right; font-weight:bold;">₹${c.amount.toFixed(2)}</td></tr>`).join('')}
            <tr><td style="color:#059669; font-weight:bold;">Net Profit (from P&L)</td><td style="text-align:right; font-weight:bold; color:#059669;">₹${bsData.netProfit.toFixed(2)}</td></tr>
            ${bsData.liabilities.map(l => `<tr><td>${l.name}</td><td style="text-align:right; font-weight:bold;">₹${l.amount.toFixed(2)}</td></tr>`).join('')}
          </table>
          <div style="margin-top: 14px; border-top: 2px solid #0f172a; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>TOTAL:</span><span>₹${bsData.totalLiabilitiesAndEquity.toFixed(2)}</span>
          </div>
        </div>
        <div style="flex: 1;">
          <h4 style="background: #f1f5f9; padding: 6px; margin: 0 0 8px 0;">ASSETS</h4>
          <table>${bsData.assets.map(a => `<tr><td>${a.name}</td><td style="text-align:right; font-weight:bold;">₹${a.amount.toFixed(2)}</td></tr>`).join('')}</table>
          <div style="margin-top: 14px; border-top: 2px solid #0f172a; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>TOTAL:</span><span>₹${bsData.totalAssets.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(html, fileName, `Balance Sheet - ${firmName}`);
};

/**
 * 5. Trial Balance PDF Export
 */
export const downloadTrialBalancePDF = async (tbData, firm) => {
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Trial_Balance_${dateStamp}.html`;

  const rows = tbData.entries.map(e => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px; font-size: 11px;">${e.name}</td>
      <td style="padding: 6px; font-size: 11px; color: #64748b;">${e.sub_group}</td>
      <td style="padding: 6px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
      <td style="padding: 6px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Trial Balance</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #fff; padding: 8px; font-size: 12px; }
      </style>
    </head>
    <body>
      <h2>${firmName}</h2>
      <div style="font-size: 11px; color: #64748b;">TRIAL BALANCE (तलपट)</div>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Account Head</th>
            <th style="text-align: left;">Group</th>
            <th style="text-align: right;">Debit (₹)</th>
            <th style="text-align: right;">Credit (₹)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; font-size: 12px; border-top: 2px solid #0f172a; padding-top: 6px;">
        <span style="color: #059669;">Total Dr: ₹${tbData.totalDebit.toFixed(2)}</span>
        <span style="color: #dc2626;">Total Cr: ₹${tbData.totalCredit.toFixed(2)}</span>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(html, fileName, `Trial Balance - ${firmName}`);
};

export const downloadInvoicePDF = downloadAccountStatementPDF;
