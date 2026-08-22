-- VEYANO Foods Enterprise Database Upgrade Migration
-- Version: 20260822_enterprise_upgrade.sql

-- 1. Admin Users & RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'VIEWER', -- OWNER, ADMIN, OPERATIONS, INVENTORY_MANAGER, MARKETING, CUSTOMER_SUPPORT, FINANCE, VIEWER
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Immutable Audit Logs (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  actor_user_id TEXT,
  actor_name TEXT,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 3. Approvals Workflow
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL, -- PRICE_CHANGE, MRP_CHANGE, PRODUCT_DELETION, ROLE_PROMOTION, REFUND_HIGH_VALUE, CONFIG_CHANGE
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  requested_by TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  reviewed_by TEXT,
  reviewer_role TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- 4. Inventory Ledger (Transaction History)
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  product_name TEXT,
  warehouse_id TEXT DEFAULT 'karnal-central',
  quantity_delta INTEGER NOT NULL,
  before_quantity INTEGER NOT NULL,
  after_quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL, -- PURCHASE_RECEIVED, PRODUCTION, SALE, RETURN, DAMAGE, SAMPLE, ADJUSTMENT, TRANSFER, EXPIRY, RESERVATION
  reference_id TEXT, -- Order #, PO #, Batch #
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_sku ON inventory_ledger(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_created_at ON inventory_ledger(created_at DESC);

-- 5. Price History
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  old_price INTEGER,
  new_price INTEGER,
  old_mrp INTEGER,
  new_mrp INTEGER,
  changed_by TEXT,
  approved_by TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_sku ON price_history(sku);

-- 6. Order Timeline
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);

-- 7. Enhanced Product Attributes on `products` table
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'makhana';
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_name TEXT DEFAULT 'Roasted Makhana';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '200g';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 399;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp INTEGER DEFAULT 399;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS oil_information TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preservative_information TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fssai_information TEXT DEFAULT 'FSSAI Lic. No. 20826010000397';
ALTER TABLE products ADD COLUMN IF NOT EXISTS shelf_life TEXT DEFAULT '6 Months';
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_instructions TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS taste_profile TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS why_you_will_like_it JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hover_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER DEFAULT 25;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'in_stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 8. Future Manufacturing & Quality Control Architecture
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst TEXT,
  materials_supplied JSONB,
  pricing_tier TEXT,
  rating NUMERIC(3, 2),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- kg, g, pcs, bags
  current_stock NUMERIC(10, 2) DEFAULT 0,
  reorder_level NUMERIC(10, 2) DEFAULT 0,
  cost_per_unit NUMERIC(10, 2),
  storage_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL, -- e.g. VM-2026-0822-001
  sku TEXT NOT NULL,
  production_date DATE NOT NULL,
  best_before DATE NOT NULL,
  quantity_produced INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  raw_materials_used JSONB,
  production_status TEXT DEFAULT 'completed',
  qc_status TEXT DEFAULT 'passed', -- pending, passed, rejected
  operator TEXT,
  production_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  test_type TEXT NOT NULL, -- Moisture, Crispness, Peroxide Value, Sensory
  parameter TEXT NOT NULL,
  result TEXT NOT NULL,
  acceptable_range TEXT NOT NULL,
  pass_fail TEXT NOT NULL DEFAULT 'PASS',
  tester TEXT NOT NULL,
  test_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  document_url TEXT
);
