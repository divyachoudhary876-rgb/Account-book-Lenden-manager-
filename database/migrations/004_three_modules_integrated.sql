BEGIN;

-- 1. Receipt / Payment Receipts Table (For Module 2)
CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount_received NUMERIC(12, 2) NOT NULL CHECK (amount_received > 0),
    payment_mode VARCHAR(30) NOT NULL, -- CASH, BANK_TRANSFER, UPI, CHEQUE
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Receipt to Invoice Settlement Mapping (For Knock-off Reconciliation)
CREATE TABLE IF NOT EXISTS receipt_invoice_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES payment_receipts(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    settled_amount NUMERIC(12, 2) NOT NULL CHECK (settled_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. System Accounts Initialization (For Module 1 & 2 Double-Entry Engine)
INSERT INTO accounts (account_code, account_name, account_type) 
VALUES 
    ('ACCOUNTS_RECEIVABLE', 'Accounts Receivable (Debtors)', 'ASSET'),
    ('SALES_INCOME', 'Sales Account', 'INCOME'),
    ('DUTIES_CGST', 'CGST Payable', 'LIABILITY'),
    ('DUTIES_SGST', 'SGST Payable', 'LIABILITY'),
    ('DUTIES_IGST', 'IGST Payable', 'LIABILITY'),
    ('CASH_IN_HAND', 'Cash Account', 'ASSET'),
    ('BANK_ACCOUNT', 'Primary Bank Account', 'ASSET')
ON CONFLICT (account_code) DO NOTHING;

COMMIT;
