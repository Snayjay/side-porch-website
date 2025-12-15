-- Fix RLS Policy Infinite Recursion Issue
-- Run this if you're getting "infinite recursion detected in policy" errors
-- This replaces the developer check policies with a helper function approach

-- Step 1: Create helper function to check if user is developer (avoids RLS recursion)
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

-- Step 2: Drop existing developer policies that cause recursion
DROP POLICY IF EXISTS "Developers can view all coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can insert coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can update coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can delete coffee shops" ON coffee_shop;
DROP POLICY IF EXISTS "Developers can view all accounts" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can update all accounts" ON coffee_club_accounts;
DROP POLICY IF EXISTS "Developers can view all transactions" ON account_transactions;
DROP POLICY IF EXISTS "Developers can view all orders" ON orders;
DROP POLICY IF EXISTS "Developers can view all products" ON products;

-- Step 3: Recreate policies using the helper function
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

CREATE POLICY "Developers can view all accounts"
    ON coffee_club_accounts FOR SELECT
    USING (is_developer());

CREATE POLICY "Developers can update all accounts"
    ON coffee_club_accounts FOR UPDATE
    USING (is_developer());

CREATE POLICY "Developers can view all transactions"
    ON account_transactions FOR SELECT
    USING (is_developer());

CREATE POLICY "Developers can view all orders"
    ON orders FOR SELECT
    USING (is_developer());

CREATE POLICY "Developers can view all products"
    ON products FOR SELECT
    USING (is_developer());

