-- Add code column to coffee_shop table for shorter identifiers
-- Run this if you've already created the coffee_shop table without the code column

-- Add code column if it doesn't exist
ALTER TABLE coffee_shop ADD COLUMN IF NOT EXISTS code TEXT;

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS idx_coffee_shop_code ON coffee_shop(code);

-- Update existing coffee shops to have codes
-- Assign "0001" to the first shop, "0002" to the second, etc.
DO $$
DECLARE
    shop_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR shop_record IN 
        SELECT id FROM coffee_shop 
        WHERE code IS NULL OR code = ''
        ORDER BY created_at ASC
    LOOP
        UPDATE coffee_shop
        SET code = LPAD(counter::TEXT, 4, '0')
        WHERE id = shop_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make code NOT NULL after populating existing records
ALTER TABLE coffee_shop ALTER COLUMN code SET NOT NULL;

