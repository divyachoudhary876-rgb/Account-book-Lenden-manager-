// frontend/src/utils/financialReportEngine.js

export const calculateFinancialReports = () => {
  try {
    const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const journalLines = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeHeads = [];
    const expenseHeads = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    const assetHeads = [];
    const liabilityHeads = [];
    const equityHeads = [];

    accounts.forEach(acc => {
      const opening = parseFloat(acc.opening_balance || 0);
      const lines = journalLines.filter(j => j.account_id === acc.id);
      const drSum = lines.reduce((sum, l) => sum + parseFloat(l.debit || 0), 0);
      const crSum = lines.reduce((sum, l) => sum + parseFloat(l.credit || 0), 0);

      let netBal = opening;
      if (['ASSET', 'EXPENSE'].includes(acc.primary_type)) {
        netBal += (drSum - crSum);
      } else {
        netBal += (crSum - drSum);
      }

      const item = { id: acc.id, name: acc.name, subGroup: acc.sub_group || 'GENERAL', balance: Math.abs(netBal) };

      if (acc.primary_type === 'INCOME') {
        totalIncome += netBal;
        incomeHeads.push(item);
      } else if (acc.primary_type === 'EXPENSE') {
        totalExpenses += netBal;
        expenseHeads.push(item);
      } else if (acc.primary_type === 'ASSET') {
        totalAssets += netBal;
        assetHeads.push(item);
      } else if (acc.primary_type === 'LIABILITY') {
        totalLiabilities += netBal;
        liabilityHeads.push(item);
      } else if (acc.primary_type === 'EQUITY') {
        totalEquity += netBal;
        equityHeads.push(item);
      }
    });

    const netProfitOrLoss = totalIncome - totalExpenses;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netProfitOrLoss;

    return {
      pnl: { totalIncome, totalExpenses, netProfitOrLoss, incomeHeads, expenseHeads },
      balanceSheet: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        netProfitOrLoss,
        totalLiabilitiesAndEquity,
        assetHeads,
        liabilityHeads,
        equityHeads,
        isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
      }
    };
  } catch (err) {
    console.error("Report Calc Error:", err);
    return {
      pnl: { totalIncome: 0, totalExpenses: 0, netProfitOrLoss: 0, incomeHeads: [], expenseHeads: [] },
      balanceSheet: { totalAssets: 0, totalLiabilities: 0, totalEquity: 0, netProfitOrLoss: 0, totalLiabilitiesAndEquity: 0, assetHeads: [], liabilityHeads: [], equityHeads: [], isBalanced: true }
    };
  }
};
