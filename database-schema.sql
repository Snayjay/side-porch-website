-- Coffee Club Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User accounts table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS coffee_club_accounts (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES coffee_club_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'purchase', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES coffee_club_accounts(id) ON DELETE CASCADE,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0825,
    tax_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (mock data will be inserted here)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('drink', 'food', 'ingredient', 'merch')),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0825,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_created_at ON account_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_account_id ON orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);

-- Function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'deposit' THEN
        UPDATE coffee_club_accounts
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSIF NEW.type = 'purchase' THEN
        UPDATE coffee_club_accounts
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    ELSIF NEW.type = 'refund' THEN
        UPDATE coffee_club_accounts
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balance on transaction
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT ON account_transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- Function to create account on user signup
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

-- Trigger to create account when user signs up
CREATE TRIGGER trigger_create_coffee_club_account
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_coffee_club_account();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE coffee_club_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for coffee_club_accounts
CREATE POLICY "Users can view their own account"
    ON coffee_club_accounts FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own account"
    ON coffee_club_accounts FOR UPDATE
    USING (auth.uid() = id);

-- Policies for account_transactions
CREATE POLICY "Users can view their own transactions"
    ON account_transactions FOR SELECT
    USING (auth.uid() = account_id);

CREATE POLICY "System can insert transactions"
    ON account_transactions FOR INSERT
    WITH CHECK (auth.uid() = account_id);

-- Policies for orders
CREATE POLICY "Users can view their own orders"
    ON orders FOR SELECT
    USING (auth.uid() = account_id);

CREATE POLICY "Users can create their own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = account_id);

CREATE POLICY "Users can update their own orders"
    ON orders FOR UPDATE
    USING (auth.uid() = account_id);

-- Policies for order_items
CREATE POLICY "Users can view items from their orders"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.account_id = auth.uid()
        )
    );

CREATE POLICY "Users can create items for their orders"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.account_id = auth.uid()
        )
    );

-- Policies for products (public read)
CREATE POLICY "Anyone can view available products"
    ON products FOR SELECT
    USING (available = true);

-- Insert mock products
INSERT INTO products (name, description, category, price, tax_rate) VALUES
-- Drinks (8.25% tax)
('Maple Pecan Latte', 'Rich espresso with steamed milk, real maple syrup, and toasted pecans', 'drink', 5.95, 0.0825),
('Pumpkin Spice Latte', 'Espresso, steamed milk, pumpkin puree, and warm spices', 'drink', 5.75, 0.0825),
('Spiced Apple Cider', 'Warm, mulled apple cider with cinnamon and cloves', 'drink', 4.50, 0.0825),
('Caramel Apple Macchiato', 'Espresso with steamed milk, apple syrup, and caramel', 'drink', 5.85, 0.0825),
('Chai Latte', 'Traditional spiced chai tea with steamed milk', 'drink', 4.95, 0.0825),
('Hazelnut Mocha', 'Chocolate and espresso with hazelnut syrup', 'drink', 5.65, 0.0825),
('Maple Brew House Blend', 'Medium roast with notes of maple and caramel', 'drink', 4.25, 0.0825),
('Americano', 'Rich espresso shots topped with hot water', 'drink', 3.75, 0.0825),
('Cappuccino', 'Equal parts espresso, steamed milk, and foam', 'drink', 4.50, 0.0825),
('Cold Brew', 'Smooth, slow-steeped coffee served over ice', 'drink', 4.50, 0.0825),
-- Food (8.25% tax)
('Cinnamon Roll', 'Freshly baked cinnamon rolls with cream cheese frosting', 'food', 4.50, 0.0825),
('Pumpkin Muffin', 'Moist pumpkin muffin with warm spices', 'food', 3.95, 0.0825),
('Apple Pie Slice', 'Homemade apple pie with flaky crust', 'food', 5.50, 0.0825),
('Maple Scone', 'Buttery scone drizzled with real maple glaze', 'food', 3.75, 0.0825),
('Chocolate Chip Cookie', 'Classic cookie made with real butter', 'food', 2.95, 0.0825),
('Croissant', 'Buttery, flaky French croissant', 'food', 3.50, 0.0825),
-- Ingredients (0% tax - grocery items)
('Coffee Beans - House Blend', '1 lb bag of our signature house blend', 'ingredient', 14.99, 0.0000),
('Coffee Beans - Dark Roast', '1 lb bag of dark roast beans', 'ingredient', 15.99, 0.0000),
('Maple Syrup', '12 oz bottle of pure maple syrup', 'ingredient', 12.99, 0.0000),
('Chai Tea Blend', '4 oz bag of our signature chai blend', 'ingredient', 8.99, 0.0000),
('Pumpkin Spice Mix', '2 oz jar of pumpkin spice seasoning', 'ingredient', 6.99, 0.0000),
-- Merch (8.25% tax)
('Coffee Club T-Shirt', 'Comfortable cotton t-shirt with Coffee Club logo', 'merch', 24.99, 0.0825),
('Coffee Club Mug', 'Ceramic mug with Side Porch Coffee Co. logo', 'merch', 16.99, 0.0825),
('Coffee Club Tote Bag', 'Reusable canvas tote bag', 'merch', 18.99, 0.0825),
('Coffee Club Hoodie', 'Cozy hoodie with Coffee Club branding', 'merch', 45.99, 0.0825),
('Coffee Club Hat', 'Adjustable cap with embroidered logo', 'merch', 22.99, 0.0825)
ON CONFLICT DO NOTHING;

