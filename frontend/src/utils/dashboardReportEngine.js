// frontend/src/utils/dashboardDataEngine.js

import { StorageService } from './storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const getDynamicDashboardMetrics = (firm, selectedFY) => {
  const firmId = firm?.id || firm?.firm_id || firm || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  
  const accountsKey = `app_accounts_${firmId}`;
  const accounts = StorageService.getItem(accountsKey, []) || StorageService.getItem('app_account_heads', []) || [];

  let totalReceivables = 0;
  let totalPayables = 0;
  let totalCashBank = 0;

  accounts.forEach(acc => {
    if (!acc) return;
    const name = String(acc.account_name || acc.name || '').trim();
    const type = String(acc.primary_type || acc.type || '').toUpperCase();
    const grp = String(acc.sub_group || acc.group || '').toLowerCase();
    const balance = parseFloat(acc.current_balance !== undefined ? acc.current_balance : (acc.opening_balance || 0));

    // 1. Cash & Bank Liquidity Filter
    if (name.toLowerCase().includes('cash') || name.toLowerCase().includes('bank') || grp.includes('bank') || grp.includes('cash')) {
      totalCashBank += (acc.balance_type === 'Cr' ? -balance : balance);
      return;
    }

    // 2. Strict Receivables Filter (Sundry Debtors Only - Excluding Expenses, Assets, Stock, Incomes)
    const isDebtorGroup = grp.includes('debtor') || grp.includes('customer') || grp.includes('grahak') || grp.includes('lena');
    const isInvalidGroup = grp.includes('expense') || grp.includes('stock') || grp.includes('inventory') || grp.includes('asset') || grp.includes('fixed asset') || grp.includes('income');

    if (type === 'ASSETS' && isDebtorGroup && !isInvalidGroup) {
      if (balance > 0) {
        totalReceivables += balance;
      }
      return;
    }

    // 3. Strict Payables Filter (Sundry Creditors & Labour/Thekedar Only)
    const isCreditorGroup = grp.includes('creditor') || grp.includes('supplier') || grp.includes('vendor') || grp.includes('thekedar') || grp.includes('dena');

    if (type === 'LIABILITIES' && isCreditorGroup && !isInvalidGroup) {
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
