// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Universal Mobile-Safe Local Storage Saver
 * Writes direct UTF-8 clean HTML, triggers native share, or prints seamlessly.
 */
export const saveDocumentToLocalMemory = async (htmlContent, fileName, shareTitle) => {
  let shareSucceeded = false;
  let fileSaved = false;
  let savedPath = '';

  // 1. Android Native Capacitor Filesystem Write (Direct UTF-8 Plain Text)
  try {
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: htmlContent, // Direct clean HTML string (No double Base64 encoding)
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    fileSaved = true;
    savedPath = writeResult?.uri || `Phone Storage > Documents > ${fileName}`;
  } catch (fsErr) {
    console.warn('Documents write notice, trying Cache fallback:', fsErr);
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: htmlContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      fileSaved = true;
      savedPath = `Phone Storage > Cache > ${fileName}`;
    } catch (cacheErr) {
      console.warn('Cache write notice:', cacheErr);
    }
  }

  // 2. Android Native Share Sheet (Direct WhatsApp / Drive / Files)
  try {
    const file = new File([htmlContent], fileName, { type: 'text/html;charset=utf-8' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: `Financial Audit Document: ${fileName}`
      });
      shareSucceeded = true;
    }
  } catch (shareErr) {
    console.warn('Native share sheet bypassed:', shareErr);
  }

  // 3. Fallback: Iframe-based Print Dialog
  if (!shareSucceeded && !fileSaved) {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
      return { success: true, method: 'IFRAME_PRINT' };
    } catch (iframeErr) {
      console.warn('Iframe print notice:', iframeErr);
    }
  }

  if (fileSaved && !shareSucceeded) {
    alert(`✓ Document Phone Storage Me Save Ho Gaya!\n\nFile Name: ${fileName}\nLocation: ${savedPath}`);
  }

  return { success: true, fileSaved, shareSucceeded };
};

/**
 * 1. General Journal Register (Daybook) PDF Exporter
 */
export const downloadJournalRegisterPDF = async (vouchers = [], firm) => {
  if (!vouchers || vouchers.length === 0) {
    alert('⚠️ No journal entries available to export.');
    return { success: false };
  }

  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Journal_Register_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  let totalDebit = 0;
  const rows = vouchers.map((v, idx) => {
    const amt = parseFloat(v.amount || 0);
    totalDebit += amt;
    return `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 6px; white-space: nowrap; font-weight: bold; color: #0284c7;">${v.voucher_date || v.date}</td>
        <td style="padding: 8px 6px; font-weight: bold; color: #1e293b;">${v.voucher_number || v.reference_no}</td>
        <td style="padding: 8px 6px;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${v.voucher_type || v.type}</span></td>
        <td style="padding: 8px 6px;">
          <div style="color: #059669; font-weight: bold;">Dr: ${v.dr_account || v.dr_party}</div>
          <div style="color: #dc2626; font-weight: bold;">Cr: ${v.cr_account || v.cr_party}</div>
          ${v.narration ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">(${v.narration})</div>` : ''}
        </td>
        <td style="padding: 8px 6px; text-align: right; font-weight: 800; color: #0f172a;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Journal Register - ${firmName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 15px; color: #0f172a; background: #ffffff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
    .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .badge { background: #0f172a; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    th { background: #0f172a; color: #ffffff; padding: 8px 6px; font-size: 11px; }
    .footer { margin-top: 14px; text-align: right; font-size: 13px; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 8px; color: #059669; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${firmName}</div>
    <div class="sub">GSTIN: ${firmGstin} | Double-Entry Audit Book</div>
    <div class="badge">GENERAL JOURNAL REGISTER / DAYBOOK (रोज़नामचा)</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align: center;">#</th>
        <th style="text-align: left;">Date</th>
        <th style="text-align: left;">Voucher No</th>
        <th style="text-align: left;">Type</th>
        <th style="text-align: left;">Particulars (Dr / Cr) & Narration</th>
        <th style="text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    Total Turnover: ₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  </div>
</body>
</html>`;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Journal Register - ${firmName}`);
};

/**
 * 2. Account Milan & Ledger PDF Exporter
 */
export const downloadAccountStatementPDF = async (statement, firm) => {
  if (!statement || !statement.accountName) return { success: false };
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const sanitizedName = statement.accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Ledger_${sanitizedName}_${dateStamp}.html`;

  const rows = (statement.entries || []).map(e => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="padding: 8px 6px; font-size: 11px; text-align: center; color: #64748b;">${e.index}</td>
      <td style="padding: 8px 6px; font-size: 11px; white-space: nowrap; font-weight: bold; color: #0284c7;">${e.date}</td>
      <td style="padding: 8px 6px; font-size: 11px; font-weight: bold;">${e.voucher_type}</td>
      <td style="padding: 8px 6px; font-size: 11px;">${e.particulars} ${e.narration ? `<br><small style="color:#64748b;">(${e.narration})</small>` : ''}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? parseFloat(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? parseFloat(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 8px 6px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(e.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${e.balance_type}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Ledger - ${statement.accountName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 15px; color: #0f172a; background: #ffffff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .badge { background: #0f172a; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    th { background: #0f172a; color: #ffffff; padding: 8px 6px; }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0; font-size: 18px;">${firmName}</h2>
    <div style="font-size:11px; color:#64748b;">GSTIN: ${firmGstin} | GENERAL LEDGER: ${statement.accountName}</div>
    <div class="badge">ACCOUNT MILAN & LEDGER STATEMENT (खाता बही)</div>
  </div>
  <div style="margin:10px 0; font-size:11px; background: #f8fafc; padding: 8px 12px; border-radius: 6px;">
    <strong>Opening Balance:</strong> ₹${parseFloat(statement.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${statement.openingBalanceType} | 
    <strong>Closing Balance:</strong> <span style="color:${statement.closingBalanceType === 'Dr' ? '#059669' : '#dc2626'}; font-weight: bold;">₹${parseFloat(statement.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${statement.closingBalanceType}</span>
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
      ${rows || '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8;">No records found.</td></tr>'}
    </tbody>
  </table>
  <div style="margin-top:14px; text-align:right; font-size:12px; font-weight:bold;">
    <span style="color:#059669; margin-right:15px;">Total Dr: ₹${parseFloat(statement.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    <span style="color:#dc2626;">Total Cr: ₹${parseFloat(statement.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  </div>
</body>
</html>`;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Ledger - ${statement.accountName}`);
};

/**
 * 3. Profit & Loss PDF Exporter
 */
export const downloadProfitAndLossPDF = async (plData, firm) => {
  if (!plData) return { success: false };
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Profit_and_Loss_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Profit & Loss - ${firmName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 15px; color: #0f172a; background: #ffffff; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px dashed #e2e8f0; }
  </style>
</head>
<body>
  <h2 style="margin:0;">${firmName}</h2>
  <div style="font-size:11px; color:#64748b; margin-bottom: 10px;">GSTIN: ${firmGstin} | PROFIT & LOSS STATEMENT</div>
  <div style="display: flex; gap: 14px;">
    <div style="flex: 1;">
      <h4 style="background:#fee2e2; color:#991b1b; padding:6px; margin:0 0 6px 0; border-radius:4px;">EXPENDITURE (खर्च)</h4>
      <table>
        ${(plData.directExpenses || []).map(e => `<tr><td>${e.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        ${(plData.indirectExpenses || []).map(e => `<tr><td>${e.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
      </table>
    </div>
    <div style="flex: 1;">
      <h4 style="background:#dcfce7; color:#166534; padding:6px; margin:0 0 6px 0; border-radius:4px;">INCOME (आय व बिक्री)</h4>
      <table>
        ${(plData.directIncomes || []).map(i => `<tr><td>${i.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(i.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        <tr><td style="color:#0284c7; font-weight:bold;">Closing Stock Valuation</td><td style="text-align:right; font-weight:bold; color:#0284c7;">₹${parseFloat(plData.closingStockValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      </table>
    </div>
  </div>
  <div style="margin-top: 16px; border-top: 2px solid #0f172a; padding-top: 8px; text-align: right; font-size: 13px; font-weight: bold; color:${plData.netProfit >= 0 ? '#059669' : '#dc2626'};">
    NET ${plData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(parseFloat(plData.netProfit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  </div>
</body>
</html>`;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Profit & Loss - ${firmName}`);
};

/**
 * 4. Balance Sheet PDF Exporter
 */
export const downloadBalanceSheetPDF = async (bsData, firm) => {
  if (!bsData) return { success: false };
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Balance_Sheet_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Balance Sheet - ${firmName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 15px; color: #0f172a; background: #ffffff; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px dashed #e2e8f0; }
  </style>
</head>
<body>
  <h2 style="margin:0;">${firmName}</h2>
  <div style="font-size:11px; color:#64748b; margin-bottom: 10px;">GSTIN: ${firmGstin} | BALANCE SHEET (तुलन पत्र)</div>
  <div style="display: flex; gap: 14px;">
    <div style="flex: 1;">
      <h4 style="background:#f1f5f9; padding:6px; margin:0 0 6px 0; border-radius:4px;">LIABILITIES & CAPITAL</h4>
      <table>
        ${(bsData.capital || []).map(c => `<tr><td>${c.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(c.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
        <tr><td style="color:#059669; font-weight:bold;">Net Profit (P&L)</td><td style="text-align:right; font-weight:bold; color:#059669;">₹${parseFloat(bsData.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        ${(bsData.liabilities || []).map(l => `<tr><td>${l.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(l.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
      </table>
      <div style="margin-top:10px; border-top:2px solid #0f172a; padding-top:6px; display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL:</span><span>₹${parseFloat(bsData.totalLiabilitiesAndEquity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    </div>
    <div style="flex: 1;">
      <h4 style="background:#f1f5f9; padding:6px; margin:0 0 6px 0; border-radius:4px;">ASSETS</h4>
      <table>
        ${(bsData.assets || []).map(a => `<tr><td>${a.name}</td><td style="text-align:right; font-weight:bold;">₹${parseFloat(a.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`).join('')}
      </table>
      <div style="margin-top:10px; border-top:2px solid #0f172a; padding-top:6px; display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL:</span><span>₹${parseFloat(bsData.totalAssets || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    </div>
  </div>
</body>
</html>`;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Balance Sheet - ${firmName}`);
};

/**
 * 5. Trial Balance PDF Exporter
 */
export const downloadTrialBalancePDF = async (tbData, firm) => {
  if (!tbData || !tbData.entries) return { success: false };
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Trial_Balance_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const rows = tbData.entries.map((e, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: 600;">${e.name}</td>
      <td style="padding: 6px 8px; color: #64748b;">${e.sub_group}</td>
      <td style="padding: 6px 8px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? parseFloat(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 6px 8px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? parseFloat(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Trial Balance - ${firmName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 15px; color: #0f172a; background: #ffffff; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; }
  </style>
</head>
<body>
  <h2 style="margin:0;">${firmName}</h2>
  <div style="font-size:11px; color:#64748b;">GSTIN: ${firmGstin} | TRIAL BALANCE (तलपट)</div>
  <table>
    <thead><tr><th>#</th><th style="text-align:left;">Account Head</th><th style="text-align:left;">Group</th><th style="text-align:right;">Debit (₹)</th><th style="text-align:right;">Credit (₹)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; font-size: 12px; border-top: 2px solid #0f172a; padding-top: 6px;">
    <span style="color: #059669;">Total Dr: ₹${parseFloat(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    <span style="color: #dc2626;">Total Cr: ₹${parseFloat(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  </div>
</body>
</html>`;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Trial Balance - ${firmName}`);
};

export const downloadInvoicePDF = downloadAccountStatementPDF;
