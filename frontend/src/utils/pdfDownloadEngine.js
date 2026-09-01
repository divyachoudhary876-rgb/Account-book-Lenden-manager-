// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Universal Mobile-Safe Local Storage Saver
 */
export const saveDocumentToLocalMemory = async (htmlContent, fileName, shareTitle) => {
  let shareSucceeded = false;
  let fileSaved = false;
  let savedPath = '';

  // 1. Try Native Capacitor Filesystem Write (Phone Storage > Documents)
  try {
    const base64Data = btoa(unescape(encodeURIComponent(htmlContent)));
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    fileSaved = true;
    savedPath = writeResult?.uri || `Phone Storage > Documents > ${fileName}`;
  } catch (fsErr) {
    console.warn('Capacitor Filesystem write notice:', fsErr);
    // Try Cache directory fallback if Documents folder is restricted
    try {
      const base64Data = btoa(unescape(encodeURIComponent(htmlContent)));
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      fileSaved = true;
      savedPath = `Cache Directory > ${fileName}`;
    } catch (cacheErr) {
      console.warn('Cache fallback notice:', cacheErr);
    }
  }

  // 2. Try Native Android Share Sheet (WhatsApp, Google Drive, Gmail, Files)
  try {
    const file = new File([htmlContent], fileName, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: `Financial Audit Statement: ${fileName}`
      });
      shareSucceeded = true;
    }
  } catch (shareErr) {
    console.warn('Native share sheet cancelled or unsupported:', shareErr);
  }

  // 3. Fallback: Iframe-based In-App Print / PDF Saver (Works on all Android WebViews without popups)
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
      console.warn('Iframe print fallback error:', iframeErr);
    }
  }

  if (fileSaved && !shareSucceeded) {
    alert(`✓ Document Saved Successfully!\n\nFile: ${fileName}\nLocation: ${savedPath}`);
  }

  return { success: true, fileSaved, shareSucceeded };
};

/**
 * General Journal Register (Daybook) PDF Generator
 */
export const downloadJournalRegisterPDF = async (vouchers = [], firm) => {
  if (!vouchers || vouchers.length === 0) {
    alert('⚠️ No journal entries available to export.');
    return { success: false };
  }

  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Journal_Register_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  let totalDebit = 0;
  const rows = vouchers.map((v, idx) => {
    const amt = parseFloat(v.amount || 0);
    totalDebit += amt;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; font-size: 11px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; font-size: 11px; white-space: nowrap; font-weight: bold; color: #0284c7;">${v.voucher_date || v.date}</td>
        <td style="padding: 8px; font-size: 11px; font-weight: bold;">${v.voucher_number || v.reference_no}</td>
        <td style="padding: 8px; font-size: 11px;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.voucher_type || v.type}</span></td>
        <td style="padding: 8px; font-size: 11px;">
          <div style="color: #059669; font-weight: bold;">Dr: ${v.dr_account || v.dr_party}</div>
          <div style="color: #dc2626; font-weight: bold;">Cr: ${v.cr_account || v.cr_party}</div>
          ${v.narration ? `<small style="color: #64748b;">(${v.narration})</small>` : ''}
        </td>
        <td style="padding: 8px; font-size: 11px; text-align: right; font-weight: bold; color: #0f172a;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>General Journal Register - ${firmName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
        .badge { background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #ffffff; padding: 8px; font-size: 11px; }
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
        Total Journal Turnover: ₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Journal Register - ${firmName}`);
};

/**
 * Account Milan Ledger PDF Exporter
 */
export const downloadAccountStatementPDF = async (statement, firm) => {
  if (!statement || !statement.accountName) return { success: false };
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const sanitizedName = statement.accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Ledger_${sanitizedName}_${dateStamp}.html`;

  const rows = (statement.entries || []).map(e => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; font-size: 11px; text-align: center;">${e.index}</td>
      <td style="padding: 6px 8px; font-size: 11px;">${e.date}</td>
      <td style="padding: 6px 8px; font-size: 11px; font-weight: bold;">${e.voucher_type}</td>
      <td style="padding: 6px 8px; font-size: 11px;">${e.particulars} ${e.narration ? `<br><small style="color:#64748b;">(${e.narration})</small>` : ''}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${e.running_balance.toFixed(2)} ${e.balance_type}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"/><title>Ledger - ${statement.accountName}</title>
    <style>body{font-family:sans-serif;margin:20px;color:#0f172a;} table{width:100%;border-collapse:collapse;margin-top:10px;} th{background:#0f172a;color:#fff;padding:6px;font-size:11px;}</style>
    </head><body>
      <h2>${firmName}</h2><div style="font-size:11px;color:#64748b;">GSTIN: ${firmGstin} | GENERAL LEDGER: ${statement.accountName}</div>
      <div style="margin:10px 0;font-size:11px;"><strong>Opening:</strong> ₹${statement.openingBalance.toFixed(2)} ${statement.openingBalanceType} | <strong>Closing:</strong> ₹${statement.closingBalance.toFixed(2)} ${statement.closingBalanceType}</div>
      <table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Particulars</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Balance (₹)</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:12px;text-align:right;font-size:11px;font-weight:bold;"><span style="color:#059669;margin-right:15px;">Total Dr: ₹${statement.totalDebit.toFixed(2)}</span><span style="color:#dc2626;">Total Cr: ₹${statement.totalCredit.toFixed(2)}</span></div>
    </body></html>
  `;
  return await saveDocumentToLocalMemory(html, fileName, `Ledger - ${statement.accountName}`);
};

export const downloadInvoicePDF = downloadAccountStatementPDF;
