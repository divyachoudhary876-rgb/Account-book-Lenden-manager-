// frontend/src/utils/cleanFinancialEngine.js
import { StorageService } from './storageSync';

export const getCleanFirmVouchers = (activeFirmId = 'FIRM-001') => {
  let rawTx = [];
  
  // संभावित सभी कीज़ की लिस्ट
  const potentialKeys = [
    'account_book_vouchers',
    'app_vouchers',
    'vouchers',
    'transactions',
    'daybook',
    'app_payroll_entries',
    `account_book_vouchers_${activeFirmId}`,
    `app_vouchers_${activeFirmId}`,
    `app_payroll_entries_${activeFirmId}`
  ];

  potentialKeys.forEach(k => {
    const val = StorageService.getItem ? StorageService.getItem(k) : JSON.parse(localStorage.getItem(k) || '[]');
    if (Array.isArray(val)) rawTx.push(...val);
  });

  // डुप्लीकेट हटाने और शुद्ध वाउचर बनाने के लिए Map का उपयोग
  const uniqueMap = new Map();

  rawTx.forEach(tx => {
    if (!tx) return;

    // फर्म आइसोलेशन चेक
    const txFirm = tx.firm_id || 'FIRM-001';
    if (txFirm !== activeFirmId && txFirm !== 'FIRM-001' && activeFirmId !== 'FIRM-001') {
      return;
    }

    const uId = tx.id || tx.reference_no || `${tx.voucher_date || tx.date}-${Math.random()}`;

    // यदि यह डायरेक्ट पेरोल/मजदूरी प्रविष्टि है, तो इसे स्टैंडर्ड JV वाउचर में बदलें
    if (tx.worker && tx.expense_ledger && tx.total_amount) {
      const formattedVoucher = {
        id: tx.id || `PAY-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: tx.date || '2026-09-13',
        voucher_type: 'JV',
        reference_no: tx.id ? tx.id.slice(-6) : '1001',
        narration: `Wages credited to ${tx.worker} via ${tx.expense_ledger} - ${tx.description || ''}`,
        entries: [
          { account_name: tx.expense_ledger, type: 'Dr', amount: Number(tx.total_amount) },
          { account_name: tx.worker, type: 'Cr', amount: Number(tx.total_amount) }
        ]
      };
      uniqueMap.set(formattedVoucher.id, formattedVoucher);
    } else if (Array.isArray(tx.entries) && tx.entries.length > 0) {
      uniqueMap.set(uId, tx);
    }
  });

  return Array.from(uniqueMap.values());
};
