// frontend/src/utils/pdfDownloadEngine.js

/**
 * Universal Typography Cleaning Helper for Indian Context & Special Symbols
 */
export const cleanTypographySpacing = (text = '') => {
  if (!text) return '';
  return String(text)
    .replace(/₹/g, '₹')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 1. Export Financial Reports PDF (Balance Sheet, P&L, Trial Balance, Daybook)
 */
export const downloadFinancialReportPDF = async (firm, reportType = 'Financial Report', reportData = {}) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const firmName = firm?.legal_name || firm?.trade_name || firm?.name || firm?.firm_name || 'NEELKANTH INT UDYOG';
    const cleanReportName = String(reportType || 'Financial Report').trim();
    const entries = Array.isArray(reportData?.entries) ? reportData.entries : [];

    const printWindow = window.open('', '_blank', 'height=750,width=1000');
    if (!printWindow) {
      alert("⚠️ Pop-up blocked! Please allow pop-ups for this app to download PDFs.");
      return { success: false };
    }

    let rowsHTML = '';
    if (entries.length > 0) {
      entries.forEach((entry, idx) => {
        const date = entry.voucher_date || entry.date || '-';
        const vType = String(entry.voucher_type || entry.type || 'JV').toUpperCase();
        const refNo = entry.reference_no || entry.voucher_number || '-';
        const drAcc = cleanTypographySpacing(entry.dr_account || (Array.isArray(entry.entries) && entry.entries.find(e => e.type === 'Dr')?.account_name) || 'Account');
        const crAcc = cleanTypographySpacing(entry.cr_account || (Array.isArray(entry.entries) && entry.entries.find(e => e.type === 'Cr')?.account_name) || 'Account');
        const amt = Number(entry.amount || entry.total_amount || 0);

        rowsHTML += `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px; text-align: center; color: #475569;">${idx + 1}</td>
            <td style="padding: 8px; text-align: center; font-weight: 600; color: #0f172a;">${date}</td>
            <td style="padding: 8px; text-align: center;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${vType}</span></td>
            <td style="padding: 8px; font-weight: 700; color: #0284c7;">#${refNo}</td>
            <td style="padding: 8px;">
              <div style="font-weight: 700; color: #059669;">Dr: ${drAcc}</div>
              <div style="font-weight: 700; color: #dc2626; margin-top: 2px;">Cr: ${crAcc}</div>
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 900; color: #0f172a;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cleanReportName} - ${firmName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; background: #ffffff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            h2 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
            .sub-title { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; color: #334155; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; paddingTop: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${firmName}</h2>
              <div class="sub-title">${cleanReportName}</div>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-align: right;">
              Generated On: ${new Date().toLocaleDateString('en-IN')}
            </div>
          </div>

          ${entries.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 6%; text-align: center;">#</th>
                  <th style="width: 14%; text-align: center;">Date</th>
                  <th style="width: 12%; text-align: center;">Type</th>
                  <th style="width: 14%;">Ref No</th>
                  <th style="width: 38%;">Accounts (Debit / Credit)</th>
                  <th style="width: 16%; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
            </table>
          ` : `
            <div style="padding: 40px; text-align: center; color: #64748b; font-size: 13px; font-weight: 600;">
              No transaction records found for this report.
            </div>
          `}

          <div class="footer">
            Generated via Account Book Smart Manager (Indian GAAP Compliant)
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return { success: true };
  } catch (err) {
    console.error("Financial Report PDF Export Failed:", err);
    alert("PDF export mein samasya aayi: " + err.message);
    return { success: false };
  }
};

/**
 * 2. Export Account Statement / Ledger PDF
 */
export const downloadAccountStatementPDF = async (firm, accountName, entries = [], openingBal = 0, closingBal = 0) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const firmName = firm?.legal_name || firm?.trade_name || firm?.name || firm?.firm_name || 'NEELKANTH INT UDYOG';
    const cleanAccount = String(accountName || 'Account Statement').trim();
    
    const printWindow = window.open('', '_blank', 'height=750,width=1000');
    if (!printWindow) {
      alert("⚠️ Pop-up blocked! Please allow pop-ups for this app to download PDFs.");
      return { success: false };
    }

    let rowsHTML = '';
    let runningBal = Number(openingBal || 0);

    (entries || []).forEach((entry) => {
      const date = entry.voucher_date || entry.date || '-';
      const desc = cleanTypographySpacing(entry.narration || entry.particulars || 'Transaction');
      const dr = Number(entry.debit || (entry.type === 'Dr' ? entry.amount : 0) || 0);
      const cr = Number(entry.credit || (entry.type === 'Cr' ? entry.amount : 0) || 0);
      
      runningBal = runningBal + dr - cr;

      rowsHTML += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 9px; text-align: center; color: #475569; font-weight: 600;">${date}</td>
          <td style="padding: 9px; color: #0f172a; font-weight: 500;">${desc}</td>
          <td style="padding: 9px; text-align: right; color: #059669; font-weight: 700;">${dr > 0 ? '₹' + dr.toFixed(2) : '-'}</td>
          <td style="padding: 9px; text-align: right; color: #dc2626; font-weight: 700;">${cr > 0 ? '₹' + cr.toFixed(2) : '-'}</td>
          <td style="padding: 9px; text-align: right; color: #0f172a; font-weight: 800;">₹${Math.abs(runningBal).toFixed(2)} ${runningBal >= 0 ? 'Dr' : 'Cr'}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Statement - ${cleanAccount}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; background: #ffffff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            h2 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; }
            .sub-title { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 700; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; color: #334155; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; }
            .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${firmName}</h2>
              <div class="sub-title">Account Ledger Statement: <strong>${cleanAccount}</strong></div>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-align: right;">
              Generated On: ${new Date().toLocaleDateString('en-IN')}
            </div>
          </div>

          <div class="summary-box">
            <div>Opening Balance: ₹${Number(openingBal || 0).toFixed(2)}</div>
            <div>Net Closing Balance: ₹${Number(closingBal || runningBal).toFixed(2)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 14%; text-align: center;">Date</th>
                <th style="width: 44%; text-align: left;">Particulars & Description</th>
                <th style="width: 13%; text-align: right;">Debit (Rs)</th>
                <th style="width: 13%; text-align: right;">Credit (Rs)</th>
                <th style="width: 16%; text-align: right;">Balance (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || '<tr><td colspan="5" style="text-align: center; padding: 25px; color: #94a3b8; font-weight: 600;">No transactions found in this date range.</td></tr>'}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return { success: true };
  } catch (err) {
    console.error("PDF Generation Failed:", err);
    alert("PDF export mein samasya aayi: " + err.message);
    return { success: false };
  }
};

/**
 * 3. Export Journal Register / Daybook PDF
 */
export const downloadJournalRegisterPDF = async (firm, entries = []) => {
  return downloadFinancialReportPDF(firm, 'Journal Daybook Register', { entries });
};
