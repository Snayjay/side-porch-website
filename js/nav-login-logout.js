// Navigation Login/Logout Text Handler
// Updates the Login link to show "Logout" when user is logged in

(function() {
    function updateLoginLogoutText() {
        const loginLink = document.querySelector('.nav-links a[href="login.html"]');
        if (!loginLink) return;
        
        // Check if user is authenticated
        if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
            loginLink.textContent = 'Logout';
            loginLink.href = '#'; // Prevent navigation, will handle logout via onclick
            loginLink.onclick = async function(e) {
                e.preventDefault();
                if (typeof coffeeClubApp !== 'undefined' && coffeeClubApp.signOut) {
                    await coffeeClubApp.signOut();
                } else if (typeof authManager !== 'undefined' && authManager.signOut) {
                    await authManager.signOut();
                }
                // Redirect to home after logout
                window.location.href = 'index.html';
            };
        } else {
            loginLink.textContent = 'Login';
            loginLink.href = 'login.html';
            loginLink.onclick = null;
        }
    }
    
    // Run when DOM is ready and auth is available
    function init() {
        if (typeof authManager !== 'undefined') {
            updateLoginLogoutText();
            
            // Also listen for auth state changes
            window.addEventListener('authStateChanged', updateLoginLogoutText);
        } else {
            // Wait for authManager to be available
            setTimeout(init, 100);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

