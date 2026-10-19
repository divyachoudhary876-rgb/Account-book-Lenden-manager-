// frontend/src/utils/dashboardDataEngine.js (Strict Ind AS / GAAP Filtering)

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const getDynamicDashboardMetrics = (firm, selectedFY) => {
  const firmId = firm?.id || firm?.firm_id || firm || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  
  const accountsRaw = localStorage.getItem(`app_accounts_${firmId}`) || localStorage.getItem(`account_heads_${firmId}`) || '[]';
  const accounts = JSON.parse(accountsRaw);

  let totalReceivables = 0;
  let totalPayables = 0;
  let totalCashBank = 0;

  accounts.forEach(acc => {
    const name = String(acc.account_name || acc.name || '').trim();
    const type = String(acc.primary_type || acc.type || '').toUpperCase();
    const grp = String(acc.sub_group || acc.group || '').toLowerCase();
    const balance = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc. opening_balance || 0));

    // 1. Cash & Bank Liquidity Filter
    if (name.toLowerCase().includes('cash') || name.toLowerCase().includes('bank') || grp.includes('bank') || grp.includes('cash')) {
      totalCashBank += (acc.balance_type === 'Cr' ? -balance : balance);
      return;
    }

    // 2. Strict Receivables Filter (Sundry Debtors Only - No Expenses, No Stock Accounts)
    const isDebtorGroup = grp.includes('debtor') || grp.includes('customer') || grp.includes('grahak') || grp.includes('lena');
    const isNotInvalidGroup = !grp.includes('expense') && !grp.includes('stock') && !grp.includes('inventory') && !grp.includes('asset') && !grp.includes('fixed asset');
    
    if (type === 'ASSETS' && isDebtorGroup && isNotInvalidGroup) {
      if (balance > 0) {
        totalReceivables += balance;
      }
      return;
    }

    // 3. Strict Payables Filter (Sundry Creditors Only)
    const isCreditorGroup = grp.includes('creditor') || grp.includes('supplier') || grp.includes('vendor') || grp.includes('thekedar') || grp.includes('dena');
    
    if (type === 'LIABILITIES' && isCreditorGroup && isNotInvalidGroup) {
      if (balance > 0) {
        totalPayables += balance;
      }
      return;
    }
  });

  return {
    cashAndBank: round2(totalCashBank),
    receivables: round2(totalReceivables),
    payables: round2(totalPayables),
    totalSales: 0,
    totalPurchases: 0
  };
};
