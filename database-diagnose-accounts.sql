-- Diagnose account issues
-- Run this in Supabase SQL Editor to check the state of accounts

-- 1. Show all accounts and their shop_id
SELECT id, email, display_name, role, shop_id, created_at 
FROM coffee_club_accounts 
ORDER BY created_at DESC;

-- 2. Check if any accounts have NULL shop_id
SELECT COUNT(*) as accounts_without_shop_id 
FROM coffee_club_accounts 
WHERE shop_id IS NULL;

-- 3. Fix accounts without shop_id - set them to '0001'
UPDATE coffee_club_accounts 
SET shop_id = '0001' 
WHERE shop_id IS NULL;

-- 4. Show all products and their shop_id
SELECT id, name, available, shop_id 
FROM products 
ORDER BY name
LIMIT 20;

-- 5. Check if products have correct shop_id
SELECT COUNT(*) as products_without_shop_id 
FROM products 
WHERE shop_id IS NULL OR shop_id != '0001';

-- 6. Show all menu categories
SELECT id, name, type, available, shop_id 
FROM menu_categories 
ORDER BY display_order, name;

-- 7. Verify the coffee_shop exists with correct ID
SELECT * FROM coffee_shop;

-- 8. After running, verify your account specifically:
-- Replace 'your-email@example.com' with your actual email
SELECT * FROM coffee_club_accounts 
WHERE email = 'jeffrey.loehr@gmail.com';

