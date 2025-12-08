-- Role-Based Access and Admin Menu Management Migration
-- Run this SQL in your Supabase SQL Editor after the base schema

-- 0. Update the account creation function to include role field
CREATE OR REPLACE FUNCTION create_coffee_club_account()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO coffee_club_accounts (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'customer'  -- Default role for new users
    )
    ON CONFLICT (id) DO NOTHING;  -- Prevent errors if account already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Add role column to coffee_club_accounts table
ALTER TABLE coffee_club_accounts 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer' 
CHECK (role IN ('customer', 'staff'));

-- Update existing records to have default 'customer' role
UPDATE coffee_club_accounts 
SET role = 'customer' 
WHERE role IS NULL;

-- 2. Add menu_section column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS menu_section TEXT;

-- Create index for menu_section
CREATE INDEX IF NOT EXISTS idx_products_menu_section ON products(menu_section);

-- 3. Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('espresso', 'syrup', 'liquid', 'sweetener', 'topping', 'milk', 'other')),
    unit_type TEXT NOT NULL CHECK (unit_type IN ('shots', 'pumps', 'oz', 'tsp', 'packets', 'count')),
    unit_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_available ON ingredients(available);

-- 4. Create drink_ingredients table (links products to ingredients)
CREATE TABLE IF NOT EXISTS drink_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    default_amount DECIMAL(10, 4) NOT NULL DEFAULT 0.00 CHECK (default_amount >= 0),
    is_required BOOLEAN DEFAULT false,
    is_removable BOOLEAN DEFAULT true,
    is_addable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, ingredient_id)
);

-- Create indexes for drink_ingredients
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_product_id ON drink_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_ingredient_id ON drink_ingredients(ingredient_id);

-- Enable RLS on new tables
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredients
-- Public can view available ingredients
CREATE POLICY "Anyone can view available ingredients"
    ON ingredients FOR SELECT
    USING (available = true);

-- Staff can view all ingredients
CREATE POLICY "Staff can view all ingredients"
    ON ingredients FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can insert ingredients
CREATE POLICY "Staff can insert ingredients"
    ON ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can update ingredients
CREATE POLICY "Staff can update ingredients"
    ON ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can delete ingredients
CREATE POLICY "Staff can delete ingredients"
    ON ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- RLS Policies for drink_ingredients
-- Public can view drink ingredients
CREATE POLICY "Anyone can view drink ingredients"
    ON drink_ingredients FOR SELECT
    USING (true);

-- Staff can manage drink ingredients
CREATE POLICY "Staff can insert drink ingredients"
    ON drink_ingredients FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

CREATE POLICY "Staff can update drink ingredients"
    ON drink_ingredients FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

CREATE POLICY "Staff can delete drink ingredients"
    ON drink_ingredients FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Update RLS policies for coffee_club_accounts
-- Staff can view all accounts (for role management)
DROP POLICY IF EXISTS "Users can view their own account" ON coffee_club_accounts;
CREATE POLICY "Users can view their own account"
    ON coffee_club_accounts FOR SELECT
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can update all accounts (for role management)
DROP POLICY IF EXISTS "Users can update their own account" ON coffee_club_accounts;
CREATE POLICY "Users can update their own account"
    ON coffee_club_accounts FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Update RLS policies for products
-- Staff can manage products
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
CREATE POLICY "Anyone can view available products"
    ON products FOR SELECT
    USING (available = true);

-- Staff can view all products (including archived)
CREATE POLICY "Staff can view all products"
    ON products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can insert products
CREATE POLICY "Staff can insert products"
    ON products FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can update products
CREATE POLICY "Staff can update products"
    ON products FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Staff can delete products
CREATE POLICY "Staff can delete products"
    ON products FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM coffee_club_accounts
            WHERE coffee_club_accounts.id = auth.uid()
            AND coffee_club_accounts.role = 'staff'
        )
    );

-- Insert default ingredients
INSERT INTO ingredients (name, category, unit_type, unit_cost, available) VALUES
('Espresso Shot', 'espresso', 'shots', 0.75, true),
('Vanilla Syrup', 'syrup', 'pumps', 0.25, true),
('Caramel Syrup', 'syrup', 'pumps', 0.25, true),
('Hazelnut Syrup', 'syrup', 'pumps', 0.25, true),
('Maple Syrup', 'syrup', 'pumps', 0.30, true),
('Pumpkin Spice Syrup', 'syrup', 'pumps', 0.30, true),
('Steamed Milk', 'liquid', 'oz', 0.10, true),
('Oat Milk', 'milk', 'oz', 0.12, true),
('Almond Milk', 'milk', 'oz', 0.12, true),
('Soy Milk', 'milk', 'oz', 0.12, true),
('Coconut Milk', 'milk', 'oz', 0.12, true),
('Sugar', 'sweetener', 'tsp', 0.00, true),
('Stevia', 'sweetener', 'packets', 0.00, true),
('Whipped Cream', 'topping', 'count', 0.50, true),
('Toasted Pecans', 'topping', 'count', 0.50, true),
('Chocolate Shavings', 'topping', 'count', 0.30, true),
('Cinnamon', 'topping', 'count', 0.00, true),
('Nutmeg', 'topping', 'count', 0.00, true)
ON CONFLICT DO NOTHING;

