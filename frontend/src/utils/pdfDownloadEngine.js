// frontend/src/utils/pdfDownloadEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Universal Mobile-Safe Local Storage Saver
 * Writes to Android Documents / Cache, triggers Native Share Sheet, or activates iframe print.
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
    console.warn('Capacitor Documents write notice:', fsErr);
    try {
      const base64Data = btoa(unescape(encodeURIComponent(htmlContent)));
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      fileSaved = true;
      savedPath = `Phone Storage > Cache > ${fileName}`;
    } catch (cacheErr) {
      console.warn('Cache directory write notice:', cacheErr);
    }
  }

  // 2. Try Native Android Share Sheet (Direct WhatsApp, Google Drive, Files app)
  try {
    const file = new File([htmlContent], fileName, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: `Financial Statement: ${fileName}`
      });
      shareSucceeded = true;
    }
  } catch (shareErr) {
    console.warn('Native share sheet cancelled or unsupported:', shareErr);
  }

  // 3. Fallback: Iframe-based In-App Print / PDF Saver
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
      console.warn('Iframe print fallback notice:', iframeErr);
    }
  }

  if (fileSaved && !shareSucceeded) {
    alert(`✓ Document Saved to Device Storage!\n\nFile: ${fileName}\nLocation: ${savedPath}`);
  }

  return { success: true, fileSaved, shareSucceeded };
};

/**
 * 1. Profit & Loss Statement PDF Exporter
 */
export const downloadProfitAndLossPDF = async (plData, firm) => {
  if (!plData) {
    alert('⚠️ No Profit & Loss data available to export.');
    return { success: false };
  }

  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Profit_and_Loss_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const directExpensesRows = (plData.directExpenses || []).map(e => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${e.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const indirectExpensesRows = (plData.indirectExpenses || []).map(e => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${e.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const directIncomesRows = (plData.directIncomes || []).map(i => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${i.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(i.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const indirectIncomesRows = (plData.indirectIncomes || []).map(i => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${i.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(i.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Profit & Loss Statement - ${firmName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; }
        .badge { background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 11px; text-align: left; }
        td { border-bottom: 1px dashed #e2e8f0; }
        .box-title { padding: 6px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; margin-bottom: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; font-size: 18px;">${firmName}</h2>
        <div style="font-size: 11px; color: #64748b;">GSTIN: ${firmGstin} | Financial Period Audit</div>
        <div class="badge">TRADING & PROFIT & LOSS STATEMENT (आय-व्यय विवरण)</div>
      </div>

      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <div class="box-title" style="background: #fee2e2; color: #991b1b;">EXPENDITURE & COSTS (खर्च)</div>
          <table>
            <thead><tr><th>Direct Costs / Purchases</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>${directExpensesRows || '<tr><td colspan="2" style="padding:6px; color:#94a3b8;">Nil</td></tr>'}</tbody>
          </table>

          <div class="box-title" style="background: #fef2f2; color: #991b1b; margin-top: 14px;">INDIRECT EXPENSES (कार्यालय व अन्य खर्च)</div>
          <table>
            <thead><tr><th>Expense Head</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>${indirectExpensesRows || '<tr><td colspan="2" style="padding:6px; color:#94a3b8;">Nil</td></tr>'}</tbody>
          </table>
        </div>

        <div style="flex: 1;">
          <div class="box-title" style="background: #dcfce7; color: #166534;">INCOME & REVENUE (बिक्री व आय)</div>
          <table>
            <thead><tr><th>Revenue & Sales</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>
              ${directIncomesRows || '<tr><td colspan="2" style="padding:6px; color:#94a3b8;">Nil</td></tr>'}
              <tr>
                <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; color: #0284c7;">Closing Stock Valuation</td>
                <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold; color: #0284c7;">₹${parseFloat(plData.closingStockValuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          ${indirectIncomesRows ? `
            <div class="box-title" style="background: #f0fdf4; color: #166534; margin-top: 14px;">OTHER / INDIRECT INCOME</div>
            <table>
              <thead><tr><th>Income Head</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
              <tbody>${indirectIncomesRows}</tbody>
            </table>
          ` : ''}
        </div>
      </div>

      <div style="margin-top: 20px; border-top: 2px solid #0f172a; padding-top: 10px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
        <span>GROSS PROFIT: ₹${parseFloat(plData.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span style="color: ${plData.netProfit >= 0 ? '#059669' : '#dc2626'};">
          NET ${plData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(parseFloat(plData.netProfit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Profit & Loss - ${firmName}`);
};

/**
 * 2. Balance Sheet PDF Exporter
 */
export const downloadBalanceSheetPDF = async (bsData, firm) => {
  if (!bsData) {
    alert('⚠️ No Balance Sheet data available to export.');
    return { success: false };
  }

  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Balance_Sheet_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const capitalRows = (bsData.capital || []).map(c => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${c.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(c.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const liabilitiesRows = (bsData.liabilities || []).map(l => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${l.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(l.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const assetsRows = (bsData.assets || []).map(a => `
    <tr>
      <td style="padding: 6px 8px; font-size: 11px;">${a.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(a.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Balance Sheet - ${firmName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #0f172a; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; }
        .badge { background: #0f172a; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; color: #ffffff; padding: 6px 8px; font-size: 11px; text-align: left; }
        td { border-bottom: 1px dashed #e2e8f0; }
        .box-title { padding: 6px 8px; font-size: 12px; font-weight: bold; border-radius: 4px; margin-bottom: 6px; background: #f1f5f9; color: #0f172a; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; font-size: 18px;">${firmName}</h2>
        <div style="font-size: 11px; color: #64748b;">GSTIN: ${firmGstin} | Solvency & Capital Structure</div>
        <div class="badge">BALANCE SHEET (आर्थिक चिट्ठा / तुलन पत्र)</div>
      </div>

      <div style="display: flex; gap: 20px;">
        <div style="flex: 1;">
          <div class="box-title">LIABILITIES & CAPITAL (देनदारियां व पूंजी)</div>
          <table>
            <thead><tr><th>Capital & Liabilities</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>
              ${capitalRows}
              <tr>
                <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; color: #059669;">Net Profit (P&L Integration)</td>
                <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold; color: #059669;">₹${parseFloat(bsData.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${liabilitiesRows || '<tr><td colspan="2" style="padding:6px; color:#94a3b8;">Nil</td></tr>'}
            </tbody>
          </table>
          <div style="margin-top: 14px; border-top: 2px solid #0f172a; padding-top: 8px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>TOTAL LIABILITIES & EQUITY:</span>
            <span>₹${parseFloat(bsData.totalLiabilitiesAndEquity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div style="flex: 1;">
          <div class="box-title">ASSETS (संपत्तियां)</div>
          <table>
            <thead><tr><th>Assets & Receivables</th><th style="text-align: right;">Amount (₹)</th></tr></thead>
            <tbody>${assetsRows || '<tr><td colspan="2" style="padding:6px; color:#94a3b8;">Nil</td></tr>'}</tbody>
          </table>
          <div style="margin-top: 14px; border-top: 2px solid #0f172a; padding-top: 8px; display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
            <span>TOTAL ASSETS:</span>
            <span>₹${parseFloat(bsData.totalAssets || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Balance Sheet - ${firmName}`);
};

/**
 * 3. Trial Balance PDF Exporter
 */
export const downloadTrialBalancePDF = async (tbData, firm) => {
  if (!tbData || !tbData.entries) {
    alert('⚠️ No Trial Balance entries to export.');
    return { success: false };
  }

  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
  const firmGstin = firm?.gstin || 'UNREGISTERED';
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `Trial_Balance_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStamp}.html`;

  const rows = tbData.entries.map((e, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 6px 8px; font-size: 11px; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-size: 11px; font-weight: 600;">${e.name}</td>
      <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">${e.sub_group}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? parseFloat(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? parseFloat(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Trial Balance - ${firmName}</title>
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
        <div style="font-size: 11px; color: #64748b;">GSTIN: ${firmGstin} | Double-Entry Verification</div>
        <div class="badge">TRIAL BALANCE (तलपट)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align: left;">Account Head</th>
            <th style="text-align: left;">Group Classification</th>
            <th style="text-align: right;">Debit Balance (₹)</th>
            <th style="text-align: right;">Credit Balance (₹)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; font-size: 12px; border-top: 2px solid #0f172a; padding-top: 6px;">
        <span style="color: #059669;">Total Debit: ₹${parseFloat(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span style="color: #dc2626;">Total Credit: ₹${parseFloat(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
    </body>
    </html>
  `;

  return await saveDocumentToLocalMemory(htmlContent, fileName, `Trial Balance - ${firmName}`);
};

/**
 * 4. General Journal Register (Daybook) PDF Exporter
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
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 8px; font-size: 11px; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-size: 11px; white-space: nowrap; font-weight: bold; color: #0284c7;">${v.voucher_date || v.date}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-weight: bold;">${v.voucher_number || v.reference_no}</td>
        <td style="padding: 6px 8px; font-size: 11px;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${v.voucher_type || v.type}</span></td>
        <td style="padding: 6px 8px; font-size: 11px;">
          <div style="color: #059669; font-weight: bold;">Dr: ${v.dr_account || v.dr_party}</div>
          <div style="color: #dc2626; font-weight: bold;">Cr: ${v.cr_account || v.cr_party}</div>
          ${v.narration ? `<small style="color: #64748b;">(${v.narration})</small>` : ''}
        </td>
        <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold; color: #0f172a;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
 * 5. Account Milan Ledger PDF Exporter
 */
export const downloadAccountStatementPDF = async (statement, firm) => {
  if (!statement || !statement.accountName) return { success: false };
  const firmName = firm?.legal_name || firm?.trade_name || 'Enterprise Profile';
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
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #059669; font-weight: bold;">${e.debit > 0 ? parseFloat(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: #dc2626; font-weight: bold;">${e.credit > 0 ? parseFloat(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td style="padding: 6px 8px; font-size: 11px; text-align: right; font-weight: bold;">₹${parseFloat(e.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${e.balance_type}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"/><title>Ledger - ${statement.accountName}</title>
    <style>body{font-family:sans-serif;margin:20px;color:#0f172a;} table{width:100%;border-collapse:collapse;margin-top:10px;} th{background:#0f172a;color:#fff;padding:6px;font-size:11px;}</style>
    </head><body>
      <h2>${firmName}</h2><div style="font-size:11px;color:#64748b;">GSTIN: ${firmGstin} | GENERAL LEDGER: ${statement.accountName}</div>
      <div style="margin:10px 0;font-size:11px;"><strong>Opening:</strong> ₹${parseFloat(statement.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${statement.openingBalanceType} | <strong>Closing:</strong> ₹${parseFloat(statement.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${statement.closingBalanceType}</div>
      <table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Particulars</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Balance (₹)</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:12px;text-align:right;font-size:11px;font-weight:bold;"><span style="color:#059669;margin-right:15px;">Total Dr: ₹${parseFloat(statement.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span><span style="color:#dc2626;">Total Cr: ₹${parseFloat(statement.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
    </body></html>
  `;
  return await saveDocumentToLocalMemory(html, fileName, `Ledger - ${statement.accountName}`);
};

export const downloadInvoicePDF = downloadAccountStatementPDF;
