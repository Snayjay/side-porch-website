// Configuration and Secrets Management
// This file handles API keys and configuration securely
// Configuration is stored in the database as a master record

class ConfigManager {
    constructor() {
        this.config = {
            supabase: {
                url: null,
                anonKey: null
            },
            stripe: {
                publishableKey: null
            }
        };
        this.loaded = false;
        // Load from localStorage first (for initial setup)
        this.loadFromStorage();
        
        // After Supabase is ready, try to load from database and sync
        window.addEventListener('supabaseReady', () => {
            this.syncFromDatabase();
        });
        
        // Also try immediately if Supabase is already configured
        if (this.isSupabaseConfigured()) {
            setTimeout(() => this.syncFromDatabase(), 1000);
        }
    }
    
    async syncFromDatabase() {
        // Sync from database after Supabase is initialized
        const loaded = await this.loadFromDatabase();
        if (loaded) {
            console.log('Configuration synced from database');
        }
    }

    async loadFromDatabase() {
        // First try to load from database (master record)
        // Note: This requires Supabase to already be configured, so it's used after initial setup
        try {
            const client = getSupabaseClient();
            if (client) {
                const { data, error } = await client
                    .from('site_config')
                    .select('config_key, config_value')
                    .in('config_key', ['supabase_url', 'supabase_anon_key', 'stripe_publishable_key']);

                if (!error && data && data.length > 0) {
                    const configMap = {};
                    data.forEach(item => {
                        configMap[item.config_key] = item.config_value;
                    });

                    let hasConfig = false;
                    if (configMap.supabase_url && configMap.supabase_anon_key) {
                        this.config.supabase.url = configMap.supabase_url;
                        this.config.supabase.anonKey = configMap.supabase_anon_key;
                        hasConfig = true;
                    }
                    if (configMap.stripe_publishable_key) {
                        this.config.stripe.publishableKey = configMap.stripe_publishable_key;
                    }

                    if (hasConfig) {
                        // If we got config from database, save to localStorage as backup
                        this.saveToStorage();
                        this.loaded = true;
                        // Reinitialize Supabase with the loaded config
                        if (typeof initializeSupabase === 'function') {
                            initializeSupabase();
                        }
                        return true;
                    }
                }
            }
        } catch (e) {
            console.log('Database config not available, using localStorage:', e.message);
        }

        // Fallback to localStorage (for initial setup or if database isn't available)
        this.loadFromStorage();
        return false;
    }

    loadFromStorage() {
        // Load from localStorage as fallback
        try {
            const stored = localStorage.getItem('coffeeClubConfig');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.supabase?.url) {
                    this.config.supabase.url = parsed.supabase.url;
                }
                if (parsed.supabase?.anonKey) {
                    this.config.supabase.anonKey = parsed.supabase.anonKey;
                }
                if (parsed.stripe?.publishableKey) {
                    this.config.stripe.publishableKey = parsed.stripe.publishableKey;
                }
                this.loaded = true;
            }
        } catch (e) {
            console.error('Error loading config from storage:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('coffeeClubConfig', JSON.stringify(this.config));
        } catch (e) {
            console.error('Error saving config to storage:', e);
        }
    }

    async saveToDatabase() {
        // Save to database as master record
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Cannot save to database - Supabase not configured yet. Saving to localStorage.');
            this.saveToStorage();
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            // Update or insert each config value
            const updates = [
                { config_key: 'supabase_url', config_value: this.config.supabase.url || '' },
                { config_key: 'supabase_anon_key', config_value: this.config.supabase.anonKey || '' },
                { config_key: 'stripe_publishable_key', config_value: this.config.stripe.publishableKey || '' }
            ];

            for (const update of updates) {
                const { error } = await client
                    .from('site_config')
                    .upsert({
                        config_key: update.config_key,
                        config_value: update.config_value,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'config_key'
                    });

                if (error) {
                    console.error(`Error saving ${update.config_key}:`, error);
                }
            }

            // Also save to localStorage as backup
            this.saveToStorage();
            return { success: true };
        } catch (e) {
            console.error('Error saving config to database:', e);
            // Fallback to localStorage
            this.saveToStorage();
            return { success: false, error: e.message };
        }
    }

    setSupabaseKey(key) {
        this.config.supabase.anonKey = key;
        this.saveToStorage();
    }

    setStripeKey(key) {
        this.config.stripe.publishableKey = key;
        this.saveToStorage();
    }

    getSupabaseConfig() {
        return this.config.supabase;
    }

    getStripeConfig() {
        return this.config.stripe;
    }

    isConfigured() {
        // Check if Supabase is configured (required for auth)
        const supabaseConfigured = !!(this.config.supabase.url && this.config.supabase.anonKey && this.config.supabase.anonKey !== '\u0016');
        // Check if Stripe is configured (required for payments)
        const stripeConfigured = !!(this.config.stripe.publishableKey && this.config.stripe.publishableKey !== '\u0016');
        return { supabase: supabaseConfigured, stripe: stripeConfigured, all: supabaseConfigured && stripeConfigured };
    }
    
    isSupabaseConfigured() {
        const config = this.isConfigured();
        return config.supabase;
    }
    
    isStripeConfigured() {
        const config = this.isConfigured();
        return config.stripe;
    }
}

// Global config instance
const configManager = new ConfigManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { configManager };
}

