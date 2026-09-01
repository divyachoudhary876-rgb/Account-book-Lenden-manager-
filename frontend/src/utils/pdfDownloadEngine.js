// frontend/src/utils/pdfDownloadEngine.js

/**
 * Universal Print-to-PDF Spooler for Web and Android WebViews
 */
export const printOrDownloadPDF = (title, htmlBody) => {
  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert("⚠️ Please allow popups or use modern browser to export PDF.");
    return;
  }

  const completeDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 8px;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .firm-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .report-subtitle {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            margin-top: 3px;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
            margin-top: 6px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            font-weight: 700;
            text-transform: uppercase;
            padding: 8px 10px;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-red { color: #dc2626; }
          .text-green { color: #16a34a; }
          .total-row {
            background-color: #f8fafc;
            border-top: 2px solid #0f172a;
            border-bottom: 3px double #0f172a;
            font-weight: 800;
            font-size: 11px;
          }
          .footer-note {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        ${htmlBody}
        <div class="footer-note">
          <span>Generated via Business Book ERP</span>
          <span>Official Computer-Generated Financial Record</span>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(completeDocument);
  printWindow.document.close();
};

/**
 * 1. Generate Account Milan (Ledger Statement) PDF
 */
export const downloadAccountStatementPDF = (firmName, accountName, statementData) => {
  const { transactions, netBalance, balanceType, totalDebit, totalCredit } = statementData;
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const rows = transactions.map((t, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="white-space: nowrap;">${t.date}</td>
      <td class="text-center font-bold">${t.voucher_type}</td>
      <td>
        <div class="font-bold">${t.particulars}</div>
        ${t.narration ? `<div style="font-size: 9px; color: #64748b;">${t.narration}</div>` : ''}
      </td>
      <td class="text-right text-red">${t.debit > 0 ? '₹' + t.debit.toFixed(2) : '-'}</td>
      <td class="text-right text-green">${t.credit > 0 ? '₹' + t.credit.toFixed(2) : '-'}</td>
      <td class="text-right font-bold">₹${t.balance.toFixed(2)} ${t.balanceType}</td>
    </tr>
  `).join('');

  const body = `
    <div class="header-box">
      <h1 class="firm-title">${firmName || 'NEELKANTH ENTERPRISE'}</h1>
      <div class="report-subtitle">PARTY LEDGER & ACCOUNT MILAN STATEMENT</div>
      <div class="meta-bar">
        <span><strong>Party A/C:</strong> ${accountName}</span>
        <span><strong>Statement Date:</strong> ${currentDate}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 12%;" class="text-center">Type</th>
          <th>Particulars & Narration</th>
          <th style="width: 15%;" class="text-right">Debit (Dr)</th>
          <th style="width: 15%;" class="text-right">Credit (Cr)</th>
          <th style="width: 18%;" class="text-right">Running Balance</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length > 0 ? rows : '<tr><td colspan="6" class="text-center" style="padding: 20px;">No entries found.</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" class="text-right">TOTAL TRANSACTIONS</td>
          <td class="text-right text-red">₹${totalDebit.toFixed(2)}</td>
          <td class="text-right text-green">₹${totalCredit.toFixed(2)}</td>
          <td class="text-right">₹${netBalance.toFixed(2)} ${balanceType}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px;">
      <div style="border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; width: 45%;">
        <strong>Net Settlement Balance:</strong><br/>
        Amount: <span class="font-bold">₹${netBalance.toFixed(2)}</span> (${balanceType === 'Dr' ? 'Receivable / बाकी लेना' : 'Payable / जमा देना'})
      </div>
      <div style="text-align: right; width: 35%; margin-top: 25px; border-top: 1px solid #94a3b8; padding-top: 4px;">
        Authorised Signatory
      </div>
    </div>
  `;

  printOrDownloadPDF(`Statement_${accountName}`, body);
};

/**
 * 2. Generate General Journal / Daybook PDF
 */
export const downloadJournalPDF = (firmName, vouchersList, filterType) => {
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const totalAmount = vouchersList.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);

  const rows = vouchersList.map((v, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="white-space: nowrap;">${v.voucher_date || v.date}</td>
      <td class="text-center font-bold">${v.voucher_type}</td>
      <td>
        <div><strong class="text-red">Dr:</strong> ${v.dr_account}</div>
        <div><strong class="text-green">Cr:</strong> ${v.cr_account}</div>
        ${v.narration ? `<div style="font-size: 9px; color: #64748b;">${v.narration}</div>` : ''}
      </td>
      <td class="text-right font-bold">₹${parseFloat(v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const body = `
    <div class="header-box">
      <h1 class="firm-title">${firmName || 'NEELKANTH ENTERPRISE'}</h1>
      <div class="report-subtitle">GENERAL JOURNAL / DAYBOOK REGISTER</div>
      <div class="meta-bar">
        <span><strong>Filter:</strong> ${filterType}</span>
        <span><strong>Records:</strong> ${vouchersList.length}</span>
        <span><strong>Date:</strong> ${currentDate}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 12%;" class="text-center">Type</th>
          <th>Dr / Cr Ledger Particulars</th>
          <th style="width: 20%;" class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length > 0 ? rows : '<tr><td colspan="4" class="text-center" style="padding: 20px;">No journal entries.</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" class="text-right">TOTAL TURNOVER</td>
          <td class="text-right">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
  `;

  printOrDownloadPDF(`Journal_Daybook_${filterType}`, body);
};

/**
 * 3. Generate Trading, P&L & Balance Sheet PDF
 */
export const downloadFinancialStatementsPDF = (firmName, reportsData) => {
  const { tradingAndPL, balanceSheet } = reportsData;
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const body = `
    <div class="header-box">
      <h1 class="firm-title">${firmName || 'NEELKANTH ENTERPRISE'}</h1>
      <div class="report-subtitle">ANNUAL FINANCIAL STATEMENTS (P&L & BALANCE SHEET)</div>
      <div class="meta-bar">
        <span><strong>Accounting Method:</strong> Accrual Double-Entry</span>
        <span><strong>As of Date:</strong> ${currentDate}</span>
      </div>
    </div>

    <!-- P&L -->
    <h3 style="margin: 14px 0 4px 0; font-size: 12px; color: #1e3a8a; border-bottom: 1.5px solid #1e3a8a; padding-bottom: 2px;">
      1. TRADING & PROFIT AND LOSS ACCOUNT
    </h3>
    <table>
      <thead>
        <tr>
          <th>Particulars / Revenue & Expense Heads</th>
          <th style="width: 30%;" class="text-right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Sales & Operating Revenue (+)</strong></td>
          <td class="text-right text-green font-bold">₹${tradingAndPL.salesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td><strong>Closing Stock Valuation (+)</strong></td>
          <td class="text-right text-green font-bold">₹${tradingAndPL.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Purchases & Material Inward (-)</td>
          <td class="text-right text-red">₹${tradingAndPL.purchasesCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Direct Labor & Fuel Expenses (-)</td>
          <td class="text-right text-red">₹${tradingAndPL.directExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background-color: #f1f5f9; font-weight: 700;">
          <td>Gross Profit / (Loss)</td>
          <td class="text-right">₹${tradingAndPL.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Other Income (+)</td>
          <td class="text-right text-green">₹${tradingAndPL.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Indirect Expenses & Administration (-)</td>
          <td class="text-right text-red">₹${tradingAndPL.indirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td>NET PROFIT / (LOSS) TRANSFERRED TO CAPITAL</td>
          <td class="text-right ${tradingAndPL.netProfit >= 0 ? 'text-green' : 'text-red'}">
            ₹${tradingAndPL.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- BALANCE SHEET -->
    <h3 style="margin: 20px 0 4px 0; font-size: 12px; color: #047857; border-bottom: 1.5px solid #047857; padding-bottom: 2px;">
      2. BALANCE SHEET AS OF ${currentDate}
    </h3>
    <table style="margin-top: 4px;">
      <thead>
        <tr>
          <th style="width: 50%;">LIABILITIES & CAPITAL</th>
          <th style="width: 50%;">ASSETS & PROPERTIES</th>
        </tr>
      </thead>
      <tbody>
        <tr style="vertical-align: top;">
          <td>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Sundry Creditors (Suppliers):</strong></span>
              <span class="font-bold">₹${balanceSheet.liabilities.sundryCreditors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Capital Account (Net Worth):</strong></span>
              <span class="font-bold">₹${balanceSheet.liabilities.capitalAccount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </td>
          <td>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Sundry Debtors (Customers):</strong></span>
              <span class="font-bold">₹${balanceSheet.assets.sundryDebtors.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Cash & Bank Balances:</strong></span>
              <span class="font-bold">₹${balanceSheet.assets.cashAndBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Closing Stock in Hand:</strong></span>
              <span class="font-bold">₹${balanceSheet.assets.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td style="padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>TOTAL LIABILITIES:</span>
              <span>₹${balanceSheet.liabilities.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </td>
          <td style="padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>TOTAL ASSETS:</span>
              <span>₹${balanceSheet.assets.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  printOrDownloadPDF('Financial_Statements_BalanceSheet', body);
};
