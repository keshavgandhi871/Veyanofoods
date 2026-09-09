-- ==============================================================================
-- VEYANO Foods — Supabase / PostgreSQL Schema Upgrade: Orders Table
-- Migration: 20260830_orders_upgrade.sql
-- ==============================================================================

-- 1. Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or Upgrade orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  user_id TEXT, -- Clerk or Supabase user identifier
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cod_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('prepaid', 'cod')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  order_status TEXT NOT NULL DEFAULT 'new' CHECK (order_status IN ('new', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  
  -- Legacy / auxiliary column compatibility
  source TEXT DEFAULT 'website',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending',
  is_cod BOOLEAN DEFAULT false,
  gst_amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all requested columns exist even if the table already existed previously
DO $$
BEGIN
  -- Add user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_id') THEN
    ALTER TABLE orders ADD COLUMN user_id TEXT;
  END IF;

  -- Add items (JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='items') THEN
    ALTER TABLE orders ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- Add subtotal
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='subtotal') THEN
    ALTER TABLE orders ADD COLUMN subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add shipping_fee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_fee') THEN
    ALTER TABLE orders ADD COLUMN shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add cod_fee
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cod_fee') THEN
    ALTER TABLE orders ADD COLUMN cod_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add total_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_amount') THEN
    ALTER TABLE orders ADD COLUMN total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add payment_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod';
  END IF;

  -- Add payment_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  -- Add order_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_status') THEN
    ALTER TABLE orders ADD COLUMN order_status TEXT NOT NULL DEFAULT 'new';
  END IF;

  -- Add shipping_address (JSONB)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_address') THEN
    ALTER TABLE orders ADD COLUMN shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- Add razorpay_order_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='razorpay_order_id') THEN
    ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;
  END IF;

  -- Add razorpay_payment_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='razorpay_payment_id') THEN
    ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
END $$;

-- 3. Create helpful indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON orders(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow public / anon to insert orders (for checkout)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Public can insert orders') THEN
    CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Public can select order by id') THEN
    CREATE POLICY "Public can select order by id" ON orders FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON orders FOR ALL USING (true);
  END IF;
END $$;
