-- Add temp field to products table for drinks
-- This field indicates whether a drink is hot or cold

-- Add the temp column (nullable, as it only applies to drinks)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS temp TEXT CHECK (temp IN ('hot', 'cold', 'both'));

-- Add a comment to document the field
COMMENT ON COLUMN products.temp IS 'Temperature preference for drinks: hot, cold, or both';

