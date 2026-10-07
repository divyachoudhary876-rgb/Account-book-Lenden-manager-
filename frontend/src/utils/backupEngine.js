// frontend/src/utils/backupEngine.js (Upgraded Universal Schema Restorer)

export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) throw new Error("No backup data provided.");

    let parsedContent;
    if (typeof rawInput === 'string') parsedContent = JSON.parse(rawInput);
    else if (rawInput instanceof Blob || rawInput instanceof File) {
      const text = await rawInput.text();
      parsedContent = JSON.parse(text);
    } else parsedContent = rawInput;

    let targetData = parsedContent?.data && typeof parsedContent.data === 'object' && !Array.isArray(parsedContent.data) 
      ? parsedContent.data 
      : parsedContent?.storage_dump || parsedContent;

    if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
      throw new Error("Invalid backup schema structure.");
    }

    let activeFirmId = localStorage.getItem('app_active_firm_id') || 
                       parsedContent?.meta?.active_firm_id || 
                       targetData['app_active_firm_id'] || 
                       'FIRM-001';

    localStorage.setItem('app_active_firm_id', activeFirmId);

    // UNIVERSAL KEY FLATTENING & MIGRATION TO ACTIVE FIRM
    const mergedVouchersMap = new Map();
    const mergedAccountsMap = new Map();
    const mergedItemsMap = new Map();
    const mergedPurchasesMap = new Map();

    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (!val) return;

      // Extract and consolidate accounts from any key variant
      if (key.includes('account') || key.includes('head')) {
        const list = Array.isArray(val) ? val : Object.values(val);
        list.forEach(acc => {
          if (!acc) return;
          const name = String(acc.account_name || acc.name || '').trim();
          if (name && !mergedAccountsMap.has(name.toLowerCase())) {
            mergedAccountsMap.set(name.toLowerCase(), {
              ...acc,
              firm_id: activeFirmId,
              account_name: name,
              name: name
            });
          }
        });
      }

      // Extract and consolidate inventory items
      if (key.includes('inventory') || key.includes('stock') || key.includes('item')) {
        const list = Array.isArray(val) ? val : Object.values(val);
        list.forEach(item => {
          if (!item) return;
          const name = String(item.item_name || item.name || item.itemName || '').trim();
          if (name && !mergedItemsMap.has(name.toLowerCase())) {
            mergedItemsMap.set(name.toLowerCase(), {
              ...item,
              firm_id: activeFirmId,
              item_name: name,
              name: name
            });
          }
        });
      }

      // Extract and consolidate vouchers / daybook entries
      if (key.includes('voucher') || key.includes('invoice') || key.includes('adjustment') || key.includes('book')) {
        const list = Array.isArray(val) ? val : Object.values(val);
        list.forEach(v => {
          if (!v) return;
          const vId = v.id || v.reference_no || v.voucher_number || `${v.voucher_date || v.date}-${v.amount || v.total_amount}`;
          if (vId && !mergedVouchersMap.has(String(vId))) {
            mergedVouchersMap.set(String(vId), {
              ...v,
              firm_id: activeFirmId,
              firmId: activeFirmId
            });
          }
        });
      }

      // Extract and consolidate purchase bills
      if (key.includes('purchase') || key.includes('inward')) {
        const list = Array.isArray(val) ? val : Object.values(val);
        list.forEach(bill => {
          if (!bill) return;
          const bId = bill.id || bill.bill_number || bill.reference_no || `${bill.date || bill.purchase_date}-${bill.total_amount || bill.amount}`;
          if (bId && !mergedPurchasesMap.has(String(bId))) {
            mergedPurchasesMap.set(String(bId), {
              ...bill,
              firm_id: activeFirmId,
              firmId: activeFirmId
            });
          }
        });
      }

      // Also dump raw key into localStorage as fallback
      try {
        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
      } catch (e) {}
    });

    // Save consolidated arrays to active firm scoped keys
    const finalAccounts = Array.from(mergedAccountsMap.values());
    const finalItems = Array.from(mergedItemsMap.values());
    const finalVouchers = Array.from(mergedVouchersMap.values());
    const finalPurchases = Array.from(mergedPurchasesMap.values());

    if (finalAccounts.length > 0) {
      localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(finalAccounts));
      localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(finalAccounts));
      localStorage.setItem('app_accounts', JSON.stringify(finalAccounts));
    }
    if (finalItems.length > 0) {
      localStorage.setItem(`inventory_items_${activeFirmId}`, JSON.stringify(finalItems));
      localStorage.setItem('inventory_items', JSON.stringify(finalItems));
    }
    if (finalVouchers.length > 0) {
      localStorage.setItem(`app_vouchers_${activeFirmId}`, JSON.stringify(finalVouchers));
      localStorage.setItem(`account_book_vouchers_${activeFirmId}`, JSON.stringify(finalVouchers));
      localStorage.setItem('app_vouchers', JSON.stringify(finalVouchers));
    }
    if (finalPurchases.length > 0) {
      localStorage.setItem(`purchase_bills_${activeFirmId}`, JSON.stringify(finalPurchases));
      localStorage.setItem('purchase_bills', JSON.stringify(finalPurchases));
    }

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        vouchersCount: finalVouchers.length,
        accountsCount: finalAccounts.length,
        purchasesCount: finalPurchases.length
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};
