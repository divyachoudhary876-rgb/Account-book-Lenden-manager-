BEGIN;

-- 1. Inventory Stock Movement Batch Table (FIFO Valuation Engine)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    purchase_bill_item_id UUID REFERENCES purchase_bill_items(id),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    quantity_received NUMERIC(12, 3) NOT NULL CHECK (quantity_received > 0),
    quantity_remaining NUMERIC(12, 3) NOT NULL CHECK (quantity_remaining >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Materialized View for High-Performance Trial Balance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_account_balances AS
SELECT 
    a.organization_id,
    a.id AS account_id,
    a.account_code,
    a.account_name,
    a.account_type,
    COALESCE(SUM(ji.debit_amount), 0.00) AS total_debit,
    COALESCE(SUM(ji.credit_amount), 0.00) AS total_credit,
    (COALESCE(SUM(ji.debit_amount), 0.00) - COALESCE(SUM(ji.credit_amount), 0.00)) AS net_balance
FROM accounts a
LEFT JOIN journal_items ji ON a.id = ji.account_id
LEFT JOIN journal_entries je ON ji.journal_id = je.id
GROUP BY a.organization_id, a.id, a.account_code, a.account_name, a.account_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_account_balances ON mv_account_balances (account_id);

-- 3. Fiscal Year Sequential Invoice Sequence
CREATE TABLE IF NOT EXISTS invoice_sequences (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    financial_year VARCHAR(10) NOT NULL,
    last_sequence INT DEFAULT 0,
    PRIMARY KEY (organization_id, financial_year)
);

COMMIT;
