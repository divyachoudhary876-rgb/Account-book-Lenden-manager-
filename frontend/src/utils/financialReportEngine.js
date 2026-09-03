// frontend/src/utils/financialReportEngine.js

/**
 * Safely fetches accounts without relying on strict external exports
 */
export const getSafeAccounts = (firmId = 'FIRM-001') => {
  const accKey = `app_accounts_${firmId}`;
  try {
    const raw = localStorage.getItem(accKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [
    { id: 'ACC-1', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr' },
    { id: 'ACC-2', account_name: 'Bank Account', primary_type: 'ASSETS', sub_group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr' }
  ];
};

export const getNormalizedLedgerLines = (firmId = 'FIRM-001') => {
  const vouchersKey = `app_vouchers_${firmId}`;
  let rawVouchers = [];
  try {
    rawVouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
  } catch (e) {
    console.error('Error reading vouchers:', e);
  }

  const flatLines = [];
  rawVouchers.forEach((vch) => {
    const vchDate = vch.voucher_date || vch.date || '';
    const vchNum = vch.reference_no || vch.voucher_number || 'VCH';
    const vchType = vch.voucher_type || vch.type || 'JOURNAL';
    const narration = vch.narration || '';

    if (Array.isArray(vch.entries) && vch.entries.length > 0) {
      vch.entries.forEach((entry) => {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: (entry.account_name || '').trim(),
          entry_type: entry.type,
          amount: parseFloat(entry.amount || 0),
          narration
        });
      });
    } else {
      const amt = parseFloat(vch.amount || 0);
      if (vch.dr_account) {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: vch.dr_account.trim(),
          entry_type: 'Dr',
          amount: amt,
          narration
        });
      }
      if (vch.cr_account) {
        flatLines.push({
          voucher_id: vch.id,
          date: vchDate,
          voucher_number: vchNum,
          voucher_type: vchType,
          account_name: vch.cr_account.trim(),
          entry_type: 'Cr',
          amount: amt,
          narration
        });
      }
    }
  });

  return flatLines;
};

export const calculateDashboardKPIs = (firmId = 'FIRM-001') => {
  const accounts = getSafeAccounts(firmId);
  const flatLines = getNormalizedLedgerLines(firmId);

  const accountBalances = {};
  accounts.forEach((acc) => {
    const opening = parseFloat(acc.opening_balance || 0);
    const isDr = acc.balance_type === 'Dr';
    accountBalances[acc.account_name] = isDr ? opening : -opening;
  });

  flatLines.forEach((line) => {
    if (!accountBalances.hasOwnProperty(line.account_name)) {
      accountBalances[line.account_name] = 0;
    }
    if (line.entry_type === 'Dr') {
      accountBalances[line.account_name] += line.amount;
    } else {
      accountBalances[line.account_name] -= line.amount;
    }
  });

  let cashInHand = 0;
  let bankBalance = 0;
  let sundryDebtors = 0;
  let sundryCreditors = 0;

  Object.keys(accountBalances).forEach((name) => {
    const net = accountBalances[name];
    const nameLower = name.toLowerCase();

    if (nameLower.includes('cash') || nameLower.includes('रोकड़')) {
      cashInHand += net;
    } else if (nameLower.includes('bank') || nameLower.includes('बैंक')) {
      bankBalance += net;
    } else if (net > 0) {
      sundryDebtors += net;
    } else if (net < 0) {
      sundryCreditors += Math.abs(net);
    }
  });

  return {
    cashInHand: parseFloat(cashInHand.toFixed(2)),
    bankBalance: parseFloat(bankBalance.toFixed(2)),
    sundryDebtors: parseFloat(sundryDebtors.toFixed(2)),
    sundryCreditors: parseFloat(sundryCreditors.toFixed(2))
  };
};

export const getAccountStatement = (firmId = 'FIRM-001', targetAccountName = '') => {
  if (!targetAccountName) return { openingBalance: 0, transactions: [], closingBalance: 0 };

  const accounts = getSafeAccounts(firmId);
  const accountMaster = accounts.find(a => a.account_name === targetAccountName);
  
  let runningBal = 0;
  const opening = parseFloat(accountMaster?.opening_balance || 0);
  runningBal = (accountMaster?.balance_type === 'Dr') ? opening : -opening;

  const flatLines = getNormalizedLedgerLines(firmId);
  const partyLines = flatLines.filter(l => l.account_name === targetAccountName);

  partyLines.sort((a, b) => new Date(a.date) - new Date(b.date));

  const transactions = partyLines.map((line) => {
    const dr = line.entry_type === 'Dr' ? line.amount : 0;
    const cr = line.entry_type === 'Cr' ? line.amount : 0;
    runningBal = runningBal + dr - cr;

    return {
      date: line.date,
      voucher_number: line.voucher_number,
      voucher_type: line.voucher_type,
      narration: line.narration,
      debit: dr,
      credit: cr,
      runningBalance: Math.abs(runningBal),
      balanceType: runningBal >= 0 ? 'Dr' : 'Cr'
    };
  });

  return {
    accountName: targetAccountName,
    openingBalance: Math.abs(opening),
    openingType: accountMaster?.balance_type || 'Dr',
    transactions,
    closingBalance: Math.abs(runningBal),
    closingType: runningBal >= 0 ? 'Dr' : 'Cr'
  };
};
