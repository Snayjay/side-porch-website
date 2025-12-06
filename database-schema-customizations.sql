-- Database Schema Updates for Customizable Drinks
-- Run this SQL in your Supabase SQL Editor after the base schema

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('espresso', 'syrup', 'liquid', 'sweetener', 'topping', 'milk', 'other')),
    unit_type TEXT NOT NULL CHECK (unit_type IN ('shots', 'pumps', 'oz', 'tsp', 'packets', 'count')),
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, category)
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

-- Anyone can view available ingredients
CREATE POLICY "Anyone can view available ingredients"
    ON ingredients FOR SELECT
    USING (available = true);

-- Anyone can view drink ingredients
CREATE POLICY "Anyone can view drink ingredients"
    ON drink_ingredients FOR SELECT
    USING (true);

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

-- Insert common ingredients
INSERT INTO ingredients (name, category, unit_type, unit_cost, available) VALUES
-- Espresso
('Espresso Shot', 'espresso', 'shots', 0.75, true),
-- Syrups
('Vanilla Syrup', 'syrup', 'pumps', 0.25, true),
('Caramel Syrup', 'syrup', 'pumps', 0.25, true),
('Hazelnut Syrup', 'syrup', 'pumps', 0.25, true),
('Maple Syrup', 'syrup', 'pumps', 0.30, true),
('Pumpkin Spice Syrup', 'syrup', 'pumps', 0.30, true),
('Apple Syrup', 'syrup', 'pumps', 0.25, true),
('Chocolate Syrup', 'syrup', 'pumps', 0.25, true),
-- Liquids
('Steamed Milk', 'liquid', 'oz', 0.10, true),
('Oat Milk', 'liquid', 'oz', 0.12, true),
('Almond Milk', 'liquid', 'oz', 0.12, true),
('Soy Milk', 'liquid', 'oz', 0.12, true),
('Coconut Milk', 'liquid', 'oz', 0.12, true),
('Heavy Cream', 'liquid', 'oz', 0.15, true),
('Hot Water', 'liquid', 'oz', 0.00, true),
-- Sweeteners
('Sugar', 'sweetener', 'tsp', 0.00, true),
('Brown Sugar', 'sweetener', 'tsp', 0.00, true),
('Honey', 'sweetener', 'tsp', 0.10, true),
('Stevia', 'sweetener', 'packets', 0.00, true),
('Splenda', 'sweetener', 'packets', 0.00, true),
('Equal', 'sweetener', 'packets', 0.00, true),
-- Toppings
('Whipped Cream', 'topping', 'count', 0.50, true),
('Chocolate Shavings', 'topping', 'count', 0.25, true),
('Cinnamon', 'topping', 'count', 0.00, true),
('Nutmeg', 'topping', 'count', 0.00, true),
('Caramel Drizzle', 'topping', 'count', 0.25, true),
('Maple Drizzle', 'topping', 'count', 0.30, true),
('Toasted Pecans', 'topping', 'count', 0.50, true)
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

