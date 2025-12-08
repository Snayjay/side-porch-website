// Supabase Client Setup
// This module initializes and exports the Supabase client

let supabaseClient = null;
let initializing = false;
let supabaseReadyDispatched = false;

function initializeSupabase() {
    // Prevent multiple simultaneous initializations
    if (initializing) {
        return supabaseClient;
    }
    
    // If client already exists, return it
    if (supabaseClient) {
        // Ensure event is dispatched if it hasn't been yet
        if (!supabaseReadyDispatched) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
                supabaseReadyDispatched = true;
            }, 0);
        }
        return supabaseClient;
    }
    
    const config = configManager.getSupabaseConfig();
    
    if (!config.url || !config.anonKey) {
        console.warn('Supabase not configured. Please set API keys in the secrets dialog.');
        return null;
    }

    initializing = true;

    // Load Supabase JS library dynamically if not already loaded
    if (typeof supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        script.onload = () => {
            supabaseClient = supabase.createClient(config.url, config.anonKey);
            initializing = false;
            supabaseReadyDispatched = true;
            window.dispatchEvent(new CustomEvent('supabaseReady'));
        };
        script.onerror = () => {
            console.error('Failed to load Supabase library');
            initializing = false;
        };
        document.head.appendChild(script);
        return null;
    } else {
        // Supabase library already loaded, create client immediately
        supabaseClient = supabase.createClient(config.url, config.anonKey);
        initializing = false;
        // Dispatch event asynchronously to ensure listeners are set up
        if (!supabaseReadyDispatched) {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('supabaseReady'));
                supabaseReadyDispatched = true;
            }, 0);
        }
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

