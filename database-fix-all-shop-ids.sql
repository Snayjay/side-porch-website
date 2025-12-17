-- Complete Shop ID Fix
-- Run this in Supabase SQL Editor to fix all shop_id issues
-- This combines: unit_types fix, account fixes, and verification

-- ============================================
-- PART 1: Fix unit_types table
-- ============================================

-- Drop existing RLS policies on unit_types
DROP POLICY IF EXISTS "Anyone can view unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can insert unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can update unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can delete unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can insert unit types in their shop" ON unit_types;
DROP POLICY IF EXISTS "Staff can update unit types in their shop" ON unit_types;
DROP POLICY IF EXISTS "Staff can delete unit types in their shop" ON unit_types;
DROP POLICY IF EXISTS "Developers can view all unit types" ON unit_types;
DROP POLICY IF EXISTS "Developers can insert unit types" ON unit_types;
DROP POLICY IF EXISTS "Developers can update unit types" ON unit_types;
DROP POLICY IF EXISTS "Developers can delete unit types" ON unit_types;

-- Add shop_id column to unit_types if it doesn't exist
ALTER TABLE unit_types ADD COLUMN IF NOT EXISTS shop_id TEXT;

-- Update existing unit_types to belong to shop '0001'
UPDATE unit_types SET shop_id = '0001' WHERE shop_id IS NULL;

-- Add foreign key constraint (drop first if exists)
ALTER TABLE unit_types DROP CONSTRAINT IF EXISTS unit_types_shop_id_fkey;
ALTER TABLE unit_types 
    ADD CONSTRAINT unit_types_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_unit_types_shop_id ON unit_types(shop_id);

-- Recreate RLS policies for unit_types
CREATE POLICY "Anyone can view unit types"
    ON unit_types FOR SELECT
    USING (shop_id IS NOT NULL);

CREATE POLICY "Staff can insert unit types in their shop"
    ON unit_types FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = unit_types.shop_id
        )
    );

CREATE POLICY "Staff can update unit types in their shop"
    ON unit_types FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = unit_types.shop_id
        )
    );

CREATE POLICY "Staff can delete unit types in their shop"
    ON unit_types FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
            AND coffee_club_accounts.shop_id = unit_types.shop_id
        )
    );

CREATE POLICY "Developers can view all unit types"
    ON unit_types FOR SELECT
    USING (is_developer());

CREATE POLICY "Developers can insert unit types"
    ON unit_types FOR INSERT
    WITH CHECK (is_developer());

CREATE POLICY "Developers can update unit types"
    ON unit_types FOR UPDATE
    USING (is_developer());

CREATE POLICY "Developers can delete unit types"
    ON unit_types FOR DELETE
    USING (is_developer());

-- ============================================
-- PART 2: Fix any accounts with NULL shop_id
-- ============================================

UPDATE coffee_club_accounts 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 3: Fix any products with NULL shop_id
-- ============================================

UPDATE products 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 4: Fix any menu_categories with NULL shop_id
-- ============================================

UPDATE menu_categories 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 5: Fix any ingredients with NULL shop_id
-- ============================================

UPDATE ingredients 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 6: Fix any drink_ingredients with NULL shop_id
-- ============================================

UPDATE drink_ingredients 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 7: Fix any orders with NULL shop_id
-- ============================================

UPDATE orders 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 8: Fix any order_items with NULL shop_id
-- ============================================

UPDATE order_items 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- PART 9: Fix any account_transactions with NULL shop_id
-- ============================================

UPDATE account_transactions 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- ============================================
-- VERIFICATION: Show results
-- ============================================

-- Show coffee_shop
SELECT '=== COFFEE SHOP ===' as section;
SELECT * FROM coffee_shop;

-- Show accounts summary
SELECT '=== ACCOUNTS ===' as section;
SELECT id, email, role, shop_id 
FROM coffee_club_accounts 
ORDER BY role DESC, email;

-- Count check
SELECT '=== COUNTS ===' as section;
SELECT 
    (SELECT COUNT(*) FROM coffee_club_accounts WHERE shop_id = '0001') as accounts,
    (SELECT COUNT(*) FROM products WHERE shop_id = '0001') as products,
    (SELECT COUNT(*) FROM menu_categories WHERE shop_id = '0001') as categories,
    (SELECT COUNT(*) FROM ingredients WHERE shop_id = '0001') as ingredients,
    (SELECT COUNT(*) FROM unit_types WHERE shop_id = '0001') as unit_types;

-- Check for any remaining NULL shop_ids
SELECT '=== NULL SHOP_ID CHECK (should all be 0) ===' as section;
SELECT 
    (SELECT COUNT(*) FROM coffee_club_accounts WHERE shop_id IS NULL) as accounts_null,
    (SELECT COUNT(*) FROM products WHERE shop_id IS NULL) as products_null,
    (SELECT COUNT(*) FROM menu_categories WHERE shop_id IS NULL) as categories_null,
    (SELECT COUNT(*) FROM ingredients WHERE shop_id IS NULL) as ingredients_null,
    (SELECT COUNT(*) FROM unit_types WHERE shop_id IS NULL) as unit_types_null;

