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
            const { error } = await client.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            localStorage.removeItem('coffeeClubUser');
            localStorage.removeItem('coffeeClubLastActivity');
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
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
            }
            
            // If we have a session, use the user from it
            if (session?.user) {
                this.currentUser = session.user;
                this.saveUserToStorage();
                return session.user;
            }
            
            // If no session, try getUser() as fallback
            const { data: { user }, error } = await client.auth.getUser();
            if (error) throw error;
            
            if (user) {
                this.currentUser = user;
                this.saveUserToStorage();
            }
            return user;
        } catch (error) {
            // AuthSessionMissingError is expected when no user is signed in - don't log it
            if (error?.message?.includes('Auth session missing') || error?.name === 'AuthSessionMissingError') {
                // This is normal - no user is signed in
                return null;
            }
            // Log other unexpected errors
            console.error('Get user error:', error);
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
                window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
            }
        });
    }
});

