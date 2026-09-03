// frontend/src/utils/pdfDownloadEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Universal Mobile & Web Document Exporter
 */
const exportHtmlDocument = async (htmlContent, fileName = 'Report') => {
  const cleanFileName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.html`;

  // 1. Try Native Capacitor Filesystem & Share (Primary for Android/iOS)
  try {
    const writeResult = await Filesystem.writeFile({
      path: cleanFileName,
      data: htmlContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      await Share.share({
        title: fileName,
        text: `${fileName} - Account Book Export`,
        url: writeResult.uri,
        dialogTitle: 'Open or Share Financial Report'
      });
      return;
    }
  } catch (nativeErr) {
    console.warn('Capacitor native export bypassed or unavailable:', nativeErr);
  }

  // 2. Fallback: Browser Popup Print (For Web / Desktop)
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow && printWindow.document) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn('Silent print invocation failed');
        }
      }, 350);
      return;
    }
  } catch (popErr) {
    console.warn('Popup window blocked, executing blob download fallback:', popErr);
  }

  // 3. Fallback: Direct Blob Download via <a> trigger (For restrictive WebViews)
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.setAttribute('download', cleanFileName);
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);
    }, 500);
  } catch (blobErr) {
    console.error('All export engines failed:', blobErr);
    alert('Report generation failed. Please check storage permissions.');
  }
};

/**
 * FINANCIAL STATEMENTS EXPORT (Trial Balance, Trading, P&L)
 */
export const downloadFinancialStatementsReport = async (firmName = 'Neelkanth Groups', reportData = {}, activeTab = 'TB') => {
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const { trialBalance, tradingAccount, profitAndLoss } = reportData || {};

  let reportTitle = 'वित्तीय विवरण (Financial Statements)';
  let tableContentHtml = '';

  if (activeTab === 'TB') {
    reportTitle = 'तलपट विवरण (Trial Balance Report)';
    const rowsHtml = (trialBalance?.rows || []).map((row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 600;">${row.account_name}</td>
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
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align:center; padding:15px;">No transactions recorded.</td></tr>'}
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
              <div>कुल खरीद (Purchases): <strong>₹${(tradingAccount?.purchases || 0).toFixed(2)}</strong></div>
              <div style="margin-top: 6px;">प्रत्यक्ष खर्चे (Direct Expenses): <strong>₹${(tradingAccount?.directExpenses || 0).toFixed(2)}</strong></div>
            </td>
            <td style="padding: 12px; border: 1px solid #cbd5e1; vertical-align: top;">
              <div>कुल बिक्री (Sales Revenue): <strong>₹${(tradingAccount?.sales || 0).toFixed(2)}</strong></div>
              <div style="margin-top: 6px;">अंतिम स्टॉक (Closing Stock): <strong>₹${(tradingAccount?.closingStock || 0).toFixed(2)}</strong></div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background-color: #ecfdf5; font-size: 14px; font-weight: bold;">
            <td colspan="2" style="padding: 12px; border: 1px solid #a7f3d0; color: #065f46; text-align: right;">
              सकल लाभ / Gross Profit: ₹${(tradingAccount?.grossProfit || 0).toFixed(2)}
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
            <td style="padding: 10px; text-align: right; font-weight: bold;">₹${(profitAndLoss?.grossProfit || 0).toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px;">अन्य आय (Indirect Incomes):</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #059669;">+ ₹${(profitAndLoss?.indirectIncomes || 0).toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px; color: #dc2626;">कार्यालय व अन्य खर्चे (Indirect Expenses):</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #dc2626;">- ₹${(profitAndLoss?.indirectExpenses || 0).toFixed(2)}</td>
          </tr>
          <tr style="background-color: #f8fafc; font-size: 14px; font-weight: bold; border-top: 2px solid #0f172a;">
            <td style="padding: 12px;">शुद्ध लाभ / Net Profit:</td>
            <td style="padding: 12px; text-align: right; color: ${(profitAndLoss?.netProfit || 0) >= 0 ? '#059669' : '#dc2626'}; font-size: 16px;">
              ₹${(profitAndLoss?.netProfit || 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const printableHtml = `
    <!DOCTYPE html>
    <html lang="hi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${reportTitle} - ${firmName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 8mm; font-size: 12px; }
            .no-print { display: none !important; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 15px; color: #0f172a; }
          .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .firm-title { font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 class="firm-title">${firmName}</h1>
              <div style="font-size: 11px; color: #64748b; margin-top: 3px;">Double-Entry Ledger System | FY 2026-27</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #475569;">
              <div><strong>दिनांक:</strong> ${currentDate}</div>
              <div><strong>रिपोर्ट:</strong> ${reportTitle}</div>
            </div>
          </div>
        </div>
        ${tableContentHtml}
      </body>
    </html>
  `;

  await exportHtmlDocument(printableHtml, `${reportTitle}_${activeTab}`);
};

export const downloadProfitAndLossPDF = async (firmName, reportData) => {
  return downloadFinancialStatementsReport(firmName, reportData, 'PL');
};
