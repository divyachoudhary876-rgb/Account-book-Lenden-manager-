// frontend/src/utils/firmInitializationEngine.js

export const initializeFirmWithIndustryDefaults = (firmProfile) => {
  const { legal_name, gstin, industry_type, state_code, address, phone } = firmProfile;

  const firmId = `FIRM-${Date.now()}`;
  const completeProfile = {
    id: firmId,
    legal_name,
    gstin: gstin || 'Unregistered',
    industry_type: industry_type || 'BRICK_KILN',
    state_code: state_code || '08 - Rajasthan',
    address,
    phone,
    created_at: new Date().toISOString()
  };

  // 1. Fetch Existing Local Storage Buckets
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');

  // 2. Industry-Specific Default Account Heads & Stock Items
  let defaultAccounts = [];
  let defaultItems = [];

  if (industry_type === 'BRICK_KILN') {
    defaultAccounts = [
      { id: `ACC-BK-1`, name: 'पथाई मजदूरी खाता (Labor Wages)', sub_group: 'DIRECT_EXPENSES', primary_type: 'EXPENSE', opening_balance: 0 },
      { id: `ACC-BK-2`, name: 'कोयला व ईंधन खर्च (Fuel Expense)', sub_group: 'DIRECT_EXPENSES', primary_type: 'EXPENSE', opening_balance: 0 },
      { id: `ACC-BK-3`, name: 'माइनिंग व रॉयल्टी खर्च (Royalty Expense)', sub_group: 'DIRECT_EXPENSES', primary_type: 'EXPENSE', opening_balance: 0 },
      { id: `ACC-BK-4`, name: 'भट्ठा बिक्री खाता (Kiln Sales Account)', sub_group: 'SALES_ACCOUNT', primary_type: 'INCOME', opening_balance: 0 }
    ];

    defaultItems = [
      { id: `ITEM-BK-1`, name: 'कच्ची ईंट (Raw Unbaked Brick)', unit: 'NOS', item_stage: 'RAW_KACHI', current_qty: 0, selling_price: 2500, purchase_price: 500 },
      { id: `ITEM-BK-2`, name: 'पक्की ईंट - अव्वल (Class A Brick)', unit: 'NOS', item_stage: 'FINISHED_PAKKI', grade_quality: 'FIRST_CLASS', current_qty: 0, selling_price: 6500, purchase_price: 0 },
      { id: `ITEM-BK-3`, name: 'पक्की ईंट - दोयं (Class B Brick)', unit: 'NOS', item_stage: 'FINISHED_PAKKI', grade_quality: 'SECOND_CLASS', current_qty: 0, selling_price: 4500, purchase_price: 0 },
      { id: `ITEM-BK-4`, name: 'चट्टा / रोड़ा (Roda)', unit: 'NOS', item_stage: 'FINISHED_PAKKI', grade_quality: 'RODA', current_qty: 0, selling_price: 2000, purchase_price: 0 }
    ];
  } else if (industry_type === 'BIOMASS_BRIQUETTE') {
    defaultAccounts = [
      { id: `ACC-BM-1`, name: 'सरसों भूसा / रॉ मटीरियल परचेज', sub_group: 'DIRECT_EXPENSES', primary_type: 'EXPENSE', opening_balance: 0 },
      { id: `ACC-BM-2`, name: 'फैब्रिकेशन व डाइ मेंटेनेंस', sub_group: 'INDIRECT_EXPENSES', primary_type: 'EXPENSE', opening_balance: 0 },
      { id: `ACC-BM-3`, name: 'बायोमास ब्रिकेट बिक्री खाता', sub_group: 'SALES_ACCOUNT', primary_type: 'INCOME', opening_balance: 0 }
    ];

    defaultItems = [
      { id: `ITEM-BM-1`, name: 'Mustard Husk (सरसों तूड़ी)', unit: 'MT', item_stage: 'RAW_MATERIAL', current_qty: 0, selling_price: 0, purchase_price: 3200 },
      { id: `ITEM-BM-2`, name: 'Biomass Briquettes (90mm White Pellet)', unit: 'MT', item_stage: 'FINISHED_GOODS', current_qty: 0, selling_price: 5200, purchase_price: 0 }
    ];
  }

  // Save Dynamic Profile & Default Masters
  localStorage.setItem('active_firm_profile', JSON.stringify(completeProfile));
  localStorage.setItem('app_account_heads', JSON.stringify([...accounts, ...defaultAccounts]));
  localStorage.setItem('app_inventory', JSON.stringify([...inventory, ...defaultItems]));

  window.dispatchEvent(new Event('storage'));
  return completeProfile;
};
