// frontend/src/utils/pdfDownloadEngine.js

/**
 * Robust Account Statement & Ledger PDF Export Engine with DOM Readiness & Delay Safety
 */
export const downloadAccountStatementPDF = async (firm, accountName, entries = [], openingBal = 0, closingBal = 0) => {
  try {
    // 1. Give DOM 600ms to ensure full layout rendering before PDF capture snapshot
    await new Promise(resolve => setTimeout(resolve, 600));

    const firmName = firm?.legal_name || firm?.trade_name || firm?.name || firm?.firm_name || 'NEELKANTH INT UDYOG';
    const cleanAccount = String(accountName || 'Account Statement').trim();
    
    // Create a clean hidden or printable container if not already in DOM
    const printWindow = window.open('', '_blank', 'height=650,width=900');
    if (!printWindow) {
      alert("⚠️ Pop-up blocked! Please allow pop-ups for this app to download PDFs.");
      return;
    }

    let rowsHTML = '';
    let runningBal = Number(openingBal || 0);

    (entries || []).forEach((entry, idx) => {
      const date = entry.voucher_date || entry.date || '-';
      const desc = entry.narration || entry.particulars || 'Transaction';
      const dr = Number(entry.debit || (entry.type === 'Dr' ? entry.amount : 0) || 0);
      const cr = Number(entry.credit || (entry.type === 'Cr' ? entry.amount : 0) || 0);
      
      runningBal = runningBal + dr - cr;

      rowsHTML += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px; text-align: center; color: #334155;">${date}</td>
          <td style="padding: 8px; color: #0f172a; font-weight: 500;">${desc}</td>
          <td style="padding: 8px; text-align: right; color: #059669; font-weight: 600;">${dr > 0 ? '₹' + dr.toFixed(2) : '-'}</td>
          <td style="padding: 8px; text-align: right; color: #dc2626; font-weight: 600;">${cr > 0 ? '₹' + cr.toFixed(2) : '-'}</td>
          <td style="padding: 8px; text-align: right; color: #0f172a; font-weight: bold;">₹${Math.abs(runningBal).toFixed(2)} ${runningBal >= 0 ? 'Dr' : 'Cr'}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Statement - ${cleanAccount}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
            h2 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
            .sub-title { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 8px; border-bottom: 1px solid #cbd5e1; }
            .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${firmName}</h2>
              <div class="sub-title">Account Statement: <strong>${cleanAccount}</strong></div>
            </div>
            <div style="font-size: 10px; color: #64748b; text-align: right;">
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
                <th style="width: 15%; text-align: center;">Date</th>
                <th style="width: 45%; text-align: left;">Particulars & Description</th>
                <th style="width: 13%; text-align: right;">Debit (Rs)</th>
                <th style="width: 13%; text-align: right;">Credit (Rs)</th>
                <th style="width: 14%; text-align: right;">Balance (Rs)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions found.</td></tr>'}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
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
