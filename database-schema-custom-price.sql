-- Custom Price Support for Drink Ingredients
-- Adds custom_price column to allow per-recipe ingredient pricing
-- Run this SQL in your Supabase SQL Editor after database-schema-size-recipes.sql
--
-- PREREQUISITES:
-- 1. Run database-schema.sql first
-- 2. Run database-schema-customizations.sql (creates drink_ingredients table - REQUIRED)
-- 3. Run database-schema-size-recipes.sql (adds size_id support)
-- 4. Then run this file

-- Step 1: Add nullable custom_price column to drink_ingredients table
ALTER TABLE drink_ingredients 
ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10, 2) CHECK (custom_price >= 0 OR custom_price IS NULL);

-- Step 2: Add comment to document the column
COMMENT ON COLUMN drink_ingredients.custom_price IS 
'Custom price per unit for this ingredient in this recipe. NULL = use ingredient default unit_cost. Only used when use_default_price = false.';

-- Note: When use_default_price = false and custom_price is NULL, ingredient is included in base price (no per-unit charge)
-- When use_default_price = false and custom_price is set, use this custom price instead of ingredient default

