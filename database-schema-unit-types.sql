-- Database Schema for Unit Types Management
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Create unit_types table
-- Note: shop_id is a 4-digit text code referencing coffee_shop(id)
CREATE TABLE IF NOT EXISTS unit_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    abbreviation TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    shop_id TEXT REFERENCES coffee_shop(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, shop_id)  -- Each shop can have their own unit types with same name
);

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unit_types_name ON unit_types(name);
CREATE INDEX IF NOT EXISTS idx_unit_types_display_order ON unit_types(display_order);
CREATE INDEX IF NOT EXISTS idx_unit_types_shop_id ON unit_types(shop_id);

-- Step 3: Insert default unit types
INSERT INTO unit_types (name, display_name, abbreviation, display_order) VALUES
('shots', 'Shots', 'shot', 1),
('pumps', 'Pumps', 'pump', 2),
('oz', 'Ounces', 'oz', 3),
('tsp', 'Teaspoons', 'tsp', 4),
('packets', 'Packets', 'packet', 5),
('count', 'Count', 'count', 6)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Add foreign key constraint to ingredients table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ingredients') THEN
        -- Add foreign key constraint if unit_type column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ingredients' AND column_name = 'unit_type') THEN
            -- First, ensure all existing unit_types in ingredients exist in unit_types table
            INSERT INTO unit_types (name, display_name, abbreviation, display_order)
            SELECT DISTINCT 
                unit_type,
                INITCAP(unit_type),
                CASE 
                    WHEN unit_type = 'shots' THEN 'shot'
                    WHEN unit_type = 'pumps' THEN 'pump'
                    WHEN unit_type = 'oz' THEN 'oz'
                    WHEN unit_type = 'tsp' THEN 'tsp'
                    WHEN unit_type = 'packets' THEN 'packet'
                    WHEN unit_type = 'count' THEN 'count'
                    ELSE unit_type
                END,
                99
            FROM ingredients
            WHERE unit_type IS NOT NULL
            AND unit_type NOT IN (SELECT name FROM unit_types)
            ON CONFLICT (name) DO NOTHING;
            
            -- Add foreign key constraint
            ALTER TABLE ingredients 
            DROP CONSTRAINT IF EXISTS ingredients_unit_type_fkey;
            
            ALTER TABLE ingredients 
            ADD CONSTRAINT ingredients_unit_type_fkey 
            FOREIGN KEY (unit_type) REFERENCES unit_types(name) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Step 5: Enable RLS on unit_types
ALTER TABLE unit_types ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies for unit_types
-- Drop existing policies if they exist (allows re-running migration)
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

-- Anyone can view unit types for their shop
CREATE POLICY "Anyone can view unit types"
    ON unit_types FOR SELECT
    USING (shop_id IS NOT NULL);

-- Staff can manage unit types in their shop
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

-- Step 7: Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_unit_type_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_unit_type_updated_at ON unit_types;
CREATE TRIGGER trigger_update_unit_type_updated_at
    BEFORE UPDATE ON unit_types
    FOR EACH ROW
    EXECUTE FUNCTION update_unit_type_updated_at();

