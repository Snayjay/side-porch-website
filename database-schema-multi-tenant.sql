-- Multi-Tenancy Database Schema
-- This file adds multi-tenancy support to the existing database
-- Run this AFTER all other schema files have been executed
-- Then run database-migration-multi-tenant.sql to migrate existing data

-- Step 1: Create coffee_shop table (developer-only access)
CREATE TABLE IF NOT EXISTS coffee_shop (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add code column if it doesn't exist (for existing installations)
ALTER TABLE coffee_shop ADD COLUMN IF NOT EXISTS code TEXT;

-- Create unique index on code for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_coffee_shop_code ON coffee_shop(code);

-- Populate code for existing records if they don't have one
DO $$
DECLARE
    shop_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR shop_record IN 
        SELECT id FROM coffee_shop 
        WHERE code IS NULL OR code = ''
        ORDER BY created_at ASC
    LOOP
        UPDATE coffee_shop
        SET code = LPAD(counter::TEXT, 4, '0')
        WHERE id = shop_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make code NOT NULL after populating existing records
-- Only if there are no NULL codes remaining
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM coffee_shop WHERE code IS NULL) THEN
        ALTER TABLE coffee_shop ALTER COLUMN code SET NOT NULL;
    END IF;
END $$;

-- Function to generate next shop code
CREATE OR REPLACE FUNCTION generate_next_shop_code()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    code TEXT;
BEGIN
    -- Get the highest numeric code and add 1
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
    INTO next_num
    FROM coffee_shop;
    
    -- Format as 4-digit string with leading zeros
    code := LPAD(next_num::TEXT, 4, '0');
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add shop_id column to all existing tables
-- Note: These columns will be nullable initially for migration purposes
-- After migration, they should be set to NOT NULL

ALTER TABLE coffee_club_accounts ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
ALTER TABLE drink_ingredients ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE RESTRICT;
-- site_config can be per-shop or global, so we'll make it nullable
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES coffee_shop(id) ON DELETE CASCADE;

-- Step 3: Create indexes on shop_id columns for performance
CREATE INDEX IF NOT EXISTS idx_coffee_club_accounts_shop_id ON coffee_club_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_shop_id ON account_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop_id ON order_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_shop_id ON menu_categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_shop_id ON ingredients(shop_id);
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_shop_id ON drink_ingredients(shop_id);
CREATE INDEX IF NOT EXISTS idx_site_config_shop_id ON site_config(shop_id);

-- Step 4: Create helper function to check if user is developer (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is the developer by email
    -- Use SECURITY DEFINER to bypass RLS when checking
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'jeffrey.loehr@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 5: Enable RLS on coffee_shop table
ALTER TABLE coffee_shop ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for coffee_shop table (developer-only access)
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Developers can view all coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can insert coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can update coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can delete coffee shops" ON coffee_shop;

-- Only developers can view all coffee shops
CREATE POLICY "Developers can view all coffee shops"
    ON coffee_shop FOR SELECT
    USING (is_developer());

-- Only developers can insert coffee shops
CREATE POLICY "Developers can insert coffee shops"
    ON coffee_shop FOR INSERT
    WITH CHECK (is_developer());

-- Only developers can update coffee shops
CREATE POLICY "Developers can update coffee shops"
    ON coffee_shop FOR UPDATE
    USING (is_developer());

-- Only developers can delete coffee shops
CREATE POLICY "Developers can delete coffee shops"
    ON coffee_shop FOR DELETE
    USING (is_developer());

-- Step 6: Update RLS policies to filter by shop_id
-- Note: These policies will be updated in the migration script after data is migrated
-- For now, we'll create new policies that check shop_id

-- Drop existing policies that need shop_id filtering
DROP POLICY IF EXISTS "Users can view their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Users can view their own transactions" ON account_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view items from their orders" ON order_items;
DROP POLICY IF EXISTS "Users can create items for their orders" ON order_items;
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
DROP POLICY IF EXISTS "Anyone can view available categories" ON menu_categories;

-- New policies for coffee_club_accounts with shop_id filtering
CREATE POLICY "Users can view their own account"
    ON coffee_club_accounts FOR SELECT
    USING (
        auth.uid() = id 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view accounts in their shop" ON coffee_club_accounts;
CREATE POLICY "Staff can view accounts in their shop"
    ON coffee_club_accounts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts AS staff_account
            WHERE staff_account.id = auth.uid()
            AND staff_account.role = 'staff'
            AND staff_account.shop_id = coffee_club_accounts.shop_id
        )
    );

DROP POLICY IF EXISTS "Developers can view all accounts" ON coffee_club_accounts;
CREATE POLICY "Developers can view all accounts"
    ON coffee_club_accounts FOR SELECT
    USING (is_developer());

CREATE POLICY "Users can update their own account"
    ON coffee_club_accounts FOR UPDATE
    USING (
        auth.uid() = id 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can update accounts in their shop" ON coffee_club_accounts;
CREATE POLICY "Staff can update accounts in their shop"
    ON coffee_club_accounts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts AS staff_account
            WHERE staff_account.id = auth.uid()
            AND staff_account.role = 'staff'
            AND staff_account.shop_id = coffee_club_accounts.shop_id
        )
    );

DROP POLICY IF EXISTS "Developers can update all accounts" ON coffee_club_accounts;
CREATE POLICY "Developers can update all accounts"
    ON coffee_club_accounts FOR UPDATE
    USING (is_developer());

-- New policies for account_transactions with shop_id filtering
CREATE POLICY "Users can view their own transactions"
    ON account_transactions FOR SELECT
    USING (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view transactions in their shop" ON account_transactions;
CREATE POLICY "Staff can view transactions in their shop"
    ON account_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = account_transactions.shop_id
        )
    );

DROP POLICY IF EXISTS "Developers can view all transactions" ON account_transactions;
CREATE POLICY "Developers can view all transactions"
    ON account_transactions FOR SELECT
    USING (is_developer());

CREATE POLICY "System can insert transactions"
    ON account_transactions FOR INSERT
    WITH CHECK (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

-- New policies for orders with shop_id filtering
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view orders in their shop" ON orders;
CREATE POLICY "Staff can view orders in their shop"
    ON orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = orders.shop_id
        )
    );

DROP POLICY IF EXISTS "Developers can view all orders" ON orders;
CREATE POLICY "Developers can view all orders"
    ON orders FOR SELECT
    USING (is_developer());

CREATE POLICY "Users can create their own orders"
    ON orders FOR INSERT
    WITH CHECK (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

CREATE POLICY "Users can update their own orders"
    ON orders FOR UPDATE
    USING (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can update orders in their shop" ON orders;
CREATE POLICY "Staff can update orders in their shop"
    ON orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = orders.shop_id
        )
    );

-- New policies for order_items with shop_id filtering
CREATE POLICY "Users can view items from their orders"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.account_id = auth.uid()
            AND order_items.shop_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Staff can view order items in their shop" ON order_items;
CREATE POLICY "Staff can view order items in their shop"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = order_items.shop_id
        )
    );

CREATE POLICY "Users can create items for their orders"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.account_id = auth.uid()
            AND order_items.shop_id IS NOT NULL
        )
    );

-- New policies for products with shop_id filtering
CREATE POLICY "Anyone can view available products"
    ON products FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view all products in their shop" ON products;
CREATE POLICY "Staff can view all products in their shop"
    ON products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = products.shop_id
        )
    );

DROP POLICY IF EXISTS "Developers can view all products" ON products;
CREATE POLICY "Developers can view all products"
    ON products FOR SELECT
    USING (is_developer());

DROP POLICY IF EXISTS "Staff can insert products in their shop" ON products;
CREATE POLICY "Staff can insert products in their shop"
    ON products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = products.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can update products in their shop" ON products;
CREATE POLICY "Staff can update products in their shop"
    ON products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = products.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can delete products in their shop" ON products;
CREATE POLICY "Staff can delete products in their shop"
    ON products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = products.shop_id
        )
    );

-- New policies for menu_categories with shop_id filtering
CREATE POLICY "Anyone can view available categories"
    ON menu_categories FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view all categories in their shop" ON menu_categories;
CREATE POLICY "Staff can view all categories in their shop"
    ON menu_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = menu_categories.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can insert categories in their shop" ON menu_categories;
CREATE POLICY "Staff can insert categories in their shop"
    ON menu_categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = menu_categories.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can update categories in their shop" ON menu_categories;
CREATE POLICY "Staff can update categories in their shop"
    ON menu_categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = menu_categories.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can delete categories in their shop" ON menu_categories;
CREATE POLICY "Staff can delete categories in their shop"
    ON menu_categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = menu_categories.shop_id
        )
    );

-- New policies for ingredients with shop_id filtering
DROP POLICY IF EXISTS "Anyone can view available ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can view all ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can insert ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can update ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can delete ingredients" ON ingredients;

CREATE POLICY "Anyone can view available ingredients"
    ON ingredients FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

DROP POLICY IF EXISTS "Staff can view all ingredients in their shop" ON ingredients;
CREATE POLICY "Staff can view all ingredients in their shop"
    ON ingredients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = ingredients.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can insert ingredients in their shop" ON ingredients;
CREATE POLICY "Staff can insert ingredients in their shop"
    ON ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = ingredients.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can update ingredients in their shop" ON ingredients;
CREATE POLICY "Staff can update ingredients in their shop"
    ON ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = ingredients.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can delete ingredients in their shop" ON ingredients;
CREATE POLICY "Staff can delete ingredients in their shop"
    ON ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = ingredients.shop_id
        )
    );

-- New policies for drink_ingredients with shop_id filtering
DROP POLICY IF EXISTS "Anyone can view drink ingredients" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can insert drink ingredients" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can update drink ingredients" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can delete drink ingredients" ON drink_ingredients;

CREATE POLICY "Anyone can view drink ingredients"
    ON drink_ingredients FOR SELECT
    USING (shop_id IS NOT NULL);

DROP POLICY IF EXISTS "Staff can insert drink ingredients in their shop" ON drink_ingredients;
CREATE POLICY "Staff can insert drink ingredients in their shop"
    ON drink_ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = drink_ingredients.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can update drink ingredients in their shop" ON drink_ingredients;
CREATE POLICY "Staff can update drink ingredients in their shop"
    ON drink_ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = drink_ingredients.shop_id
        )
    );

DROP POLICY IF EXISTS "Staff can delete drink ingredients in their shop" ON drink_ingredients;
CREATE POLICY "Staff can delete drink ingredients in their shop"
    ON drink_ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = drink_ingredients.shop_id
        )
    );

-- Function to update updated_at timestamp for coffee_shop
CREATE OR REPLACE FUNCTION update_coffee_shop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_coffee_shop_updated_at ON coffee_shop;
CREATE TRIGGER trigger_update_coffee_shop_updated_at
BEFORE UPDATE ON coffee_shop
FOR EACH ROW
EXECUTE FUNCTION update_coffee_shop_updated_at();

