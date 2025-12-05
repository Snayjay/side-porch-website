-- Fix for Coffee Club Account Creation Trigger
-- Run this in your Supabase SQL Editor if you're getting "Database error saving new user"

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_coffee_club_account ON auth.users;
DROP FUNCTION IF EXISTS create_coffee_club_account();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION create_coffee_club_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if the account doesn't already exist
    INSERT INTO coffee_club_accounts (id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '')
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error creating coffee club account for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_create_coffee_club_account
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_coffee_club_account();

