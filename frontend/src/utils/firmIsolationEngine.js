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

    window.__APP_STORAGE_CACHE__ = window.__APP_STORAGE_CACHE__ || {};

    // 1. CRITICAL FIX: Pehle local device ki sabhi existing firms ko safely collect karein taaki dusri firms (jaise 'Bb') delete na ho
    let aggregatedFirmsMap = new Map();
    
    // Local storage ya IDB se purani saari firms uthaein
    const existingFirms = IDBStorage.getItem('app_firms_registry', []) || IDBStorage.getItem('app_firms', []) || [];
    existingFirms.forEach(f => {
      if (f && (f.id || f.firm_id)) {
        const fId = f.id || f.firm_id;
        const cleanName = (f.legal_name || f.trade_name || f.name || '').trim().toLowerCase();
        aggregatedFirmsMap.set(fId, { ...f, id: fId, firm_id: fId, _cleanName: cleanName });
      }
    });

    // 2. Backup file ke andar ki firms ko bhi isme merge karein (Overwrite nahi, balki combine karein)
    let firmIdMapping = {}; 
    let backupFirmsList = [];

    const registryKeys = ['app_firms_registry', 'app_firms', 'firm_list', 'app_firms_list'];
    registryKeys.forEach(rk => {
      if (targetData[rk] && Array.isArray(targetData[rk])) {
        backupFirmsList.push(...targetData[rk]);
      }
    });

    if (targetData['active_firm_profile']) {
      try {
        const prof = typeof targetData['active_firm_profile'] === 'string' 
          ? JSON.parse(targetData['active_firm_profile']) 
          : targetData['active_firm_profile'];
        if (prof) backupFirmsList.push(prof);
      } catch (e) {}
    }

    backupFirmsList.forEach(firm => {
      if (firm && (firm.id || firm.firm_id || firm.legal_name)) {
        const oldId = firm.id || firm.firm_id;
        const fName = (firm.legal_name || firm.trade_name || firm.name || 'AccountBook Firm').trim();
        const cleanName = fName.toLowerCase();

        // Check karein kya ye firm pehle se local device me maujud hai
        let existingMatch = Array.from(aggregatedFirmsMap.values()).find(ef => ef._cleanName === cleanName);

        if (existingMatch) {
          // Agar same naam ki firm pehle se hai, toh purani ID ko map kar dein taaki data mix na ho
          if (oldId && oldId !== existingMatch.id) {
            firmIdMapping[oldId] = existingMatch.id;
          }
        } else {
          // Agar nayi firm hai backup me jo local me nahi thi, toh use list me add kar dein
          const newId = oldId || `FIRM-${Math.floor(Math.random() * 100000)}`;
          aggregatedFirmsMap.set(newId, {
            id: newId,
            firm_id: newId,
            legal_name: fName,
            trade_name: fName,
            business_category: firm.business_category || firm.category || 'BRICK_KILN',
            gstin: firm.gstin || 'UNREGISTERED',
            _cleanName: cleanName
          });
        }
      }
    });

    let finalFirmsList = Array.from(aggregatedFirmsMap.values()).map(({ _cleanName, ...rest }) => rest);
    
    // 3. Backup ka data dump karein bina dusri firm ke scoped keys ko nuksan પહોંચayein
    Object.keys(targetData).forEach(key => {
      try {
        let val = targetData[key];
        let targetKey = key;

        Object.keys(firmIdMapping).forEach(oldId => {
          if (key.includes(oldId)) {
            targetKey = key.replace(oldId, firmIdMapping[oldId]);
          }
        });

        // Agar key global registry nahi hai, toh use safe ID ke sath save karein
        IDBStorage.setItem(targetKey, val);
      } catch (e) {}
    });

    let activeFirmId = parsedContent?.meta?.active_firm_id || finalFirmsList[0].id;
    if (firmIdMapping[activeFirmId]) {
      activeFirmId = firmIdMapping[activeFirmId];
    }

    // 4. Dono firm ki list ko safe update karein
    IDBStorage.setItem('app_firms_registry', finalFirmsList);
    IDBStorage.setItem('app_firms', finalFirmsList);
    IDBStorage.setItem('app_active_firm_id', activeFirmId);
    IDBStorage.setItem('active_firm_profile', finalFirmsList.find(f => f.id === activeFirmId) || finalFirmsList[0]);

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    return { success: true, stats: { firmsCount: finalFirmsList.length } };
  } catch (err) {
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};
