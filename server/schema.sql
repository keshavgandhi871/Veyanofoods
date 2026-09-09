-- Schema for Veyano Foods Supabase Migration

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  clerk_id TEXT UNIQUE, -- Links to Clerk user id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Products Table (Replacing FinishedGoods)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  price_paise INTEGER NOT NULL, -- ₹399 = 39900
  stock_quantity INTEGER DEFAULT 0,
  details TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  user_id TEXT, -- Links to Clerk or customer user id
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
  
  -- Compatibility / tracking fields
  source TEXT DEFAULT 'website',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending',
  is_cod BOOLEAN DEFAULT false,
  subtotal_amount NUMERIC(10, 2),
  gst_amount NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Cart Items Table (For session persistence)
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Links to Clerk user id
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, sku)
);

-- Indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- 6. Blogs Table
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  image_url TEXT,
  author TEXT DEFAULT 'Veyano Team',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
