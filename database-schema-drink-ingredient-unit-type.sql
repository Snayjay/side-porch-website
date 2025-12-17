-- Migration: Add unit_type column to drink_ingredients table
-- This allows recipes to use a different unit type than the ingredient's default
-- Example: Coffee ingredient default is 'oz', but a recipe might use 'parts' for ratio-based mixing

-- Add unit_type column to drink_ingredients
ALTER TABLE drink_ingredients 
ADD COLUMN IF NOT EXISTS unit_type TEXT;

-- Add foreign key constraint to unit_types table (optional - allows custom unit types not in unit_types table like 'parts')
-- Note: We don't enforce FK here because 'parts' is a special ratio-based unit not in unit_types table
-- ALTER TABLE drink_ingredients 
--     ADD CONSTRAINT drink_ingredients_unit_type_fkey 
--     FOREIGN KEY (unit_type) REFERENCES unit_types(name) ON DELETE SET NULL;

-- Comment explaining the column
COMMENT ON COLUMN drink_ingredients.unit_type IS 'Override unit type for this ingredient in this recipe. If NULL, uses the ingredient default unit_type.';

