// Supabase Client Setup
// This module initializes and exports the Supabase client

let supabaseClient = null;

function initializeSupabase() {
    const config = configManager.getSupabaseConfig();
    
    if (!config.url || !config.anonKey) {
        console.warn('Supabase not configured. Please set API keys in the secrets dialog.');
        return null;
    }

    // Load Supabase JS library dynamically if not already loaded
    if (typeof supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = () => {
            supabaseClient = supabase.createClient(config.url, config.anonKey);
            window.dispatchEvent(new CustomEvent('supabaseReady'));
        };
        document.head.appendChild(script);
        return null;
    } else {
        supabaseClient = supabase.createClient(config.url, config.anonKey);
        return supabaseClient;
    }
}

function getSupabaseClient() {
    if (!supabaseClient) {
        return initializeSupabase();
    }
    return supabaseClient;
}

// Initialize on load if config is available
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (configManager.isSupabaseConfigured()) {
            initializeSupabase();
        }
    });
} else {
    if (configManager.isSupabaseConfigured()) {
        initializeSupabase();
    }
}

