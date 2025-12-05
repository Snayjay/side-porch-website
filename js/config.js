// Configuration and Secrets Management
// This file handles API keys and configuration securely
// API keys are loaded from config.local.js (gitignored) or environment

class ConfigManager {
    constructor() {
        this.config = {
            supabase: {
                url: null, // Will be loaded from config.local.js
                anonKey: null
            },
            stripe: {
                publishableKey: null
            }
        };
        this.loadFromSecureConfig();
    }

    loadFromSecureConfig() {
        // Load from localStorage (secure browser storage)
        // Keys are entered via the secrets dialog and never exposed in code
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

