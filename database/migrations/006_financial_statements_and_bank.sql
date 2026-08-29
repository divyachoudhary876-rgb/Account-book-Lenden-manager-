BEGIN;

-- Bank Statements Import Table for Reconciliation
CREATE TABLE IF NOT EXISTS bank_statement_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES accounts(id),
    transaction_date DATE NOT NULL,
    description TEXT,
    cheque_reference VARCHAR(100),
    withdrawal_amount NUMERIC(12, 2) DEFAULT 0.00,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    is_reconciled BOOLEAN DEFAULT FALSE,
    matched_journal_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for Fast Reconciliation Lookups
CREATE INDEX IF NOT EXISTS idx_bank_reconciliation 
ON bank_statement_transactions (organization_id, bank_account_id, is_reconciled);

COMMIT;
