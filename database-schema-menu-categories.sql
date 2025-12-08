-- Database Schema Updates for Menu Categories System
-- 
-- PREREQUISITES:
-- 1. Run database-schema.sql first (creates products table)
-- 2. Run database-schema-customizations.sql (creates ingredients table - optional, but recommended)
-- 3. Then run this file
--
-- If ingredients table doesn't exist, this migration will skip ingredient-related updates

-- Step 1: Create menu_categories table
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('drink', 'food', 'merch', 'ingredient')),
    display_order INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Step 2: Add category_id column to products table (nullable initially for migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;

-- Step 3: Create index for category_id
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Step 4: Update ingredients table category constraint (only if table exists)
DO $$
BEGIN
    -- Check if ingredients table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ingredients') THEN
        -- Drop the old constraint if it exists
        ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_category_check;
        
        -- Add new constraint with updated categories
        ALTER TABLE ingredients ADD CONSTRAINT ingredients_category_check 
            CHECK (category IN ('base_drinks', 'sugars', 'liquid_creamers', 'toppings', 'add_ins'));
        
        -- Migrate existing ingredient categories to new system
        -- Map old categories to new ones
        UPDATE ingredients SET category = 'base_drinks' WHERE category = 'espresso';
        UPDATE ingredients SET category = 'sugars' WHERE category = 'sweetener';
        UPDATE ingredients SET category = 'liquid_creamers' WHERE category IN ('liquid', 'milk');
        UPDATE ingredients SET category = 'toppings' WHERE category = 'topping';
        UPDATE ingredients SET category = 'add_ins' WHERE category IN ('syrup', 'other');
    END IF;
END $$;

-- Step 6: Insert default menu categories
INSERT INTO menu_categories (name, type, display_order, available) VALUES
-- Drink categories
('Coffee', 'drink', 1, true),
('Tea', 'drink', 2, true),
('Espresso', 'drink', 3, true),
('Refreshers', 'drink', 4, true),
-- Food categories
('Baked Goods', 'food', 1, true),
('Sandwiches', 'food', 2, true),
('Chips', 'food', 3, true),
-- Merch categories
('Shirts', 'merch', 1, true),
('Hats', 'merch', 2, true),
('Tumblers', 'merch', 3, true),
('Mugs', 'merch', 4, true),
-- Ingredient categories
('Base Drinks', 'ingredient', 1, true),
('Sugars', 'ingredient', 2, true),
('Liquid Creamers', 'ingredient', 3, true),
('Toppings', 'ingredient', 4, true),
('Add-ins', 'ingredient', 5, true)
ON CONFLICT (name, type) DO NOTHING;

-- Step 7: Enable RLS on menu_categories
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies for menu_categories
-- Anyone can view available categories
CREATE POLICY "Anyone can view available categories"
    ON menu_categories FOR SELECT
    USING (available = true);

-- Staff can manage categories (insert, update, delete)
CREATE POLICY "Staff can insert categories"
    ON menu_categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

CREATE POLICY "Staff can update categories"
    ON menu_categories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

CREATE POLICY "Staff can delete categories"
    ON menu_categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

-- Step 9: Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_menu_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Trigger to update updated_at
CREATE TRIGGER trigger_update_menu_category_updated_at
    BEFORE UPDATE ON menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_menu_category_updated_at();

-- Step 11: Clear all existing products (as requested)
DELETE FROM products;

-- Step 12: Drop old category column from products (after migration is complete)
-- Note: Keep this commented out initially - uncomment after verifying category_id is working
-- ALTER TABLE products DROP COLUMN IF EXISTS category;

