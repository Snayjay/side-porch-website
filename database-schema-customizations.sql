-- Database Schema Updates for Customizable Drinks
-- Run this SQL in your Supabase SQL Editor after the base schema
--
-- PREREQUISITES:
-- 1. Run database-schema.sql first (creates products table)
-- 2. Run database-schema-unit-types.sql (creates unit_types table - REQUIRED)
-- 3. Then run this file

-- Ingredients table
-- NOTE: This table uses the new category system (base_drinks, sugars, liquid_creamers, toppings, add_ins)
-- and references unit_types table. Make sure unit_types table exists before running this.
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('base_drinks', 'sugars', 'liquid_creamers', 'toppings', 'add_ins')),
    unit_type TEXT NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, category),
    -- Foreign key to unit_types table (will be added after unit_types table exists)
    CONSTRAINT ingredients_unit_type_fkey FOREIGN KEY (unit_type) REFERENCES unit_types(name) ON DELETE RESTRICT
);

-- Drink ingredients (default ingredients for each drink)
CREATE TABLE IF NOT EXISTS drink_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    default_amount DECIMAL(10, 2) NOT NULL DEFAULT 1.0 CHECK (default_amount >= 0),
    is_required BOOLEAN DEFAULT false,
    is_removable BOOLEAN DEFAULT true,
    is_addable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, ingredient_id)
);

-- Order item customizations (stores customizations for each ordered item)
CREATE TABLE IF NOT EXISTS order_item_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'modify')),
    cost_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_available ON ingredients(available);
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_product_id ON drink_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_ingredient_id ON drink_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_order_item_customizations_order_item_id ON order_item_customizations(order_item_id);

-- RLS Policies
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_customizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (allows re-running migration)
DROP POLICY IF EXISTS "Anyone can view available ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can insert ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can update ingredients" ON ingredients;
DROP POLICY IF EXISTS "Staff can delete ingredients" ON ingredients;

-- Anyone can view available ingredients
CREATE POLICY "Anyone can view available ingredients"
    ON ingredients FOR SELECT
    USING (available = true);

-- Staff can manage ingredients (insert, update, delete)
CREATE POLICY "Staff can insert ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

CREATE POLICY "Staff can update ingredients"
    ON ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

CREATE POLICY "Staff can delete ingredients"
    ON ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE id = auth.uid() AND role = 'staff'
        )
    );

-- Drop existing policies for drink_ingredients if they exist
DROP POLICY IF EXISTS "Anyone can view drink ingredients" ON drink_ingredients;

-- Anyone can view drink ingredients
CREATE POLICY "Anyone can view drink ingredients"
    ON drink_ingredients FOR SELECT
    USING (true);

-- Drop existing policies for order_item_customizations if they exist
DROP POLICY IF EXISTS "Users can view customizations from their orders" ON order_item_customizations;
DROP POLICY IF EXISTS "System can insert customizations for user orders" ON order_item_customizations;

-- Users can view customizations from their orders
CREATE POLICY "Users can view customizations from their orders"
    ON order_item_customizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = order_item_customizations.order_item_id
            AND o.account_id = auth.uid()
        )
    );

-- System can insert customizations for user orders
CREATE POLICY "System can insert customizations for user orders"
    ON order_item_customizations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.id = order_item_customizations.order_item_id
            AND o.account_id = auth.uid()
        )
    );

-- Insert common ingredients (using new category system)
-- NOTE: Make sure unit_types table exists and has default values before running this
INSERT INTO ingredients (name, category, unit_type, unit_cost, available) VALUES
-- Base Drinks
('Espresso Shot', 'base_drinks', 'shots', 0.75, true),
-- Add-ins (syrups)
('Vanilla Syrup', 'add_ins', 'pumps', 0.25, true),
('Caramel Syrup', 'add_ins', 'pumps', 0.25, true),
('Hazelnut Syrup', 'add_ins', 'pumps', 0.25, true),
('Maple Syrup', 'add_ins', 'pumps', 0.30, true),
('Pumpkin Spice Syrup', 'add_ins', 'pumps', 0.30, true),
('Apple Syrup', 'add_ins', 'pumps', 0.25, true),
('Chocolate Syrup', 'add_ins', 'pumps', 0.25, true),
-- Liquid Creamers
('Steamed Milk', 'liquid_creamers', 'oz', 0.10, true),
('Oat Milk', 'liquid_creamers', 'oz', 0.12, true),
('Almond Milk', 'liquid_creamers', 'oz', 0.12, true),
('Soy Milk', 'liquid_creamers', 'oz', 0.12, true),
('Coconut Milk', 'liquid_creamers', 'oz', 0.12, true),
('Heavy Cream', 'liquid_creamers', 'oz', 0.15, true),
('Hot Water', 'liquid_creamers', 'oz', 0.00, true),
-- Sugars
('Sugar', 'sugars', 'tsp', 0.00, true),
('Brown Sugar', 'sugars', 'tsp', 0.00, true),
('Honey', 'sugars', 'tsp', 0.10, true),
('Stevia', 'sugars', 'packets', 0.00, true),
('Splenda', 'sugars', 'packets', 0.00, true),
('Equal', 'sugars', 'packets', 0.00, true),
-- Toppings
('Whipped Cream', 'toppings', 'count', 0.50, true),
('Chocolate Shavings', 'toppings', 'count', 0.25, true),
('Cinnamon', 'toppings', 'count', 0.00, true),
('Nutmeg', 'toppings', 'count', 0.00, true),
('Caramel Drizzle', 'toppings', 'count', 0.25, true),
('Maple Drizzle', 'toppings', 'count', 0.30, true),
('Toasted Pecans', 'toppings', 'count', 0.50, true)
ON CONFLICT (name, category) DO NOTHING;

-- Example: Set up default ingredients for a few drinks
-- Note: You'll need to run this after products are inserted and get their IDs
-- This is just an example - adjust based on your actual product IDs

-- Example for Maple Pecan Latte (assuming product_id exists)
-- INSERT INTO drink_ingredients (product_id, ingredient_id, default_amount, is_required, is_removable, is_addable)
-- SELECT 
--     p.id as product_id,
--     i.id as ingredient_id,
--     CASE 
--         WHEN i.name = 'Espresso Shot' THEN 2.0
--         WHEN i.name = 'Steamed Milk' THEN 8.0
--         WHEN i.name = 'Maple Syrup' THEN 2.0
--         WHEN i.name = 'Toasted Pecans' THEN 1.0
--         ELSE 0.0
--     END as default_amount,
--     CASE WHEN i.name = 'Espresso Shot' THEN true ELSE false END as is_required,
--     CASE WHEN i.name = 'Toasted Pecans' THEN true ELSE false END as is_removable,
--     true as is_addable
-- FROM products p
-- CROSS JOIN ingredients i
-- WHERE p.name = 'Maple Pecan Latte'
-- AND i.name IN ('Espresso Shot', 'Steamed Milk', 'Maple Syrup', 'Toasted Pecans');

