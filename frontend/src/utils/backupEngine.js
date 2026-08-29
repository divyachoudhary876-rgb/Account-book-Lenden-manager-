// Backup & Restore Engine to prevent Data Loss during App Re-installation
export const exportCompleteDataBackup = () => {
  try {
    const backupData = {
      version: "1.0.5",
      timestamp: new Date().toISOString(),
      active_firm_profile: JSON.parse(localStorage.getItem('active_firm_profile') || 'null'),
      app_account_heads: JSON.parse(localStorage.getItem('app_account_heads') || '[]'),
      app_vouchers: JSON.parse(localStorage.getItem('app_vouchers') || '[]'),
      app_invoices: JSON.parse(localStorage.getItem('app_invoices') || '[]')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AccountBook_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const restoreDataBackup = (fileContent) => {
  try {
    const parsed = JSON.parse(fileContent);
    if (!parsed.active_firm_profile && !parsed.app_account_heads) {
      throw new Error("Invalid Backup File Format.");
    }
    if (parsed.active_firm_profile) localStorage.setItem('active_firm_profile', JSON.stringify(parsed.active_firm_profile));
    if (parsed.app_account_heads) localStorage.setItem('app_account_heads', JSON.stringify(parsed.app_account_heads));
    if (parsed.app_vouchers) localStorage.setItem('app_vouchers', JSON.stringify(parsed.app_vouchers));
    if (parsed.app_invoices) localStorage.setItem('app_invoices', JSON.stringify(parsed.app_invoices));

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
