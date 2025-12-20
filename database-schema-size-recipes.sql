-- Size-Specific Recipe Support Migration
-- Adds support for size-specific recipes in drink_ingredients table
-- Run this SQL in your Supabase SQL Editor after database-schema-customizations.sql
--
-- PREREQUISITES:
-- 1. Run database-schema.sql first (creates products table)
-- 2. Run database-schema-product-sizes.sql (creates product_sizes table - REQUIRED)
-- 3. Run database-schema-customizations.sql (creates drink_ingredients table - REQUIRED)
-- 4. Then run this file

-- Step 1: Add nullable size_id column to drink_ingredients table
ALTER TABLE drink_ingredients 
ADD COLUMN IF NOT EXISTS size_id UUID REFERENCES product_sizes(id) ON DELETE CASCADE;

-- Step 2: Drop the existing unique constraint
ALTER TABLE drink_ingredients 
DROP CONSTRAINT IF EXISTS drink_ingredients_product_id_ingredient_id_key;

-- Step 3: Add new unique constraint that includes size_id
-- This allows:
-- - Product-level recipes: size_id = NULL (default for products without sizes)
-- - Size-specific recipes: size_id = <size_id> (overrides for specific sizes)
-- Note: PostgreSQL treats NULL values as distinct in unique constraints, so multiple NULL size_id values are allowed
CREATE UNIQUE INDEX IF NOT EXISTS drink_ingredients_product_id_ingredient_id_size_id_key 
ON drink_ingredients(product_id, ingredient_id, COALESCE(size_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Alternative approach: Use a partial unique index for better NULL handling
-- This allows multiple NULL size_id values (product-level recipes) but enforces uniqueness for size-specific recipes
DROP INDEX IF EXISTS drink_ingredients_product_id_ingredient_id_size_id_key;

-- Create partial unique index for size-specific recipes (size_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS drink_ingredients_product_id_ingredient_id_size_id_unique 
ON drink_ingredients(product_id, ingredient_id, size_id) 
WHERE size_id IS NOT NULL;

-- Create partial unique index for product-level recipes (size_id IS NULL)
-- This ensures one product-level recipe per ingredient per product
CREATE UNIQUE INDEX IF NOT EXISTS drink_ingredients_product_id_ingredient_id_null_size_unique 
ON drink_ingredients(product_id, ingredient_id) 
WHERE size_id IS NULL;

-- Step 4: Add index for efficient queries by product and size
CREATE INDEX IF NOT EXISTS idx_drink_ingredients_product_size 
ON drink_ingredients(product_id, size_id);

-- Step 5: Add comment to document the column
COMMENT ON COLUMN drink_ingredients.size_id IS 
'Optional reference to product_sizes table. NULL = product-level default recipe. Non-NULL = size-specific recipe override.';

-- Step 6: Update existing records to ensure size_id is NULL (product-level defaults)
-- This is safe to run multiple times - it only updates NULL values
UPDATE drink_ingredients 
SET size_id = NULL 
WHERE size_id IS NULL; -- This is a no-op but documents the intent

-- Note: All existing drink_ingredients records will have size_id = NULL (product-level defaults)
-- This maintains backward compatibility - existing recipes continue to work
-- Staff can gradually add size-specific recipes as needed

