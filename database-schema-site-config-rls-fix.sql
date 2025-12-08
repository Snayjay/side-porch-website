-- Fix RLS Policies for site_config table
-- Allow staff to insert and update site_config

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can update site config" ON site_config;
DROP POLICY IF EXISTS "Authenticated users can insert site config" ON site_config;

-- Create new policies that check for staff role
CREATE POLICY "Staff can update site config"
    ON site_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

CREATE POLICY "Staff can insert site config"
    ON site_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

