-- Add use_default_price column to drink_ingredients table
-- If true, ingredient uses its default unit_cost for pricing
-- If false, ingredient is included in base drink price (no per-unit charge)

ALTER TABLE drink_ingredients 
ADD COLUMN IF NOT EXISTS use_default_price BOOLEAN DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN drink_ingredients.use_default_price IS 'If true, ingredient uses default unit_cost for pricing. If false, ingredient is included in base drink price (no per-unit charge). Useful for base ingredients like coffee when drink has multiple sizes.';

