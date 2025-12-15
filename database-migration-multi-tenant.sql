-- Multi-Tenancy Migration Script
-- This script migrates existing data to a default coffee shop
-- Run this AFTER database-schema-multi-tenant.sql has been executed
-- 
-- IMPORTANT: This script assigns all existing data to a default coffee shop
-- After running this, you should update your config files with the shop_id

-- Step 1: Create default coffee shop (Side Porch Coffee Co.)
INSERT INTO coffee_shop (id, code, name, domain, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '0001',
    'Side Porch Coffee Co.',
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Store the default shop ID for use in updates
DO $$
DECLARE
    default_shop_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- Step 2: Update all existing records with default shop_id
    -- Note: We're using a fixed UUID so it's consistent across runs
    
    -- Update coffee_club_accounts
    UPDATE coffee_club_accounts
    SET shop_id = default_shop_id
    WHERE shop_id IS NULL;
    
    -- Update account_transactions (get shop_id from account)
    UPDATE account_transactions
    SET shop_id = (
        SELECT shop_id FROM coffee_club_accounts
        WHERE coffee_club_accounts.id = account_transactions.account_id
        LIMIT 1
    )
    WHERE shop_id IS NULL;
    
    -- Update orders (get shop_id from account)
    UPDATE orders
    SET shop_id = (
        SELECT shop_id FROM coffee_club_accounts
        WHERE coffee_club_accounts.id = orders.account_id
        LIMIT 1
    )
    WHERE shop_id IS NULL;
    
    -- Update order_items (get shop_id from order)
    UPDATE order_items
    SET shop_id = (
        SELECT shop_id FROM orders
        WHERE orders.id = order_items.order_id
        LIMIT 1
    )
    WHERE shop_id IS NULL;
    
    -- Update products
    UPDATE products
    SET shop_id = default_shop_id
    WHERE shop_id IS NULL;
    
    -- Update menu_categories
    UPDATE menu_categories
    SET shop_id = default_shop_id
    WHERE shop_id IS NULL;
    
    -- Update ingredients
    UPDATE ingredients
    SET shop_id = default_shop_id
    WHERE shop_id IS NULL;
    
    -- Update drink_ingredients (get shop_id from product)
    UPDATE drink_ingredients
    SET shop_id = (
        SELECT shop_id FROM products
        WHERE products.id = drink_ingredients.product_id
        LIMIT 1
    )
    WHERE shop_id IS NULL;
    
    -- site_config can remain NULL (global config) or be set per shop
    -- We'll leave it NULL for now, but you can update specific configs if needed
    
    RAISE NOTICE 'Migration completed. Default shop_id: %', default_shop_id;
END $$;

-- Step 3: Verify data integrity
-- Check that all records have shop_id (except site_config which can be global)
DO $$
DECLARE
    accounts_without_shop INTEGER;
    transactions_without_shop INTEGER;
    orders_without_shop INTEGER;
    order_items_without_shop INTEGER;
    products_without_shop INTEGER;
    categories_without_shop INTEGER;
    ingredients_without_shop INTEGER;
    drink_ingredients_without_shop INTEGER;
BEGIN
    SELECT COUNT(*) INTO accounts_without_shop FROM coffee_club_accounts WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO transactions_without_shop FROM account_transactions WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO orders_without_shop FROM orders WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO order_items_without_shop FROM order_items WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO products_without_shop FROM products WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO categories_without_shop FROM menu_categories WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO ingredients_without_shop FROM ingredients WHERE shop_id IS NULL;
    SELECT COUNT(*) INTO drink_ingredients_without_shop FROM drink_ingredients WHERE shop_id IS NULL;
    
    IF accounts_without_shop > 0 THEN
        RAISE WARNING 'Found % accounts without shop_id', accounts_without_shop;
    END IF;
    
    IF transactions_without_shop > 0 THEN
        RAISE WARNING 'Found % transactions without shop_id', transactions_without_shop;
    END IF;
    
    IF orders_without_shop > 0 THEN
        RAISE WARNING 'Found % orders without shop_id', orders_without_shop;
    END IF;
    
    IF order_items_without_shop > 0 THEN
        RAISE WARNING 'Found % order_items without shop_id', order_items_without_shop;
    END IF;
    
    IF products_without_shop > 0 THEN
        RAISE WARNING 'Found % products without shop_id', products_without_shop;
    END IF;
    
    IF categories_without_shop > 0 THEN
        RAISE WARNING 'Found % menu_categories without shop_id', categories_without_shop;
    END IF;
    
    IF ingredients_without_shop > 0 THEN
        RAISE WARNING 'Found % ingredients without shop_id', ingredients_without_shop;
    END IF;
    
    IF drink_ingredients_without_shop > 0 THEN
        RAISE WARNING 'Found % drink_ingredients without shop_id', drink_ingredients_without_shop;
    END IF;
    
    RAISE NOTICE 'Data integrity check completed';
END $$;

-- Step 4: After migration is verified, you can optionally make shop_id NOT NULL
-- Uncomment these lines AFTER verifying all data has been migrated successfully
-- 
-- ALTER TABLE coffee_club_accounts ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE account_transactions ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE orders ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE order_items ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE products ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE menu_categories ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE ingredients ALTER COLUMN shop_id SET NOT NULL;
-- ALTER TABLE drink_ingredients ALTER COLUMN shop_id SET NOT NULL;

