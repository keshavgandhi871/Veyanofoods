-- server/migrations/retail_schema.sql
-- VEYANO Enterprise Retail Network & Retail Inventory Schema

-- 1. Retailers Table
CREATE TABLE IF NOT EXISTS retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  gstin TEXT,
  retailer_type TEXT DEFAULT 'Gourmet Store',
  channel_type TEXT DEFAULT 'RETAILER', -- Expandable: 'DISTRIBUTOR', 'WHOLESALER', 'SUPER_STOCKIST'
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  gps_coordinates TEXT,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'ON_HOLD', 'ARCHIVED'
  assigned_salesperson TEXT DEFAULT 'Keshav Gandhi',
  payment_terms TEXT DEFAULT '15_DAYS', -- '7_DAYS', '15_DAYS', '30_DAYS', 'IMMEDIATE', 'ADVANCE'
  credit_limit INTEGER DEFAULT 20000, -- in INR
  current_outstanding INTEGER DEFAULT 0, -- in INR
  reorder_frequency_days INTEGER DEFAULT 14,
  preferred_contact_method TEXT DEFAULT 'WHATSAPP',
  notes TEXT,
  last_order_date TIMESTAMP WITH TIME ZONE,
  expected_next_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT
);

-- 2. Retailer Inventory (Product-level stock per retailer)
CREATE TABLE IF NOT EXISTS retailer_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  current_stock INTEGER DEFAULT 0,
  total_supplied INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  total_returned INTEGER DEFAULT 0,
  total_damaged INTEGER DEFAULT 0,
  total_sample INTEGER DEFAULT 0,
  last_supplied_at TIMESTAMP WITH TIME ZONE,
  last_reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(retailer_id, sku)
);

-- 3. Retailer Inventory Movements (Immutable Movement Ledger)
CREATE TABLE IF NOT EXISTS retailer_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  movement_type TEXT NOT NULL, -- 'SUPPLIED', 'SALE_REPORTED', 'RETURNED', 'DAMAGED', 'EXPIRED', 'SAMPLE', 'STOCK_ADJUSTMENT', 'TRANSFER'
  quantity_delta INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL,
  after_quantity INTEGER NOT NULL,
  unit_price INTEGER DEFAULT 0,
  reference_id TEXT,
  reason TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Retailer Supply Orders (Batch Supply Invoices)
CREATE TABLE IF NOT EXISTS retailer_supply_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  retailer_id UUID REFERENCES retailers(id) ON DELETE RESTRICT,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_units INTEGER NOT NULL,
  subtotal_amount INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'CREDIT_PENDING', -- 'PAID', 'PARTIAL', 'CREDIT_PENDING', 'OVERDUE'
  payment_terms TEXT DEFAULT '15_DAYS',
  due_date TIMESTAMP WITH TIME ZONE,
  amount_paid INTEGER DEFAULT 0,
  amount_outstanding INTEGER NOT NULL,
  items JSONB NOT NULL, -- Snapshot of line items with historical unit prices
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Retailer Financial Ledger (Double-Entry Debit/Credit Log)
CREATE TABLE IF NOT EXISTS retailer_financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'RETURN_ADJUSTMENT', 'OPENING_BALANCE', 'MANUAL_ADJUSTMENT'
  reference_id TEXT,
  debit_amount INTEGER DEFAULT 0,  -- Increases outstanding
  credit_amount INTEGER DEFAULT 0, -- Decreases outstanding
  running_balance INTEGER NOT NULL,
  payment_method TEXT, -- 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'
  payment_ref TEXT,    -- UTR / Cheque / Ref number
  recorded_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Retailer Returns & Quarantine Log
CREATE TABLE IF NOT EXISTS retailer_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  retailer_id UUID REFERENCES retailers(id) ON DELETE RESTRICT,
  return_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_value INTEGER DEFAULT 0,
  total_credit_value INTEGER DEFAULT 0,
  reason TEXT NOT NULL, -- 'DAMAGED', 'EXPIRY', 'UNSOLD', 'WRONG_PRODUCT', 'QUALITY_ISSUE', 'OTHER'
  condition TEXT DEFAULT 'SEALED', -- 'SEALED', 'OPENED', 'DAMAGED_CARTON', 'CRUSHED'
  batch_no TEXT,
  status TEXT DEFAULT 'QUARANTINED', -- 'QUARANTINED', 'INSPECTED_DISPOSED', 'RESTOCKED_AFTER_QC'
  received_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Retailer Follow-ups
CREATE TABLE IF NOT EXISTS retailer_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL, -- 'Call for reorder', 'Payment follow-up', 'Stock check', 'New SKU introduction', 'Other'
  assigned_person TEXT DEFAULT 'Keshav Gandhi',
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'CANCELLED'
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Retailer Internal Notes
CREATE TABLE IF NOT EXISTS retailer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Retailer Documents
CREATE TABLE IF NOT EXISTS retailer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'GST_CERT', 'PO', 'INVOICE', 'PAYMENT_PROOF', 'AGREEMENT', 'OTHER'
  document_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_retailers_status ON retailers(status);
CREATE INDEX IF NOT EXISTS idx_retailers_city ON retailers(city);
CREATE INDEX IF NOT EXISTS idx_retailers_phone ON retailers(phone);
CREATE INDEX IF NOT EXISTS idx_retailer_inv_retailer ON retailer_inventory(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_inv_sku ON retailer_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_retailer_movements_retailer ON retailer_inventory_movements(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_movements_sku ON retailer_inventory_movements(sku);
CREATE INDEX IF NOT EXISTS idx_retailer_supply_retailer ON retailer_supply_orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_supply_due_date ON retailer_supply_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_retailer_fin_retailer ON retailer_financial_ledger(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_returns_retailer ON retailer_returns(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_followups_due ON retailer_followups(due_date);
