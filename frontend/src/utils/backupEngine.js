// frontend/src/utils/backupEngine.js

/**
 * 1. Export Complete Firm Ledger & Stock Data to Encrypted/JSON Backup
 */
export const exportUniversalBackup = (firmId = 'FIRM-001', firmName = 'Enterprise') => {
  try {
    const backupPayload = {
      manifest: {
        app: 'Business Book ERP',
        backupVersion: '2.0.0',
        firmId: firmId,
        firmName: firmName,
        exportedAt: new Date().toISOString()
      },
      accounts: JSON.parse(localStorage.getItem(`app_accounts_${firmId}`) || '[]'),
      vouchers: JSON.parse(localStorage.getItem(`app_vouchers_${firmId}`) || '[]'),
      stock: JSON.parse(localStorage.getItem(`app_stock_${firmId}`) || '[]'),
      firmsRegistry: JSON.parse(localStorage.getItem('app_firms_registry') || '[]')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BusinessBook_Backup_${firmName}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    return { success: true, count: backupPayload.vouchers.length };
  } catch (error) {
    throw new Error("Backup generation failed: " + error.message);
  }
};

/**
 * 2. Adaptive Restore Engine (Old App Backup -> New App Converter)
 */
export const restoreUniversalBackup = async (file, targetFirmId = 'FIRM-001') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const rawData = JSON.parse(event.target.result);

        // Normalize Legacy vs New Schema
        const accounts = rawData.accounts || rawData.accountList || rawData.account_heads || [];
        const vouchers = rawData.vouchers || rawData.voucherList || rawData.journal_entries || [];
        const stock = rawData.stock || rawData.stockItems || rawData.inventory || [];
        const firms = rawData.firmsRegistry || rawData.firms || [];

        // 1. Transform Accounts (Handling missing fields)
        const normalizedAccounts = accounts.map((acc, index) => ({
          id: acc.id || `ACC-${Date.now()}-${index}`,
          account_name: (acc.account_name || acc.name || acc.party_name || 'General Account').trim(),
          primary_type: (acc.primary_type || acc.type || 'ASSETS').toUpperCase(),
          sub_group: acc.sub_group || acc.group || 'Sundry Debtors (Customer / देनदार)',
          opening_balance: parseFloat(acc.opening_balance || acc.opening || 0),
          balance_type: acc.balance_type || (acc.opening_balance >= 0 ? 'Dr' : 'Cr'),
          gstin: acc.gstin || '',
          phone: acc.phone || acc.mobile || '',
          is_system_locked: Boolean(acc.is_system_locked),
          updated_at: acc.updated_at || new Date().toISOString()
        }));

        // 2. Transform Vouchers (Double-entry compliance)
        const normalizedVouchers = vouchers.map((vch, index) => ({
          id: vch.id || `VCH-${Date.now()}-${index}`,
          firm_id: targetFirmId,
          voucher_date: vch.voucher_date || vch.date || new Date().toISOString().split('T')[0],
          date: vch.voucher_date || vch.date || new Date().toISOString().split('T')[0],
          voucher_type: (vch.voucher_type || vch.type || 'JOURNAL').toUpperCase(),
          dr_account: (vch.dr_account || vch.debit_account || vch.dr_party || '').trim(),
          cr_account: (vch.cr_account || vch.credit_account || vch.cr_party || '').trim(),
          amount: parseFloat(vch.amount || vch.total_amount || 0),
          quantity: parseFloat(vch.quantity || vch.qty || 0),
          unit_rate: parseFloat(vch.unit_rate || vch.rate || 0),
          item_name: vch.item_name || null,
          reference_no: vch.reference_no || vch.bill_no || `REF-${index + 1}`,
          narration: vch.narration || vch.remarks || '',
          created_at: vch.created_at || new Date().toISOString()
        }));

        // 3. Transform Stock Items (Unit and valuation alignment)
        const normalizedStock = stock.map((stk, index) => ({
          id: stk.id || `STK-${Date.now()}-${index}`,
          item_name: (stk.item_name || stk.name || 'Stock Item').trim(),
          unit: stk.unit || 'Pcs',
          current_stock: parseFloat(stk.current_stock || stk.quantity || stk.stock || 0),
          unit_purchase_price: parseFloat(stk.unit_purchase_price || stk.purchase_rate || stk.cost || 0),
          selling_price: parseFloat(stk.selling_price || stk.sale_rate || 0),
          updated_at: stk.updated_at || new Date().toISOString()
        }));

        // Save into active LocalStorage
        localStorage.setItem(`app_accounts_${targetFirmId}`, JSON.stringify(normalizedAccounts));
        localStorage.setItem(`app_vouchers_${targetFirmId}`, JSON.stringify(normalizedVouchers));
        localStorage.setItem(`app_stock_${targetFirmId}`, JSON.stringify(normalizedStock));

        if (firms.length > 0) {
          localStorage.setItem('app_firms_registry', JSON.stringify(firms));
        }

        // Trigger reactive reload across all dashboard, statement, and inventory views
        window.dispatchEvent(new Event('app_state_updated'));
        window.dispatchEvent(new Event('stock_updated'));

        resolve({
          success: true,
          accountsRestored: normalizedAccounts.length,
          vouchersRestored: normalizedVouchers.length,
          stockRestored: normalizedStock.length
        });
      } catch (err) {
        reject(new Error("Corrupted or invalid JSON file: " + err.message));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file from disk."));
    reader.readAsText(file);
  });
};
