// frontend/src/utils/accountMasterEngine.js

export const getSubGroupsByPrimary = (primaryType) => {
  switch (primaryType) {
    case 'LIABILITIES':
      return [
        { id: 'CAPITAL_ACCOUNT', label: 'Capital Account (पूंजी खाता)', defaultBal: 'Cr' },
        { id: 'SUNDRY_CREDITORS', label: 'Sundry Creditors (लेनदार / Supplier)', defaultBal: 'Cr' },
        { id: 'DUTIES_AND_TAXES', label: 'Duties & Taxes (GST/TDS)', defaultBal: 'Cr' },
        { id: 'SECURED_LOANS', label: 'Secured / Unsecured Loans', defaultBal: 'Cr' }
      ];
    case 'ASSETS':
      return [
        { id: 'SUNDRY_DEBTORS', label: 'Sundry Debtors (देनदार / Customer)', defaultBal: 'Dr' },
        { id: 'BANK', label: 'Bank Accounts', defaultBal: 'Dr' },
        { id: 'CASH', label: 'Cash-in-Hand', defaultBal: 'Dr' },
        { id: 'FIXED_ASSETS', label: 'Fixed Assets', defaultBal: 'Dr' }
      ];
    case 'INCOME':
      return [
        { id: 'SALES_ACCOUNT', label: 'Sales Account', defaultBal: 'Cr' },
        { id: 'INDIRECT_INCOME', label: 'Other Income', defaultBal: 'Cr' }
      ];
    case 'EXPENSES':
      return [
        { id: 'PURCHASE_ACCOUNT', label: 'Purchase Account', defaultBal: 'Dr' },
        { id: 'DIRECT_EXPENSES', label: 'Direct Expenses (Labor/Freight)', defaultBal: 'Dr' },
        { id: 'INDIRECT_EXPENSES', label: 'Indirect Expenses (Office/Rent)', defaultBal: 'Dr' }
      ];
    default:
      return [];
  }
};
