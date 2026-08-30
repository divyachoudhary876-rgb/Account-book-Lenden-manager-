// frontend/src/utils/suggestionEngine.js

// Standard Safe Dummy Suggestions
const SAFE_DUMMY_SUGGESTIONS = [
  { text: 'Tea & Office Refreshment Expenses', group: 'INDIRECT_EXPENSES', category: 'EXPENSE' },
  { text: 'Freight & Carriage Inward Charges', group: 'DIRECT_EXPENSES', category: 'EXPENSE' },
  { text: 'Factory Electricity & Power Bill', group: 'DIRECT_EXPENSES', category: 'EXPENSE' },
  { text: 'Office Printing & Stationery Expenses', group: 'INDIRECT_EXPENSES', category: 'EXPENSE' },
  { text: 'Machine Repair & Maintenance', group: 'DIRECT_EXPENSES', category: 'EXPENSE' },
  { text: 'General Cash Sales Counter Revenue', group: 'SALES_ACCOUNT', category: 'INCOME' },
  { text: 'Payment released via NEFT / Net Banking', group: 'NARRATION', category: 'NARRATION' },
  { text: 'Being petty cash balance reimbursed', group: 'NARRATION', category: 'NARRATION' }
];

export const getIsolatedStandardSuggestions = (query = '', category = 'ALL') => {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  // Filter strictly from hardcoded non-sensitive dummy pool
  return SAFE_DUMMY_SUGGESTIONS.filter(item => {
    const matchesCategory = category === 'ALL' || item.category === category;
    const matchesQuery = item.text.toLowerCase().includes(lowerQuery);
    return matchesCategory && matchesQuery;
  });
};
