// snippet for strict expense account filtering in MaterialConsumptionView.jsx
const loadMasterData = () => {
  try {
    const inventory = StorageService.getInventoryItems();
    setItemsList(inventory);

    const storedAccounts = StorageService.getLedgerAccounts();
    const defaultAccounts = [
      { name: 'Diesel Expenses', category: 'Direct Expenses', group: 'Expenses' },
      { name: 'Fuel & Coal Consumption', category: 'Direct Expenses', group: 'Expenses' },
      { name: 'Machinery Maintenance', category: 'Indirect Expenses', group: 'Expenses' },
      { name: 'Tractor Kiraya', category: 'Direct Expenses', group: 'Expenses' }
    ];
    
    const accMap = new Map();
    
    // Combine defaults and stored accounts with strict categorization rules
    [...defaultAccounts, ...storedAccounts].forEach(acc => {
      const name = acc.name || acc.account_name;
      const rawCategory = acc.category || acc.account_group || acc.group || 'Expenses';
      
      if (name) {
        const lowerCat = String(rawCategory).toLowerCase();
        const lowerName = String(name).toLowerCase();
        
        // 1. Must be an expense-related account
        const isExpense = 
          lowerCat.includes('expense') || 
          lowerCat.includes('direct') || 
          lowerCat.includes('indirect') ||
          lowerName.includes('expense') ||
          lowerName.includes('maintenance') ||
          lowerName.includes('fuel') ||
          lowerName.includes('consumption') ||
          lowerName.includes('kiraya') ||
          lowerName.includes('labour');

        // 2. Must NOT be capital, bank, cash, or personal party accounts
        const isRestricted = 
          lowerCat.includes('capital') || 
          lowerCat.includes('asset') || 
          lowerCat.includes('liability') ||
          lowerCat.includes('income') ||
          lowerName.includes('capital') ||
          lowerName.includes('driver') ||
          lowerName.includes('cash') ||
          lowerName.includes('bank') ||
          lowerName.includes('rev');

        if (isExpense && !isRestricted) {
          accMap.set(name.trim(), { 
            name: name.trim(), 
            category: rawCategory 
          });
        }
      }
    });

    // Fallback if no custom expense head exists yet
    if (accMap.size === 0) {
      accMap.set('Diesel Expenses', { name: 'Diesel Expenses', category: 'Direct Expenses' });
      accMap.set('Machinery Maintenance', { name: 'Machinery Maintenance', category: 'Indirect Expenses' });
    }
    
    setAccountsList(Array.from(accMap.values()));
    setConsumptionList(StorageService.getMaterialConsumptions());
  } catch (e) {
    console.error('Account synchronization error:', e);
  }
};
