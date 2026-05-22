-- Run this SQL in your Supabase SQL editor
-- Creates the bills table for vendor bill generation

CREATE TABLE IF NOT EXISTS bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_name  TEXT,
  customer_phone TEXT,
  items         JSONB NOT NULL DEFAULT '[]',
  -- items format: [{product_id, name, qty, unit_price, total}]
  total         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pdf_url       TEXT,          -- Supabase Storage URL (future)
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast store-level bill history queries
CREATE INDEX IF NOT EXISTS bills_store_id_idx ON bills(store_id);
CREATE INDEX IF NOT EXISTS bills_created_at_idx ON bills(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Vendors can only see/insert bills for their own stores
CREATE POLICY "Vendor can manage their store bills"
  ON bills
  FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE vendor_id = auth.uid()
    )
  );
