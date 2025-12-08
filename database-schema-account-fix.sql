-- Fix for missing coffee_club_accounts records
-- Run this SQL in your Supabase SQL Editor

-- 0. Add role column if it doesn't exist (for databases that haven't run the roles migration yet)
ALTER TABLE coffee_club_accounts 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' 
CHECK (role IN ('customer', 'staff'));

-- Update existing records to have default 'customer' role
UPDATE coffee_club_accounts 
SET role = 'customer' 
WHERE role IS NULL;

-- 1. Ensure the function exists (recreate if needed)
CREATE OR REPLACE FUNCTION create_coffee_club_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO coffee_club_accounts (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'customer'  -- Default role
    )
    ON CONFLICT (id) DO NOTHING;  -- Prevent errors if account already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_create_coffee_club_account ON auth.users;

CREATE TRIGGER trigger_create_coffee_club_account
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_coffee_club_account();

-- 3. Create accounts for any existing users who don't have one yet
-- This will backfill accounts for users who signed up before the trigger was created
INSERT INTO coffee_club_accounts (id, email, full_name, role, balance, created_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    'customer' as role,
    0.00 as balance,
    u.created_at
FROM auth.users u
LEFT JOIN coffee_club_accounts cca ON u.id = cca.id
WHERE cca.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Verify the fix worked
-- Run this query to see all users and their account status:
-- SELECT 
--     u.id,
--     u.email,
--     u.created_at as user_created_at,
--     cca.id as account_exists,
--     cca.role,
--     cca.balance
-- FROM auth.users u
-- LEFT JOIN coffee_club_accounts cca ON u.id = cca.id
-- ORDER BY u.created_at DESC;

