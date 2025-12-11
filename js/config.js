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
            },
            openai: {
                apiKey: null
            }
        };
        this.loaded = false;
        
        // Priority 1: Load from config.local.js (window.COFFEE_CLUB_CONFIG) if available (local dev, gitignored)
        this.loadFromLocalConfig();
        
        // Priority 1b: Load from config.public.js (public config file, committed to repo)
        // This allows GitHub Pages to work without config.local.js
        this.loadFromPublicConfig();
        
        // Priority 2: Load from localStorage (for browser-based setup)
        this.loadFromStorage();
        
        // If config.local.js didn't load anything, make sure we still notify
        // (loadFromStorage will handle notification, but if neither worked, notify anyway)
        setTimeout(() => {
            if (!this.loaded) {
                this.notifyConfigLoaded();
            }
        }, 100);
        
        // Priority 3: After Supabase is ready, try to load from database and sync (only once)
        let databaseSyncAttempted = false;
        window.addEventListener('supabaseReady', () => {
            if (!databaseSyncAttempted) {
                databaseSyncAttempted = true;
                this.syncFromDatabase();
            }
        }, { once: true });
        
        // Also try immediately if Supabase is already configured (only once)
        if (this.isSupabaseConfigured()) {
            setTimeout(() => {
                if (!databaseSyncAttempted) {
                    databaseSyncAttempted = true;
                    this.syncFromDatabase();
                }
            }, 1000);
        }
    }
    
    loadFromLocalConfig() {
        // Check if config.local.js was loaded and set window.COFFEE_CLUB_CONFIG
        if (typeof window !== 'undefined' && window.COFFEE_CLUB_CONFIG) {
            const localConfig = window.COFFEE_CLUB_CONFIG;
            if (localConfig.supabase?.url && localConfig.supabase?.anonKey) {
                this.config.supabase.url = localConfig.supabase.url;
                this.config.supabase.anonKey = localConfig.supabase.anonKey;
                this.loaded = true;
            }
            if (localConfig.stripe?.publishableKey) {
                this.config.stripe.publishableKey = localConfig.stripe.publishableKey;
            }
            if (localConfig.openai?.apiKey) {
                this.config.openai.apiKey = localConfig.openai.apiKey;
            }
            // Save to localStorage as backup
            this.saveToStorage();
            
            // If Supabase is configured, initialize it immediately
            if (this.isSupabaseConfigured() && typeof initializeSupabase === 'function') {
                // Wait a tick to ensure supabase-client.js is loaded
                setTimeout(() => {
                    initializeSupabase();
                }, 0);
            }
            // Always notify that config is loaded (even if Supabase isn't configured)
            this.notifyConfigLoaded();
        }
    }
    
    loadFromPublicConfig() {
        // This is called after loadFromLocalConfig
        // Only load from public config if we don't already have config from local
        if (!this.loaded && typeof window !== 'undefined' && window.COFFEE_CLUB_CONFIG) {
            const publicConfig = window.COFFEE_CLUB_CONFIG;
            // Only use public config if we don't have config yet
            if (publicConfig.supabase?.url && publicConfig.supabase?.anonKey) {
                // Check if anonKey is not a placeholder
                if (publicConfig.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' && 
                    publicConfig.supabase.anonKey !== '') {
                    this.config.supabase.url = publicConfig.supabase.url;
                    this.config.supabase.anonKey = publicConfig.supabase.anonKey;
                    this.loaded = true;
                }
            }
            if (publicConfig.stripe?.publishableKey && 
                publicConfig.stripe.publishableKey !== 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE') {
                this.config.stripe.publishableKey = publicConfig.stripe.publishableKey;
            }
            if (publicConfig.openai?.apiKey && 
                publicConfig.openai.apiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
                this.config.openai.apiKey = publicConfig.openai.apiKey;
            }
            // Save to localStorage as backup
            if (this.loaded) {
                this.saveToStorage();
                
                // If Supabase is configured, initialize it immediately
                if (this.isSupabaseConfigured() && typeof initializeSupabase === 'function') {
                    // Wait a tick to ensure supabase-client.js is loaded
                    setTimeout(() => {
                        initializeSupabase();
                    }, 0);
                }
                // Always notify that config is loaded
                this.notifyConfigLoaded();
            }
        }
    }
    
    notifyConfigLoaded() {
        // Dispatch event to notify that config has been loaded
        window.dispatchEvent(new CustomEvent('configLoaded', { 
            detail: { configured: this.isSupabaseConfigured() } 
        }));
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
            if (!client) {
                return false;
            }
            
            const { data, error } = await client
                .from('site_config')
                .select('config_key, config_value')
                .in('config_key', ['supabase_url', 'supabase_anon_key', 'stripe_publishable_key']);

            // Handle 404 - table doesn't exist, which is fine
            if (error) {
                if (error.code === 'PGRST116' || error.message?.includes('does not exist') || 
                    error.message?.includes('404') || error.code === '42P01') {
                    // Table doesn't exist - this is fine, just use localStorage/config.local.js
                    // Don't log as error, just return false silently
                    return false;
                }
                // Other errors - log but don't retry
                console.warn('Error loading config from database:', error.message);
                return false;
            }

            if (data && data.length > 0) {
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
                    // Don't reinitialize Supabase here - it's already initialized
                    // Just notify that config is loaded
                    this.notifyConfigLoaded();
                }
                return true;
            }
        } catch (e) {
            // Handle network errors or other exceptions gracefully
            if (e.message?.includes('404') || e.message?.includes('does not exist') || 
                e.message?.includes('Failed to fetch')) {
                // Table doesn't exist or network error - this is fine
                return false;
            }
            console.warn('Error loading config from database:', e.message);
        }
        return false;
    }

    loadFromStorage() {
        // Load from localStorage as fallback
        try {
            const stored = localStorage.getItem('coffeeClubConfig');
            if (stored) {
                const parsed = JSON.parse(stored);
                let configLoaded = false;
                if (parsed.supabase?.url) {
                    this.config.supabase.url = parsed.supabase.url;
                    configLoaded = true;
                }
                if (parsed.supabase?.anonKey) {
                    this.config.supabase.anonKey = parsed.supabase.anonKey;
                    configLoaded = true;
                }
                if (parsed.stripe?.publishableKey) {
                    this.config.stripe.publishableKey = parsed.stripe.publishableKey;
                }
                if (configLoaded && this.isSupabaseConfigured()) {
                    this.loaded = true;
                    // Initialize Supabase if config is valid
                    if (typeof initializeSupabase === 'function') {
                        // Wait a tick to ensure supabase-client.js is loaded
                        setTimeout(() => {
                            initializeSupabase();
                            this.notifyConfigLoaded();
                        }, 0);
                    } else {
                        this.notifyConfigLoaded();
                    }
                } else {
                    // Still notify even if not configured, so UI can update
                    this.notifyConfigLoaded();
                }
            } else {
                // No config found, notify anyway so UI knows
                this.notifyConfigLoaded();
            }
        } catch (e) {
            console.error('Error loading config from storage:', e);
            this.notifyConfigLoaded();
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

