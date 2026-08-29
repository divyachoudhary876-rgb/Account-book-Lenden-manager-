BEGIN;

-- 1. Period Locking Table (Audit Safeguard)
CREATE TABLE IF NOT EXISTS accounting_period_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lock_date DATE NOT NULL,
    locked_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, lock_date)
);

-- 2. Delivery Challan / Transport Bilty Master
CREATE TABLE IF NOT EXISTS delivery_challans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    challan_number VARCHAR(50) NOT NULL,
    challan_date DATE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100),
    transporter_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, INVOICED, CANCELLED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bill-by-Bill Invoice Settlement Track
CREATE TABLE IF NOT EXISTS bill_wise_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES payment_receipts(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    settled_amount NUMERIC(12, 2) NOT NULL CHECK (settled_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
