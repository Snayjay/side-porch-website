// Authentication Module
// Handles user authentication with email and password

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.loadUserFromStorage();
    }

    async signUpWithEmail(email, password, userData = {}) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        try {
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: userData,
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) throw error;
            
            // Note: user will be null if email confirmation is required
            // Check if email confirmation is needed
            const needsConfirmation = !data.user && !data.session;
            
            return { 
                success: true, 
                user: data.user,
                session: data.session,
                needsEmailConfirmation: needsConfirmation,
                message: needsConfirmation 
                    ? 'Please check your email to confirm your account before signing in.'
                    : 'Account created successfully!'
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithEmail(email, password) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            
            this.currentUser = data.user;
            this.saveUserToStorage();
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            // Sign out from Supabase (this should clear Supabase's session storage)
            const { error } = await client.auth.signOut();
            if (error) throw error;
            
            // Clear our custom storage
            this.currentUser = null;
            localStorage.removeItem('coffeeClubUser');
            localStorage.removeItem('coffeeClubLastActivity');
            
            // Clear all Supabase-related storage keys
            // Supabase stores sessions in localStorage with keys like: sb-<project-ref>-auth-token
            const supabaseKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
                    supabaseKeys.push(key);
                }
            }
            supabaseKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Also clear sessionStorage (Supabase might use it)
            const sessionStorageKeys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
                    sessionStorageKeys.push(key);
                }
            }
            sessionStorageKeys.forEach(key => {
                sessionStorage.removeItem(key);
            });
            
            // Dispatch sign out event
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
            
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            // Even if Supabase signOut fails, clear local storage
            this.currentUser = null;
            localStorage.removeItem('coffeeClubUser');
            localStorage.removeItem('coffeeClubLastActivity');
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        const client = getSupabaseClient();
        if (!client) {
            return null;
        }

        try {
            // First, try to get the session (this restores it from storage if available)
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            
            if (sessionError) {
                console.warn('Get session error:', sessionError);
                // If there's an error getting session, clear any stale local storage
                this.currentUser = null;
                localStorage.removeItem('coffeeClubUser');
                return null;
            }
            
            // If we have a valid session, use the user from it
            if (session?.user) {
                // Verify the session is still valid by checking expiration
                if (session.expires_at && session.expires_at * 1000 < Date.now()) {
                    // Session expired, sign out
                    console.log('Session expired, signing out');
                    await this.signOut();
                    return null;
                }
                this.currentUser = session.user;
                this.saveUserToStorage();
                return session.user;
            }
            
            // If no session, clear local storage and return null
            this.currentUser = null;
            localStorage.removeItem('coffeeClubUser');
            return null;
        } catch (error) {
            // AuthSessionMissingError is expected when no user is signed in - don't log it
            if (error?.message?.includes('Auth session missing') || error?.name === 'AuthSessionMissingError') {
                // This is normal - no user is signed in, clear any stale data
                this.currentUser = null;
                localStorage.removeItem('coffeeClubUser');
                return null;
            }
            // Log other unexpected errors
            console.error('Get user error:', error);
            // On error, clear stale data
            this.currentUser = null;
            localStorage.removeItem('coffeeClubUser');
            return null;
        }
    }

    isEmailVerified() {
        if (!this.currentUser) return false;
        // Check if email is confirmed
        return this.currentUser.email_confirmed_at !== null && this.currentUser.email_confirmed_at !== undefined;
    }

    loadUserFromStorage() {
        try {
            const stored = localStorage.getItem('coffeeClubUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading user from storage:', e);
        }
    }

    saveUserToStorage() {
        try {
            if (this.currentUser) {
                localStorage.setItem('coffeeClubUser', JSON.stringify(this.currentUser));
            }
        } catch (e) {
            console.error('Error saving user to storage:', e);
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Global auth instance
const authManager = new AuthManager();

// Initialize auth state on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (configManager.isSupabaseConfigured()) {
            await authManager.getCurrentUser();
        }
    });
} else {
    if (configManager.isSupabaseConfigured()) {
        authManager.getCurrentUser();
    }
}

// Listen for auth state changes
window.addEventListener('supabaseReady', async () => {
    const client = getSupabaseClient();
    if (client) {
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                authManager.currentUser = session.user;
                authManager.saveUserToStorage();
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: session.user } }));
            } else if (event === 'SIGNED_OUT') {
                authManager.currentUser = null;
                localStorage.removeItem('coffeeClubUser');
                localStorage.removeItem('coffeeClubLastActivity');
                
                // Clear all Supabase-related storage keys
                const supabaseKeys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
                        supabaseKeys.push(key);
                    }
                }
                supabaseKeys.forEach(key => {
                    localStorage.removeItem(key);
                });
                
                // Also clear sessionStorage
                const sessionStorageKeys = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
                        sessionStorageKeys.push(key);
                    }
                }
                sessionStorageKeys.forEach(key => {
                    sessionStorage.removeItem(key);
                });
                
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
            }
        });
    }
});

