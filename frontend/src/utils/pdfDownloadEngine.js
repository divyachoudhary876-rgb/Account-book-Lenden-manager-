// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Generate a styled HTML representation of the Account Milan Statement
 */
const buildStatementHTML = (statement, firm) => {
  const firmName = firm?.legal_name || firm?.name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const firmCategory = firm?.category || 'TRADING';

  const rows = (statement.entries || []).map(e => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; font-size: 10px; text-align: center;">${e.index}</td>
      <td style="padding: 6px 8px; font-size: 10px; white-space: nowrap;">${e.date}</td>
      <td style="padding: 6px 8px; font-size: 10px; font-weight: bold;">${e.voucher_type}</td>
      <td style="padding: 6px 8px; font-size: 10px;">${e.particulars} ${e.narration ? `<br><small style="color: #64748b;">${e.narration}</small>` : ''}</td>
      <td style="padding: 6px 8px; font-size: 10px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? e.debit.toFixed(2) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 10px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? e.credit.toFixed(2) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 10px; text-align: right; font-weight: bold;">₹${e.running_balance.toFixed(2)} ${e.balance_type}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Account Statement - ${statement.accountName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
        .firm-title { font-size: 18px; font-weight: bold; margin: 0; }
        .firm-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
        .stmt-badge { font-size: 12px; font-weight: bold; background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px; }
        .meta-box { display: flex; justify-content: space-between; margin-bottom: 14px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 10px; }
        .footer { margin-top: 20px; text-align: right; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="firm-title">${firmName}</div>
        <div class="firm-sub">GSTIN: ${firmGstin} | Industry: ${firmCategory}</div>
        <div class="stmt-badge">ACCOUNT MILAN & LEDGER STATEMENT</div>
      </div>

      <div class="meta-box">
        <div>
          <strong>Account Name:</strong> ${statement.accountName}<br/>
          <strong>Group Classification:</strong> ${statement.subGroup || 'General'}
        </div>
        <div style="text-align: right;">
          <strong>Opening Balance:</strong> ₹${statement.openingBalance.toFixed(2)} ${statement.openingBalanceType}<br/>
          <strong>Closing Balance:</strong> <span style="color: ${statement.closingBalanceType === 'Dr' ? '#059669' : '#dc2626'}; font-weight: bold;">₹${statement.closingBalance.toFixed(2)} ${statement.closingBalanceType}</span>
        </div>
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

      <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 20px; font-size: 11px; font-weight: bold;">
        <span style="color: #059669;">Total Debit: ₹${statement.totalDebit.toFixed(2)}</span>
        <span style="color: #dc2626;">Total Credit: ₹${statement.totalCredit.toFixed(2)}</span>
      </div>

      <div class="footer">
        Generated on ${new Date().toLocaleString()} via Account Book ERP
      </div>
    </body>
    </html>
  `;
};

/**
 * Universal Mobile-Compliant PDF Exporter
 */
export const downloadAccountStatementPDF = async (statement, firm) => {
  if (!statement || !statement.accountName) {
    alert("⚠️ Please select an account with valid statement records first.");
    return;
  }

  const sanitizedAccName = statement.accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Statement_${sanitizedAccName}_${dateStamp}.html`;
  const htmlContent = buildStatementHTML(statement, firm);

  // Method 1: Try Native Mobile Web Share API (PDF / HTML Document Intent)
  try {
    const file = new File([htmlContent], fileName, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Statement - ${statement.accountName}`,
        text: `Account Milan Ledger Statement for ${statement.accountName}`
      });
      return;
    }
  } catch (shareErr) {
    console.warn("Share sheet bypassed:", shareErr);
  }

  // Method 2: Native Capacitor Filesystem Storage (Direct Write to Documents)
  try {
    const writeRes = await Filesystem.writeFile({
      path: fileName,
      data: btoa(unescape(encodeURIComponent(htmlContent))), // Base64 encoding for safe native binary write
      directory: Directory.Documents
    });

    alert(`✓ Document Saved to Phone Storage!\nLocation: Documents/${fileName}\n\nAap ise File Manager > Documents folder me dekh sakte hain.`);
    return;
  } catch (fsErr) {
    console.warn("Capacitor filesystem write failed, using Print Window fallback:", fsErr);
  }

  // Method 3: Clean Print/Save to PDF Dialog Trigger
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      return;
    }
  } catch (printErr) {
    console.warn("Direct window.print bypassed:", printErr);
  }

  // Method 4: Blob Download Fallback (Browser)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
};

export const downloadInvoicePDF = downloadAccountStatementPDF;
