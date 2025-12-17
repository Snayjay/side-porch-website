-- Emergency Fix for 500 errors
-- Run this in Supabase SQL Editor

-- Step 1: Check the coffee_club_accounts table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'coffee_club_accounts';

-- Step 2: Check if shop_id column exists and its values
SELECT id, email, role, shop_id FROM coffee_club_accounts LIMIT 10;

-- Step 3: Check if the coffee_shop table has our shop
SELECT * FROM coffee_shop;

-- Step 4: Temporarily disable RLS to fix the data (re-enable after)
ALTER TABLE coffee_club_accounts DISABLE ROW LEVEL SECURITY;

-- Step 5: Ensure shop_id column is TEXT type (might still be UUID)
-- First, check if it needs conversion
DO $$
BEGIN
    -- Check if shop_id is UUID type and convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coffee_club_accounts' 
        AND column_name = 'shop_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Drop foreign key if exists
        ALTER TABLE coffee_club_accounts DROP CONSTRAINT IF EXISTS coffee_club_accounts_shop_id_fkey;
        
        -- Add new column
        ALTER TABLE coffee_club_accounts ADD COLUMN IF NOT EXISTS new_shop_id TEXT;
        
        -- Copy data (convert UUID to our 4-digit code)
        UPDATE coffee_club_accounts SET new_shop_id = '0001';
        
        -- Drop old column and rename new
        ALTER TABLE coffee_club_accounts DROP COLUMN shop_id;
        ALTER TABLE coffee_club_accounts RENAME COLUMN new_shop_id TO shop_id;
        
        RAISE NOTICE 'Converted shop_id from UUID to TEXT';
    ELSE
        RAISE NOTICE 'shop_id is already TEXT type';
    END IF;
END $$;

-- Step 6: Update any NULL shop_id to '0001'
UPDATE coffee_club_accounts SET shop_id = '0001' WHERE shop_id IS NULL OR shop_id = '';

-- Step 7: Add foreign key constraint (if coffee_shop.id is TEXT)
ALTER TABLE coffee_club_accounts 
    DROP CONSTRAINT IF EXISTS coffee_club_accounts_shop_id_fkey;

ALTER TABLE coffee_club_accounts 
    ADD CONSTRAINT coffee_club_accounts_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES coffee_shop(id) ON DELETE RESTRICT;

-- Step 8: Create index
CREATE INDEX IF NOT EXISTS idx_coffee_club_accounts_shop_id ON coffee_club_accounts(shop_id);

-- Step 9: Re-enable RLS
ALTER TABLE coffee_club_accounts ENABLE ROW LEVEL SECURITY;

-- Step 10: Drop and recreate RLS policies (simpler version to avoid recursion)
DROP POLICY IF EXISTS "Users can view their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Staff can view accounts in their shop" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can view all accounts" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Staff can update accounts in their shop" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can update all accounts" ON coffee_club_accounts;

-- Simple policy: Users can view and update their own account
CREATE POLICY "Users can view their own account"
    ON coffee_club_accounts FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own account"
    ON coffee_club_accounts FOR UPDATE
    USING (auth.uid() = id);

-- Verify the fix
SELECT '=== ACCOUNTS AFTER FIX ===' as status;
SELECT id, email, role, shop_id FROM coffee_club_accounts;

