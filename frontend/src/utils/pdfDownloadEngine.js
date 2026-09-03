// frontend/src/utils/pdfDownloadEngine.js

/**
 * Generates and downloads a clean, printable HTML-based PDF document
 * Optimized for mobile WebViews and Android Capacitor containers
 */
export const downloadFinancialStatementsReport = (firmName = 'Neelkanth Groups', reportData = {}, activeTab = 'TB') => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const { trialBalance, tradingAccount, profitAndLoss } = reportData;

  let reportTitle = 'वित्तीय विवरण (Financial Statements)';
  let tableContentHtml = '';

  if (activeTab === 'TB') {
    reportTitle = 'तलपट विवरण (Trial Balance Report)';
    const rowsHtml = (trialBalance?.rows || []).map((row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${row.account_name}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b;">${row.primary_type}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ${row.debit > 0 ? '#059669' : '#000'}; font-weight: ${row.debit > 0 ? 'bold' : 'normal'};">
          ${row.debit > 0 ? row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ${row.credit > 0 ? '#dc2626' : '#000'}; font-weight: ${row.credit > 0 ? 'bold' : 'normal'};">
          ${row.credit > 0 ? row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
        </td>
      </tr>
    `).join('');

    tableContentHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: left;">खाता विवरण (Account)</th>
            <th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: left;">प्रकार (Type)</th>
            <th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: right;">नामे (Debit ₹)</th>
            <th style="padding: 10px 8px; border: 1px solid #0f172a; text-align: right;">जमा (Credit ₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <td colspan="2" style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right;">कुल योग (Total):</td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669; font-size: 13px;">
              ₹${(trialBalance?.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-size: 13px;">
              ₹${(trialBalance?.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  } else if (activeTab === 'TRADING') {
    reportTitle = 'व्यापार खाता (Trading Account Report)';
    tableContentHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px; border: 1px solid #0f172a; text-align: left; width: 50%;">व्यय विवरण (Debit / Expenses)</th>
            <th style="padding: 10px; border: 1px solid #0f172a; text-align: left; width: 50%;">आय व स्टॉक (Credit / Revenue)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border: 1px solid #cbd5e1; vertical-align: top;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>कुल खरीद (Purchases):</span>
                <strong>₹${(tradingAccount?.purchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>प्रत्यक्ष खर्चे (Direct Expenses):</span>
                <strong>₹${(tradingAccount?.directExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </td>
            <td style="padding: 12px; border: 1px solid #cbd5e1; vertical-align: top;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>कुल बिक्री (Sales Revenue):</span>
                <strong>₹${(tradingAccount?.sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>अंतिम स्टॉक (Closing Stock):</span>
                <strong>₹${(tradingAccount?.closingStock || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background-color: #ecfdf5; font-size: 14px; font-weight: bold;">
            <td colspan="2" style="padding: 12px; border: 1px solid #a7f3d0; color: #065f46; text-align: right;">
              सकल लाभ / Gross Profit: ₹${(tradingAccount?.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  } else {
    reportTitle = 'लाभ-हानि विवरण (Profit & Loss Statement)';
    tableContentHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px;">
        <tbody>
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px;">सकल लाभ (Gross Profit b/d):</td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">
              ₹${(profitAndLoss?.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px;">अन्य आय (Indirect Incomes):</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #059669;">
              + ₹${(profitAndLoss?.indirectIncomes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px; color: #dc2626;">कार्यालय व अन्य खर्चे (Indirect Expenses):</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #dc2626;">
              - ₹${(profitAndLoss?.indirectExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr style="background-color: #f8fafc; font-size: 14px; font-weight: bold; border-top: 2px solid #0f172a;">
            <td style="padding: 12px;">शुद्ध लाभ / Net Profit:</td>
            <td style="padding: 12px; text-align: right; color: ${(profitAndLoss?.netProfit || 0) >= 0 ? '#059669' : '#dc2626'}; font-size: 16px;">
              ₹${(profitAndLoss?.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const printDocumentHtml = `
    <!DOCTYPE html>
    <html lang="hi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${reportTitle} - ${firmName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 10mm; }
            .no-print { display: none !important; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
          .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
          .firm-name { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 0; }
          .meta-line { font-size: 12px; color: #64748b; margin-top: 4px; }
          .btn-print { background-color: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button class="btn-print" onclick="window.print()">📥 Save / Print as PDF</button>
        </div>
        <div class="header-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 class="firm-name">${firmName}</h1>
              <div class="meta-line">Double-Entry Financial Accounting System | FY 2026-27</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #475569;">
              <div><strong>दिनांक:</strong> ${currentDate}</div>
              <div><strong>विवरण:</strong> ${reportTitle}</div>
            </div>
          </div>
        </div>

        ${tableContentHtml}

        <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 10px; color: #94a3b8; text-align: center;">
          यह वित्तीय विवरण कंप्यूटर द्वारा तैयार किया गया है | Computer Generated Statement
        </div>
      </body>
    </html>
  `;

  // Standard WebView & Browser PDF/Print Launcher
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printDocumentHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  } else {
    // Fallback if popups are restricted in WebView: Render download link
    const blob = new Blob([printDocumentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `${firmName}_${activeTab}_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }
};

export const downloadProfitAndLossPDF = (firmName, reportData) => {
  return downloadFinancialStatementsReport(firmName, reportData, 'PL');
};
