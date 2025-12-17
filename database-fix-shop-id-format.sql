-- Fix Shop ID Format Migration
-- This script converts shop_id from UUID format to 4-digit text format (e.g., '0001')
-- Run this in Supabase SQL Editor
-- 
-- IMPORTANT: This is a breaking change. Backup your database first!

-- Step 1: Drop all RLS policies that reference shop_id (we'll recreate them)
-- coffee_shop policies
DROP POLICY IF EXISTS "Developers can view all coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can insert coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can update coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can delete coffee shops" ON coffee_shop;

-- coffee_club_accounts policies
DROP POLICY IF EXISTS "Users can view their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Staff can view accounts in their shop" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can view all accounts" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Staff can update accounts in their shop" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can update all accounts" ON coffee_club_accounts;

-- account_transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Staff can view transactions in their shop" ON account_transactions;
DROP POLICY IF EXISTS "Developers can view all transactions" ON account_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON account_transactions;

-- orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Staff can view orders in their shop" ON orders;
DROP POLICY IF EXISTS "Developers can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders in their shop" ON orders;

-- order_items policies
DROP POLICY IF EXISTS "Users can view items from their orders" ON order_items;
DROP POLICY IF EXISTS "Staff can view order items in their shop" ON order_items;
DROP POLICY IF EXISTS "Users can create items for their orders" ON order_items;

-- products policies
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
DROP POLICY IF EXISTS "Staff can view all products in their shop" ON products;
DROP POLICY IF EXISTS "Developers can view all products" ON products;
DROP POLICY IF EXISTS "Staff can insert products in their shop" ON products;
DROP POLICY IF EXISTS "Staff can update products in their shop" ON products;
DROP POLICY IF EXISTS "Staff can delete products in their shop" ON products;

-- menu_categories policies
DROP POLICY IF EXISTS "Anyone can view available categories" ON menu_categories;
DROP POLICY IF EXISTS "Staff can view all categories in their shop" ON menu_categories;
DROP POLICY IF EXISTS "Staff can insert categories in their shop" ON menu_categories;
DROP POLICY IF EXISTS "Staff can update categories in their shop" ON menu_categories;
DROP POLICY IF EXISTS "Staff can delete categories in their shop" ON menu_categories;

-- ingredients policies
DROP POLICY IF EXISTS "Anyone can view available ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can view all ingredients in their shop" ON ingredients;
DROP POLICY IF EXISTS "Staff can insert ingredients in their shop" ON ingredients;
DROP POLICY IF EXISTS "Staff can update ingredients in their shop" ON ingredients;
DROP POLICY IF EXISTS "Staff can delete ingredients in their shop" ON ingredients;

-- drink_ingredients policies
DROP POLICY IF EXISTS "Anyone can view drink ingredients" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can insert drink ingredients in their shop" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can update drink ingredients in their shop" ON drink_ingredients;
DROP POLICY IF EXISTS "Staff can delete drink ingredients in their shop" ON drink_ingredients;

-- site_config policies (if any)
DROP POLICY IF EXISTS "Anyone can view site config" ON site_config;

-- Step 2: Drop foreign key constraints
ALTER TABLE coffee_club_accounts DROP CONSTRAINT IF EXISTS coffee_club_accounts_shop_id_fkey;
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_shop_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shop_id_fkey;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_shop_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_shop_id_fkey;
ALTER TABLE menu_categories DROP CONSTRAINT IF EXISTS menu_categories_shop_id_fkey;
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_shop_id_fkey;
ALTER TABLE drink_ingredients DROP CONSTRAINT IF EXISTS drink_ingredients_shop_id_fkey;
ALTER TABLE site_config DROP CONSTRAINT IF EXISTS site_config_shop_id_fkey;

-- Step 3: Drop indexes on shop_id columns
DROP INDEX IF EXISTS idx_coffee_club_accounts_shop_id;
DROP INDEX IF EXISTS idx_account_transactions_shop_id;
DROP INDEX IF EXISTS idx_orders_shop_id;
DROP INDEX IF EXISTS idx_order_items_shop_id;
DROP INDEX IF EXISTS idx_products_shop_id;
DROP INDEX IF EXISTS idx_menu_categories_shop_id;
DROP INDEX IF EXISTS idx_ingredients_shop_id;
DROP INDEX IF EXISTS idx_drink_ingredients_shop_id;
DROP INDEX IF EXISTS idx_site_config_shop_id;
DROP INDEX IF EXISTS idx_coffee_shop_code;

-- Step 4: Create a temporary column to hold the new ID in coffee_shop
ALTER TABLE coffee_shop ADD COLUMN IF NOT EXISTS new_id TEXT;

-- Step 5: Populate new_id from code (or generate if code doesn't exist)
-- Use a DO block to handle row numbering since window functions can't be used directly in UPDATE
DO $$
DECLARE
    shop_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR shop_record IN 
        SELECT id, code FROM coffee_shop ORDER BY created_at ASC
    LOOP
        UPDATE coffee_shop
        SET new_id = COALESCE(shop_record.code, LPAD(counter::TEXT, 4, '0'))
        WHERE id = shop_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 6: Update all shop_id columns to use the new text ID
-- First, add new text columns
ALTER TABLE coffee_club_accounts ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE account_transactions ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE drink_ingredients ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS new_shop_id TEXT;

-- Step 7: Copy data from old shop_id (UUID) to new_shop_id (TEXT) using mapping
UPDATE coffee_club_accounts SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = coffee_club_accounts.shop_id);
UPDATE account_transactions SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = account_transactions.shop_id);
UPDATE orders SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = orders.shop_id);
UPDATE order_items SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = order_items.shop_id);
UPDATE products SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = products.shop_id);
UPDATE menu_categories SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = menu_categories.shop_id);
UPDATE ingredients SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = ingredients.shop_id);
UPDATE drink_ingredients SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = drink_ingredients.shop_id);
UPDATE site_config SET new_shop_id = (SELECT new_id FROM coffee_shop WHERE coffee_shop.id = site_config.shop_id);

-- Step 8: Drop old shop_id columns and rename new ones
ALTER TABLE coffee_club_accounts DROP COLUMN IF EXISTS shop_id;
ALTER TABLE coffee_club_accounts RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE account_transactions DROP COLUMN IF EXISTS shop_id;
ALTER TABLE account_transactions RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE orders DROP COLUMN IF EXISTS shop_id;
ALTER TABLE orders RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE order_items DROP COLUMN IF EXISTS shop_id;
ALTER TABLE order_items RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE products DROP COLUMN IF EXISTS shop_id;
ALTER TABLE products RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE menu_categories DROP COLUMN IF EXISTS shop_id;
ALTER TABLE menu_categories RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE ingredients DROP COLUMN IF EXISTS shop_id;
ALTER TABLE ingredients RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE drink_ingredients DROP COLUMN IF EXISTS shop_id;
ALTER TABLE drink_ingredients RENAME COLUMN new_shop_id TO shop_id;

ALTER TABLE site_config DROP COLUMN IF EXISTS shop_id;
ALTER TABLE site_config RENAME COLUMN new_shop_id TO shop_id;

-- Step 9: Now fix the coffee_shop table - create new table with correct structure
CREATE TABLE IF NOT EXISTS coffee_shop_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy data from old table to new
INSERT INTO coffee_shop_new (id, name, domain, created_at, updated_at)
SELECT new_id, name, domain, created_at, updated_at
FROM coffee_shop
ON CONFLICT (id) DO NOTHING;

-- Drop old table and rename new one
DROP TABLE coffee_shop CASCADE;
ALTER TABLE coffee_shop_new RENAME TO coffee_shop;

-- Step 10: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_coffee_club_accounts_shop_id ON coffee_club_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_shop_id ON account_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_items_shop_id ON order_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_shop_id ON menu_categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_shop_id ON ingredients(shop_id);
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_shop_id ON drink_ingredients(shop_id);
CREATE INDEX IF NOT EXISTS idx_site_config_shop_id ON site_config(shop_id);

-- Step 11: Recreate foreign key constraints
ALTER TABLE coffee_club_accounts 
    ADD CONSTRAINT coffee_club_accounts_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE account_transactions 
    ADD CONSTRAINT account_transactions_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE orders 
    ADD CONSTRAINT orders_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE order_items 
    ADD CONSTRAINT order_items_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE products 
    ADD CONSTRAINT products_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE menu_categories 
    ADD CONSTRAINT menu_categories_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE ingredients 
    ADD CONSTRAINT ingredients_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE drink_ingredients 
    ADD CONSTRAINT drink_ingredients_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

ALTER TABLE site_config 
    ADD CONSTRAINT site_config_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE CASCADE;

-- Step 12: Enable RLS on coffee_shop
ALTER TABLE coffee_shop ENABLE ROW LEVEL SECURITY;

-- Step 13: Recreate is_developer function
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email = 'jeffrey.loehr@gmail.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 14: Function to generate next shop code
CREATE OR REPLACE FUNCTION generate_next_shop_code()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    code TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(id, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
    INTO next_num
    FROM coffee_shop;
    
    code := LPAD(next_num::TEXT, 4, '0');
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Function to update updated_at timestamp
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

-- Step 16: Recreate RLS policies for coffee_shop
CREATE POLICY "Developers can view all coffee shops"
    ON coffee_shop FOR SELECT
    USING (is_developer());

CREATE POLICY "Developers can insert coffee shops"
    ON coffee_shop FOR INSERT
    WITH CHECK (is_developer());

CREATE POLICY "Developers can update coffee shops"
    ON coffee_shop FOR UPDATE
    USING (is_developer());

CREATE POLICY "Developers can delete coffee shops"
    ON coffee_shop FOR DELETE
    USING (is_developer());

-- Step 17: Recreate RLS policies for coffee_club_accounts
CREATE POLICY "Users can view their own account"
    ON coffee_club_accounts FOR SELECT
    USING (
        auth.uid() = id 
        AND shop_id IS NOT NULL
    );

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

CREATE POLICY "Developers can view all accounts"
    ON coffee_club_accounts FOR SELECT
    USING (is_developer());

CREATE POLICY "Users can update their own account"
    ON coffee_club_accounts FOR UPDATE
    USING (
        auth.uid() = id 
        AND shop_id IS NOT NULL
    );

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

CREATE POLICY "Developers can update all accounts"
    ON coffee_club_accounts FOR UPDATE
    USING (is_developer());

-- Step 18: Recreate RLS policies for account_transactions
CREATE POLICY "Users can view their own transactions"
    ON account_transactions FOR SELECT
    USING (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

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

CREATE POLICY "Developers can view all transactions"
    ON account_transactions FOR SELECT
    USING (is_developer());

CREATE POLICY "System can insert transactions"
    ON account_transactions FOR INSERT
    WITH CHECK (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

-- Step 19: Recreate RLS policies for orders
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (
        auth.uid() = account_id 
        AND shop_id IS NOT NULL
    );

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

-- Step 20: Recreate RLS policies for order_items
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

-- Step 21: Recreate RLS policies for products
CREATE POLICY "Anyone can view available products"
    ON products FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

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

CREATE POLICY "Developers can view all products"
    ON products FOR SELECT
    USING (is_developer());

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

-- Step 22: Recreate RLS policies for menu_categories
CREATE POLICY "Anyone can view available categories"
    ON menu_categories FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

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

-- Step 23: Recreate RLS policies for ingredients
CREATE POLICY "Anyone can view available ingredients"
    ON ingredients FOR SELECT
    USING (
        available = true 
        AND shop_id IS NOT NULL
    );

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

-- Step 24: Recreate RLS policies for drink_ingredients
CREATE POLICY "Anyone can view drink ingredients"
    ON drink_ingredients FOR SELECT
    USING (shop_id IS NOT NULL);

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

-- Step 25: Verify migration
DO $$
DECLARE
    shop_count INTEGER;
    products_count INTEGER;
    categories_count INTEGER;
    ingredients_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO shop_count FROM coffee_shop;
    SELECT COUNT(*) INTO products_count FROM products WHERE shop_id = '0001';
    SELECT COUNT(*) INTO categories_count FROM menu_categories WHERE shop_id = '0001';
    SELECT COUNT(*) INTO ingredients_count FROM ingredients WHERE shop_id = '0001';
    
    RAISE NOTICE 'Migration completed!';
    RAISE NOTICE 'Coffee shops: %', shop_count;
    RAISE NOTICE 'Products with shop_id 0001: %', products_count;
    RAISE NOTICE 'Categories with shop_id 0001: %', categories_count;
    RAISE NOTICE 'Ingredients with shop_id 0001: %', ingredients_count;
    
    -- Show the shop(s)
    FOR shop_count IN (SELECT id FROM coffee_shop) LOOP
        RAISE NOTICE 'Shop ID found: %', shop_count;
    END LOOP;
END $$;

-- Display the shop for verification
SELECT * FROM coffee_shop;

