-- Fix RLS Policies for Products and Drink Ingredients
-- This script ensures the RLS policies are correctly set up for staff to insert, update, and manage products and drink ingredients

-- ============================================
-- Fix Products Insert Policy
-- ============================================
DROP POLICY IF EXISTS "Staff can insert products" ON products;

CREATE POLICY "Staff can insert products"
    ON products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- ============================================
-- Fix Products Update Policy
-- ============================================
DROP POLICY IF EXISTS "Staff can update products" ON products;

CREATE POLICY "Staff can update products"
    ON products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- ============================================
-- Fix Drink Ingredients Insert Policy
-- ============================================
DROP POLICY IF EXISTS "Staff can insert drink ingredients" ON drink_ingredients;

CREATE POLICY "Staff can insert drink ingredients"
    ON drink_ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- ============================================
-- Verify Policies Exist
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE (tablename = 'products' AND (policyname = 'Staff can insert products' OR policyname = 'Staff can update products'))
   OR (tablename = 'drink_ingredients' AND policyname = 'Staff can insert drink ingredients')
ORDER BY tablename, policyname;

-- NOTE: When running SQL directly in Supabase SQL Editor, auth.uid() returns NULL
-- because you're running as the 'postgres' role, not as an authenticated user.
-- This is why the test query shows "RLS CHECK WOULD FAIL" - it's expected!
-- The RLS policy WILL work when queries are made through the JavaScript client
-- with an authenticated session.

-- To test if the policy works, you need to test from the browser console:
-- 1. Open browser console (F12)
-- 2. Make sure you're logged in
-- 3. Run this JavaScript in the console:
--    const client = getSupabaseClient();
--    const { data, error } = await client.from('products').insert({
--      name: 'Test Product',
--      category_id: 'YOUR_CATEGORY_ID',
--      price: 0.01,
--      tax_rate: 0.0825,
--      available: false
--    }).select().single();
--    console.log('Result:', data, 'Error:', error);

-- Verify the policy exists and is correct
SELECT 
    policyname,
    cmd as operation,
    with_check as policy_condition
FROM pg_policies
WHERE tablename = 'products' AND policyname = 'Staff can insert products';

