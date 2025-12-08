-- Fix role constraint and normalize existing roles to lowercase
-- Run this SQL in your Supabase SQL Editor

-- First, normalize any existing roles to lowercase
UPDATE coffee_club_accounts 
SET role = LOWER(role)
WHERE role != LOWER(role);

-- Drop the existing constraint if it exists
ALTER TABLE coffee_club_accounts 
DROP CONSTRAINT IF EXISTS coffee_club_accounts_role_check;

-- Recreate the constraint (it already only allows lowercase, but this ensures it's correct)
ALTER TABLE coffee_club_accounts 
ADD CONSTRAINT coffee_club_accounts_role_check 
CHECK (role IN ('customer', 'staff'));

-- Verify: This should return 0 rows (all roles should be lowercase)
SELECT id, email, role 
FROM coffee_club_accounts 
WHERE role != LOWER(role);

