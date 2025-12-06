-- Site Configuration Table
-- Stores site-wide API keys and configuration (one-time setup)

CREATE TABLE IF NOT EXISTS site_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config keys (values will be set via the admin interface)
INSERT INTO site_config (config_key, config_value, description) VALUES
('supabase_url', '', 'Supabase Project URL'),
('supabase_anon_key', '', 'Supabase Anonymous/Public Key'),
('stripe_publishable_key', '', 'Stripe Publishable Key')
ON CONFLICT (config_key) DO NOTHING;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_config_key ON site_config(config_key);

-- RLS Policies
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read the config (these are public keys anyway)
CREATE POLICY "Anyone can view site config"
    ON site_config FOR SELECT
    USING (true);

-- Only authenticated users can update (you can restrict this further to admins if needed)
CREATE POLICY "Authenticated users can update site config"
    ON site_config FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert site config"
    ON site_config FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_site_config_updated_at
BEFORE UPDATE ON site_config
FOR EACH ROW
EXECUTE FUNCTION update_site_config_updated_at();

