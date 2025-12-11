// Navigation Admin Link Visibility Handler
// Updates the Staff link visibility based on user's staff role
// This should be included on all pages to ensure consistent admin link visibility

(function() {
    async function updateAdminLinkVisibility() {
        // Wait for required dependencies
        if (typeof adminManager === 'undefined' || typeof configManager === 'undefined') {
            // Wait a bit and try again
            setTimeout(updateAdminLinkVisibility, 100);
            return;
        }

        // Only proceed if Supabase is configured
        if (!configManager.isSupabaseConfigured()) {
            // Hide admin links if Supabase isn't configured
            document.querySelectorAll('.admin-nav-link').forEach(link => {
                link.style.display = 'none';
            });
            return;
        }

        try {
            // Ensure user is authenticated
            if (typeof authManager !== 'undefined') {
                const user = await authManager.getCurrentUser();
                if (!user) {
                    // No user, hide admin links
                    document.querySelectorAll('.admin-nav-link').forEach(link => {
                        link.style.display = 'none';
                    });
                    return;
                }
            }

            // Clear role cache to ensure we get the latest role from database
            if (adminManager.clearRoleCache) {
                adminManager.clearRoleCache();
            }
            
            console.log('Checking staff role for admin link visibility...');
            
            // Check if user is staff (force refresh)
            const isStaff = await adminManager.isStaff();
            
            console.log('Staff role check result:', isStaff);
            
            // Update all admin nav links
            const adminLinks = document.querySelectorAll('.admin-nav-link');
            console.log('Found admin links:', adminLinks.length);
            
            adminLinks.forEach(link => {
                if (isStaff) {
                    link.style.display = '';
                    console.log('Showing admin link');
                } else {
                    link.style.display = 'none';
                    console.log('Hiding admin link');
                }
            });
        } catch (error) {
            console.error('Error updating admin link visibility:', error);
            // On error, hide admin links for security
            document.querySelectorAll('.admin-nav-link').forEach(link => {
                link.style.display = 'none';
            });
        }
    }
    
    // Run when DOM is ready and dependencies are available
    function init() {
        console.log('nav-admin-link.js: Initializing...');
        
        // Wait for config to be loaded
        if (typeof configManager === 'undefined') {
            console.log('nav-admin-link.js: Waiting for configManager...');
            setTimeout(init, 100);
            return;
        }

        console.log('nav-admin-link.js: configManager found, Supabase configured:', configManager.isSupabaseConfigured());

        // If Supabase is already configured, run immediately
        if (configManager.isSupabaseConfigured()) {
            console.log('nav-admin-link.js: Supabase already configured, checking admin link visibility...');
            updateAdminLinkVisibility();
        }

        // Listen for config loaded
        window.addEventListener('configLoaded', () => {
            console.log('nav-admin-link.js: configLoaded event fired');
            if (configManager.isSupabaseConfigured()) {
                updateAdminLinkVisibility();
            }
        });

        // Listen for Supabase ready
        window.addEventListener('supabaseReady', () => {
            console.log('nav-admin-link.js: supabaseReady event fired');
            updateAdminLinkVisibility();
        });

        // Listen for auth state changes
        window.addEventListener('authStateChanged', () => {
            console.log('nav-admin-link.js: authStateChanged event fired');
            updateAdminLinkVisibility();
        });
    }
    
    // Make function globally available for manual calls
    window.updateAdminLinkVisibility = updateAdminLinkVisibility;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

