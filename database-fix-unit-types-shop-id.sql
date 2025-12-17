-- Add shop_id to unit_types table
-- Run this in Supabase SQL Editor after running database-fix-shop-id-format.sql

-- Step 1: Drop existing RLS policies on unit_types
DROP POLICY IF EXISTS "Anyone can view unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can insert unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can update unit types" ON unit_types;
DROP POLICY IF EXISTS "Staff can delete unit types" ON unit_types;

-- Step 2: Add shop_id column to unit_types
ALTER TABLE unit_types ADD COLUMN IF NOT EXISTS shop_id TEXT;

-- Step 3: Update existing unit_types to belong to shop '0001'
UPDATE unit_types SET shop_id = '0001' WHERE shop_id IS NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE unit_types 
    DROP CONSTRAINT IF EXISTS unit_types_shop_id_fkey;

ALTER TABLE unit_types 
    ADD CONSTRAINT unit_types_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_unit_types_shop_id ON unit_types(shop_id);

-- Step 6: Recreate RLS policies with shop_id filtering

-- Anyone can view unit types for their shop
CREATE POLICY "Anyone can view unit types"
    ON unit_types FOR SELECT
    USING (shop_id IS NOT NULL);

-- Staff can insert unit types in their shop
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

-- Staff can update unit types in their shop
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

-- Staff can delete unit types in their shop
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

-- Developers can manage all unit types
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

-- Step 7: Verify the update
SELECT 'unit_types updated' as status, COUNT(*) as count FROM unit_types WHERE shop_id = '0001';

