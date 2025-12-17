-- Product Sizes Schema
-- Adds size options support for drinks

-- Step 1: Create product_sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_name TEXT NOT NULL,
    size_oz DECIMAL(5, 2) NOT NULL CHECK (size_oz > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    display_order INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    shop_id TEXT REFERENCES coffee_shop(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, size_name)
);

-- Step 2: Add indexes for product_sizes
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_shop_id ON product_sizes(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_display_order ON product_sizes(product_id, display_order);

-- Step 3: Add columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fixed_size_oz DECIMAL(5, 2) CHECK (fixed_size_oz > 0 OR fixed_size_oz IS NULL);

-- Step 4: Add column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_size TEXT;

-- Step 5: Add comment to document the columns
COMMENT ON COLUMN products.has_sizes IS 'If true, product has multiple size options in product_sizes table. If false, use fixed_size_oz.';
COMMENT ON COLUMN products.fixed_size_oz IS 'Fixed size in ounces for products without size options (e.g., Cortado = 4.0). Only used when has_sizes = false.';
COMMENT ON COLUMN order_items.selected_size IS 'Selected size name from product_sizes table (e.g., "Small", "Medium", "Large"). NULL for fixed-size drinks.';

-- Step 6: Enable RLS on product_sizes
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for product_sizes
-- Anyone can view available sizes
CREATE POLICY "Anyone can view available product sizes"
    ON product_sizes FOR SELECT
    USING (available = true);

-- Staff can view all sizes (including unavailable)
CREATE POLICY "Staff can view all product sizes"
    ON product_sizes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = product_sizes.shop_id
        )
    );

-- Staff can insert sizes in their shop
CREATE POLICY "Staff can insert product sizes in their shop"
    ON product_sizes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = product_sizes.shop_id
        )
    );

-- Staff can update sizes in their shop
CREATE POLICY "Staff can update product sizes in their shop"
    ON product_sizes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = product_sizes.shop_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = product_sizes.shop_id
        )
    );

-- Staff can delete sizes in their shop
CREATE POLICY "Staff can delete product sizes in their shop"
    ON product_sizes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = product_sizes.shop_id
        )
    );

-- Step 8: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_size_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_size_updated_at
    BEFORE UPDATE ON product_sizes
    FOR EACH ROW
    EXECUTE FUNCTION update_product_size_updated_at();

