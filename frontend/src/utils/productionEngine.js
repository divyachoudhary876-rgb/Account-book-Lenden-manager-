// frontend/src/utils/productionEngine.js

// 1. Pathai Labor Payment -> Auto Increase Kachi Int Stock
export const processPathaiLaborEntry = (payload) => {
  const { laborAccountId, kachiIntItemId, bricksProducedQty, ratePerThousand, paymentAmount, date, narration } = payload;

  const numericQty = parseFloat(bricksProducedQty || 0);
  const numericAmount = parseFloat(paymentAmount || 0);

  if (numericQty <= 0) {
    throw new Error("वैध कच्ची ईंट की मात्रा दर्ज करें।");
  }

  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

  // Update Kachi Int Stock (Auto Increase +)
  const itemIndex = inventory.findIndex(i => i.id === kachiIntItemId || i.item_stage === 'RAW_KACHI');
  if (itemIndex === -1) {
    throw new Error("कच्ची ईंट (Kachi Int) का स्टॉक आइटम मास्टर में उपलब्ध नहीं है।");
  }

  const kachiItem = { ...inventory[itemIndex] };
  kachiItem.current_qty = parseFloat(kachiItem.current_qty || 0) + numericQty;
  inventory[itemIndex] = kachiItem;

  // Ledger Postings: Dr. Direct Wages (Pathai Expense) / Cr. Labor Party or Cash
  const voucherId = `PATHAI-${Date.now()}`;
  const drWages = {
    id: `JL-${Date.now()}-DR`,
    voucher_id: voucherId,
    account_id: 'ACC-DIRECT-WAGES',
    account_name: 'पथाई मजदूरी खर्च (Direct Labor Expense)',
    date,
    debit: numericAmount,
    credit: 0,
    narration: `${numericQty} कच्ची ईंट पथाई भुगतान @ ₹${ratePerThousand}/1000`
  };

  const crLabor = {
    id: `JL-${Date.now()}-CR`,
    voucher_id: voucherId,
    account_id: laborAccountId,
    account_name: 'पथाई लेबर खाता / Cash',
    date,
    debit: 0,
    credit: numericAmount,
    narration
  };

  // Persist State
  localStorage.setItem('app_inventory', JSON.stringify(inventory));
  localStorage.setItem('app_journal_entries', JSON.stringify([drWages, crLabor, ...journalEntries]));

  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: {} }));
  window.dispatchEvent(new Event('storage'));

  return kachiItem;
};

// 2. Kiln Unloading (निकासी) -> Convert Kachi Int into Pakki Int Grades
export const processBhattaNikasiTransformation = (payload) => {
  const { kachiItemId, kachiUsedQty, pakkiGradeAItemId, gradeAQty, pakkiGradeBItemId, gradeBQty, rodaItemId, rodaQty, date } = payload;

  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');

  // 1. Decrease Kachi Int Quantity
  const kachiIdx = inventory.findIndex(i => i.id === kachiItemId);
  if (kachiIdx === -1) throw new Error("कच्ची ईंट मटीरियल नहीं मिला।");

  const kachiItem = { ...inventory[kachiIdx] };
  if (kachiItem.current_qty < kachiUsedQty) {
    throw new Error(`स्टॉक में पर्याप्त कच्ची ईंट उपलब्ध नहीं है। वर्तमान स्टॉक: ${kachiItem.current_qty}`);
  }
  kachiItem.current_qty -= parseFloat(kachiUsedQty);
  inventory[kachiIdx] = kachiItem;

  // 2. Increase Pakki Int Grades (A Class, B Class, Roda)
  if (gradeAQty > 0 && pakkiGradeAItemId) {
    const idx = inventory.findIndex(i => i.id === pakkiGradeAItemId);
    if (idx !== -1) inventory[idx].current_qty += parseFloat(gradeAQty);
  }
  if (gradeBQty > 0 && pakkiGradeBItemId) {
    const idx = inventory.findIndex(i => i.id === pakkiGradeBItemId);
    if (idx !== -1) inventory[idx].current_qty += parseFloat(gradeBQty);
  }
  if (rodaQty > 0 && rodaItemId) {
    const idx = inventory.findIndex(i => i.id === rodaItemId);
    if (idx !== -1) inventory[idx].current_qty += parseFloat(rodaQty);
  }

  localStorage.setItem('app_inventory', JSON.stringify(inventory));
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: {} }));
  window.dispatchEvent(new Event('storage'));

  return true;
};
