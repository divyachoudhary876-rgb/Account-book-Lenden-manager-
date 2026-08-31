// frontend/src/utils/journalEngine.js

import { getAccountHeads } from './statementEngine.js';

export const getJournalVouchersByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  let vouchers = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_vouchers')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) vouchers = vouchers.concat(parsed);
        }
      }
    }

    // Deduplicate vouchers by ID
    const voucherMap = new Map();
    vouchers.forEach(v => {
      if (v && v.id) voucherMap.set(v.id, v);
    });
    vouchers = Array.from(voucherMap.values());
  } catch (e) {
    vouchers = [];
  }

  return vouchers;
};

export const updateJournalVoucher = (firmId, updatedVoucher) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  const existingVouchers = getJournalVouchersByFirm(targetId);
  const index = existingVouchers.findIndex(v => v.id === updatedVoucher.id);
  
  if (index !== -1) {
    existingVouchers[index] = { 
      ...updatedVoucher, 
      updated_at: new Date().toISOString() 
    };
    localStorage.setItem(key, JSON.stringify(existingVouchers));
    localStorage.setItem('app_vouchers_global', JSON.stringify(existingVouchers));
    
    // Broadcast event across UI
    window.dispatchEvent(new Event('accounts_master_updated'));
    window.dispatchEvent(new Event('storage'));
  }
  return existingVouchers;
};

export const deleteJournalVoucher = (firmId, voucherId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  const existingVouchers = getJournalVouchersByFirm(targetId);
  const updated = existingVouchers.filter(v => v.id !== voucherId);
  
  localStorage.setItem(key, JSON.stringify(updated));
  localStorage.setItem('app_vouchers_global', JSON.stringify(updated));
  
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));
  return updated;
};

export const downloadJournalCSV = (firmName, vouchers) => {
  if (!vouchers || vouchers.length === 0) {
    alert("⚠️ Journal Register is empty. No records to export.");
    return;
  }

  let csvRows = [];
  csvRows.push(`"GENERAL JOURNAL REGISTER (DAY BOOK)"`);
  csvRows.push(`"Firm: ${firmName}"`);
  csvRows.push(`"Export Date: ${new Date().toLocaleDateString()}"`);
  csvRows.push("");
  csvRows.push(`"Date","Voucher Ref","Voucher Type","Debit Account (Dr)","Credit Account (Cr)","Amount (Rs)"`);

  let totalAmount = 0;

  vouchers.forEach(v => {
    const amt = parseFloat(v.amount || 0);
    totalAmount += amt;
    csvRows.push(`"${v.date || ''}","${v.id}","${v.voucher_type || 'JOURNAL'}","${v.dr_account}","${v.cr_account}","${amt.toFixed(2)}"`);
  });

  csvRows.push(`"TOTAL","","","","","${totalAmount.toFixed(2)}"`);

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Journal_Register_${firmName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
