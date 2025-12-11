// Coffee Club App - Main application logic
// Handles UI updates and component coordination

class CoffeeClubApp {
    constructor() {
        this.inactivityTimer = null;
        this.inactivityTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.lastActivityTime = Date.now();
        this.init();
    }

    async init() {
        // Configuration check - if not configured, app will show appropriate messages

        // Setup inactivity monitoring
        this.setupInactivityMonitoring();

        // Setup auth UI immediately
        this.setupAuthUI();
        this.setupFundingUI();

        // Helper function to initialize authenticated state
        const initializeAuthenticatedState = async () => {
            this.setupAuthUI();
            this.setupAccountUI();
            
            // Check if already authenticated and verified
            try {
                const user = await authManager.getCurrentUser();
                if (user) {
                    this.handleAuthStateChange(user);
                }
            } catch (error) {
                console.error('Error checking auth state:', error);
            }
        };

        // Listen for config to be loaded and update UI accordingly
        window.addEventListener('configLoaded', () => {
            this.setupAuthUI();
            if (configManager.isSupabaseConfigured()) {
                // Wait for Supabase to be ready
                window.addEventListener('supabaseReady', initializeAuthenticatedState, { once: true });

                // Fallback: Check if Supabase is already ready (in case event fired before listener was added)
                setTimeout(async () => {
                    const client = getSupabaseClient();
                    if (client) {
                        // Supabase is ready, initialize state
                        await initializeAuthenticatedState();
                    }
                }, 200);
            }
        }, { once: true });

        // Also check if config is already loaded (in case event fired before listener was added)
        if (configManager.isSupabaseConfigured()) {
            // Wait for Supabase to be ready
            window.addEventListener('supabaseReady', initializeAuthenticatedState, { once: true });

            // Fallback: Check if Supabase is already ready
            setTimeout(async () => {
                const client = getSupabaseClient();
                if (client) {
                    // Supabase is ready, initialize state
                    await initializeAuthenticatedState();
                }
            }, 200);
        }

        // Listen for auth state changes
        window.addEventListener('authStateChanged', (event) => {
            this.handleAuthStateChange(event.detail.user);
        });

        // Listen for account updates
        window.addEventListener('accountUpdated', () => {
            this.updateAccountDisplay();
        });
    }

    setupAuthUI() {
        const authContainer = document.getElementById('auth-container');
        const authSection = document.getElementById('auth-section');
        
        // If on coffee-club.html and not authenticated, redirect to login page
        if (window.location.pathname.includes('coffee-club.html') || window.location.pathname.endsWith('coffee-club.html')) {
            if (!authManager.isAuthenticated()) {
                // Redirect to login page with return URL
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `login.html?return=${returnUrl}`;
                return;
            }
        }
        
        if (!authContainer) return;

        if (authManager.isAuthenticated()) {
            authContainer.innerHTML = `
                <div style="text-align: center;">
                    <p style="margin-bottom: 1rem;">Signed in as: <strong>${authManager.currentUser.email}</strong></p>
                    <button class="btn btn-secondary" onclick="coffeeClubApp.signOut()">Sign Out</button>
                </div>
            `;
            return;
        }

        const configWarning = !configManager.isSupabaseConfigured() ? `
            <div style="background: rgba(160, 82, 45, 0.1); border: 1px solid var(--auburn); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="text-align: center;">
                    <p style="color: var(--auburn); margin: 0 0 1rem 0; font-weight: 600;">
                        ⚠️ Coffee Club is not configured
                    </p>
                    <p style="color: var(--text-dark); margin: 0 0 1rem 0; font-size: 0.9rem;">
                        Please configure your API keys to use Coffee Club features.
                    </p>
                    <button class="btn" onclick="secretsDialog.show()" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
                        🔐 Configure API Keys
                    </button>
                </div>
            </div>
        ` : '';

        authContainer.innerHTML = configWarning + `
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="coffeeClubApp.showAuthTab('signin')">Sign In</button>
                <button class="auth-tab" onclick="coffeeClubApp.showAuthTab('signup')">Sign Up</button>
            </div>
            <div id="signin-form" class="auth-form">
                <div class="form-group">
                    <label for="signin-email">Email</label>
                    <div id="signin-email-container"></div>
                </div>
                <div class="form-group">
                    <label for="signin-password">Password</label>
                    <div id="signin-password-container"></div>
                </div>
                <button class="btn" onclick="coffeeClubApp.signIn()">Sign In</button>
            </div>
            <div id="signup-form" class="auth-form" style="display: none;">
                <div class="form-group">
                    <label for="signup-name">Full Name (optional)</label>
                    <div id="signup-name-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <div id="signup-email-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <div id="signup-password-container"></div>
                </div>
                <button class="btn" onclick="coffeeClubApp.signUp()">Sign Up</button>
            </div>
        `;
        
        // Create input fields dynamically after a delay to prevent autofill
        setTimeout(() => {
            this.createAuthInputs();
        }, 100);
    }

    createAuthInputs() {
        // Create sign-in email field
        const signinEmailContainer = document.getElementById('signin-email-container');
        if (signinEmailContainer && !signinEmailContainer.querySelector('input')) {
            const emailInput = document.createElement('input');
            emailInput.type = 'text';
            emailInput.id = 'signin-email';
            emailInput.setAttribute('data-auth-field', 'email');
            emailInput.placeholder = 'your@email.com';
            emailInput.autocomplete = 'off';
            emailInput.style.cssText = 'width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            emailInput.addEventListener('focus', function() {
                this.type = 'email';
            });
            signinEmailContainer.appendChild(emailInput);
        }

        // Create sign-in password field with show/hide toggle
        const signinPasswordContainer = document.getElementById('signin-password-container');
        if (signinPasswordContainer && !signinPasswordContainer.querySelector('#signin-password')) {
            // Create wrapper for password input and toggle button
            const passwordWrapper = document.createElement('div');
            passwordWrapper.style.cssText = 'position: relative; width: 100%;';
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'signin-password';
            passwordInput.setAttribute('data-auth-field', 'password');
            passwordInput.placeholder = 'Password';
            passwordInput.autocomplete = 'new-password';
            passwordInput.style.cssText = 'width: 100%; padding: 0.9rem 3rem 0.9rem 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            
            // Create toggle button
            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.setAttribute('aria-label', 'Show password');
            toggleButton.style.cssText = 'position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--text-dark); opacity: 0.6; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center;';
            toggleButton.innerHTML = `
                <svg id="signin-password-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
            
            toggleButton.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                const icon = toggleButton.querySelector('svg');
                if (isPassword) {
                    // Show eye-off icon
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    `;
                    toggleButton.setAttribute('aria-label', 'Hide password');
                } else {
                    // Show eye icon
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                    toggleButton.setAttribute('aria-label', 'Show password');
                }
            });
            
            toggleButton.addEventListener('mouseenter', () => {
                toggleButton.style.opacity = '1';
            });
            
            toggleButton.addEventListener('mouseleave', () => {
                toggleButton.style.opacity = '0.6';
            });
            
            passwordWrapper.appendChild(passwordInput);
            passwordWrapper.appendChild(toggleButton);
            signinPasswordContainer.appendChild(passwordWrapper);
        }

        // Create sign-up name field
        const signupNameContainer = document.getElementById('signup-name-container');
        if (signupNameContainer && !signupNameContainer.querySelector('input')) {
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = 'signup-name';
            nameInput.setAttribute('data-auth-field', 'name');
            nameInput.placeholder = 'Your name';
            nameInput.autocomplete = 'off';
            nameInput.style.cssText = 'width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            signupNameContainer.appendChild(nameInput);
        }

        // Create sign-up email field
        const signupEmailContainer = document.getElementById('signup-email-container');
        if (signupEmailContainer && !signupEmailContainer.querySelector('input')) {
            const emailInput = document.createElement('input');
            emailInput.type = 'text';
            emailInput.id = 'signup-email';
            emailInput.setAttribute('data-auth-field', 'email');
            emailInput.placeholder = 'your@email.com';
            emailInput.autocomplete = 'off';
            emailInput.style.cssText = 'width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            emailInput.addEventListener('focus', function() {
                this.type = 'email';
            });
            signupEmailContainer.appendChild(emailInput);
        }

        // Create sign-up password field with show/hide toggle
        const signupPasswordContainer = document.getElementById('signup-password-container');
        if (signupPasswordContainer && !signupPasswordContainer.querySelector('#signup-password')) {
            // Create wrapper for password input and toggle button
            const passwordWrapper = document.createElement('div');
            passwordWrapper.style.cssText = 'position: relative; width: 100%;';
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'signup-password';
            passwordInput.setAttribute('data-auth-field', 'password');
            passwordInput.placeholder = 'Password (min 6 characters)';
            passwordInput.autocomplete = 'new-password';
            passwordInput.style.cssText = 'width: 100%; padding: 0.9rem 3rem 0.9rem 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            
            // Create toggle button
            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.setAttribute('aria-label', 'Show password');
            toggleButton.style.cssText = 'position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0.5rem; color: var(--text-dark); opacity: 0.6; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center;';
            toggleButton.innerHTML = `
                <svg id="signup-password-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
            
            toggleButton.addEventListener('click', () => {
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';
                const icon = toggleButton.querySelector('svg');
                if (isPassword) {
                    // Show eye-off icon
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    `;
                    toggleButton.setAttribute('aria-label', 'Hide password');
                } else {
                    // Show eye icon
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                    toggleButton.setAttribute('aria-label', 'Show password');
                }
            });
            
            toggleButton.addEventListener('mouseenter', () => {
                toggleButton.style.opacity = '1';
            });
            
            toggleButton.addEventListener('mouseleave', () => {
                toggleButton.style.opacity = '0.6';
            });
            
            passwordWrapper.appendChild(passwordInput);
            passwordWrapper.appendChild(toggleButton);
            signupPasswordContainer.appendChild(passwordWrapper);
        }
    }

    showAuthTab(tab) {
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        const tabs = document.querySelectorAll('.auth-tab');

        tabs.forEach(t => t.classList.remove('active'));

        if (tab === 'signin') {
            signinForm.style.display = 'block';
            signupForm.style.display = 'none';
            tabs[0].classList.add('active');
        } else {
            signinForm.style.display = 'none';
            signupForm.style.display = 'block';
            tabs[1].classList.add('active');
            // Ensure inputs are created when switching to signup
            setTimeout(() => {
                this.createAuthInputs();
            }, 50);
        }
    }

    async signIn() {
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value.trim();

        if (!email || !password) {
            errorDialog.show('Please enter email and password', 'Missing Information');
            return { success: false, error: 'Missing email or password' };
        }

        if (!this.validateEmail(email)) {
            errorDialog.show('Please enter a valid email address with a proper domain (e.g., name@example.com)', 'Invalid Email Format');
            return { success: false, error: 'Invalid email format' };
        }

        const result = await authManager.signInWithEmail(email, password);
        if (result.success) {
            this.handleAuthStateChange(result.user);
            return { success: true, user: result.user };
        } else {
            // Show more helpful error message for email verification
            if (result.needsEmailVerification) {
                this.showEmailVerificationMessage(email);
            } else {
                errorDialog.show(result.error || 'Sign in failed. Please check your credentials and try again.', 'Sign In Failed');
            }
            return { success: false, error: result.error };
        }
    }

    validateEmail(email) {
        // Email validation regex - checks for proper format including TLD
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async signUp() {
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        
        if (!email || !password) {
            errorDialog.show('Please enter email and password', 'Missing Information');
            return;
        }

        if (!this.validateEmail(email)) {
            errorDialog.show('Please enter a valid email address with a proper domain (e.g., name@example.com)', 'Invalid Email Format');
            return;
        }

        if (password.length < 6) {
            errorDialog.show('Password must be at least 6 characters', 'Invalid Password');
            return;
        }

        const userData = name ? { full_name: name } : {};
        const result = await authManager.signUpWithEmail(email, password, userData);
        
        if (result.success) {
            if (result.needsEmailConfirmation || !result.user) {
                // Email confirmation required - show verification message and sign-in form
                this.showEmailVerificationMessage(email);
            } else if (result.user && authManager.isEmailVerified()) {
                // Email verification disabled or already verified
                this.handleAuthStateChange(result.user);
            } else {
                // User created but email not verified
                this.showEmailVerificationMessage(email);
            }
        } else {
            errorDialog.show(result.error || 'Sign up failed. Please try again.', 'Sign Up Failed');
        }
    }

    showEmailVerificationMessage(email) {
        const authSection = document.getElementById('auth-section');
        const authContainer = document.getElementById('auth-container');
        const menuCartSection = document.getElementById('menu-cart-section');
        if (!authSection || !authContainer) return;

        // Show auth section and hide account sections
        authSection.style.display = 'block';
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('account-section').style.display = 'none';
        document.getElementById('funding-section').style.display = 'none';
        document.getElementById('order-history-section').style.display = 'none';
        if (menuCartSection) menuCartSection.style.display = 'none'; // Hide menu and cart
        
        const configWarning = !configManager.isSupabaseConfigured() ? `
            <div style="background: rgba(160, 82, 45, 0.1); border: 1px solid var(--auburn); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="text-align: center;">
                    <p style="color: var(--auburn); margin: 0 0 1rem 0; font-weight: 600;">
                        ⚠️ Coffee Club is not configured
                    </p>
                    <p style="color: var(--text-dark); margin: 0 0 1rem 0; font-size: 0.9rem;">
                        Please configure your API keys to use Coffee Club features.
                    </p>
                    <button class="btn" onclick="secretsDialog.show()" style="padding: 0.75rem 1.5rem; font-size: 0.95rem;">
                        🔐 Configure API Keys
                    </button>
                </div>
            </div>
        ` : '';

        authContainer.innerHTML = configWarning + `
            <div style="background: rgba(160, 82, 45, 0.1); border: 2px solid var(--auburn); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📧</div>
                    <h3 style="color: var(--auburn); margin-bottom: 1rem;">Email Verification Required</h3>
                    <p style="color: var(--text-dark); margin-bottom: 1rem; line-height: 1.6;">
                        We've sent a confirmation email to <strong>${email}</strong>
                    </p>
                    <p style="color: var(--text-dark); margin-bottom: 1rem; line-height: 1.6;">
                        Please click the link in the email to verify your account before you can access Coffee Club features.
                    </p>
                    <p style="color: var(--auburn); font-size: 0.9rem; margin-top: 1rem;">
                        ⚠️ Didn't receive the email? Check your spam folder or try signing up again.
                    </p>
                </div>
            </div>
            <div class="auth-tabs">
                <button class="auth-tab active" onclick="coffeeClubApp.showAuthTab('signin')">Sign In</button>
                <button class="auth-tab" onclick="coffeeClubApp.showAuthTab('signup')">Sign Up</button>
            </div>
            <div id="signin-form" class="auth-form">
                <div class="form-group">
                    <label for="signin-email">Email</label>
                    <div id="signin-email-container"></div>
                </div>
                <div class="form-group">
                    <label for="signin-password">Password</label>
                    <div id="signin-password-container"></div>
                </div>
                <button class="btn" onclick="coffeeClubApp.signIn()">Sign In</button>
            </div>
            <div id="signup-form" class="auth-form" style="display: none;">
                <div class="form-group">
                    <label for="signup-name">Full Name (optional)</label>
                    <div id="signup-name-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-email">Email</label>
                    <div id="signup-email-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <div id="signup-password-container"></div>
                </div>
                <button class="btn" onclick="coffeeClubApp.signUp()">Sign Up</button>
            </div>
        `;
        
        // Create input fields
        setTimeout(() => {
            this.createAuthInputs();
        }, 100);
    }

    setupInactivityMonitoring() {
        // Reset inactivity timer on any user activity
        const resetTimer = () => {
            if (authManager.isAuthenticated()) {
                this.lastActivityTime = Date.now();
                localStorage.setItem('coffeeClubLastActivity', this.lastActivityTime.toString());
                this.clearInactivityTimer();
                this.startInactivityTimer();
            }
        };

        // Listen for user activity events
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        // Handle page visibility changes (tab switch, minimize, etc.)
        document.addEventListener('visibilitychange', () => {
            if (!authManager.isAuthenticated()) return;
            
            if (document.hidden) {
                // Page is hidden - check if we should logout
                const timeSinceLastActivity = Date.now() - this.lastActivityTime;
                if (timeSinceLastActivity >= this.inactivityTimeout) {
                    this.autoLogout('Session expired due to inactivity');
                }
            } else {
                // Page is visible again - check session validity
                const storedLastActivity = localStorage.getItem('coffeeClubLastActivity');
                if (storedLastActivity) {
                    const timeSinceLastActivity = Date.now() - parseInt(storedLastActivity);
                    if (timeSinceLastActivity >= this.inactivityTimeout) {
                        this.autoLogout('Session expired due to inactivity');
                    } else {
                        this.lastActivityTime = Date.now();
                        resetTimer();
                    }
                }
            }
        });

        // Handle browser close/tab close - store last activity time
        window.addEventListener('beforeunload', () => {
            if (authManager.isAuthenticated()) {
                localStorage.setItem('coffeeClubLastActivity', this.lastActivityTime.toString());
            }
        });

        // Check session validity on page load
        this.checkSessionOnLoad();

        // Start the inactivity timer if user is authenticated
        if (authManager.isAuthenticated()) {
            this.startInactivityTimer();
        }
    }

    checkSessionOnLoad() {
        // Check if session expired while browser was closed
        const storedLastActivity = localStorage.getItem('coffeeClubLastActivity');
        if (storedLastActivity && authManager.isAuthenticated()) {
            const timeSinceLastActivity = Date.now() - parseInt(storedLastActivity);
            if (timeSinceLastActivity >= this.inactivityTimeout) {
                // Session expired - logout
                this.autoLogout('Session expired. Please sign in again.');
            } else {
                // Update last activity time
                this.lastActivityTime = Date.now();
            }
        }
    }

    startInactivityTimer() {
        if (!authManager.isAuthenticated()) {
            return;
        }

        this.clearInactivityTimer();
        
        // Check every 30 seconds if we should logout
        this.inactivityTimer = setInterval(() => {
            if (!authManager.isAuthenticated()) {
                this.clearInactivityTimer();
                return;
            }
            
            const timeSinceLastActivity = Date.now() - this.lastActivityTime;
            
            if (timeSinceLastActivity >= this.inactivityTimeout) {
                this.autoLogout('You have been automatically signed out due to inactivity for security reasons.');
            }
        }, 30000); // Check every 30 seconds
    }

    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearInterval(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    async autoLogout(message) {
        this.clearInactivityTimer();
        
        // Sign out first
        const result = await authManager.signOut();
        if (result.success) {
            this.handleAuthStateChange(null);
            coffeeClubMenu.clearCart();
            localStorage.removeItem('coffeeClubLastActivity');
            
            // Show message to user, then redirect to login
            if (message) {
                errorDialog.show(message, 'Session Expired', 'error', 0, () => {
                    // Callback when OK is clicked - redirect to login
                    const returnUrl = encodeURIComponent(window.location.href);
                    window.location.href = `login.html?return=${returnUrl}`;
                });
            } else {
                // If no message, redirect immediately
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `login.html?return=${returnUrl}`;
            }
        }
    }

    async signOut() {
        this.clearInactivityTimer();
        const result = await authManager.signOut();
        if (result.success) {
            this.handleAuthStateChange(null);
            coffeeClubMenu.clearCart();
            localStorage.removeItem('coffeeClubLastActivity');
        } else {
            errorDialog.show(result.error || 'Sign out failed. Please try again.', 'Sign Out Failed');
        }
    }

    async handleAuthStateChange(user) {
        const menuCartSection = document.getElementById('menu-cart-section');
        
        if (user) {
            // Check if email is verified
            if (!authManager.isEmailVerified()) {
                // User exists but email not verified - show verification message and sign-in form
                document.getElementById('auth-section').style.display = 'block';
                document.getElementById('welcome-section').style.display = 'none';
                document.getElementById('account-section').style.display = 'none';
            document.getElementById('funding-section').style.display = 'none';
            document.getElementById('order-history-section').style.display = 'none';
                if (menuCartSection) menuCartSection.style.display = 'none';
                
                this.showEmailVerificationMessage(user.email);
                return;
            }
            
            // Ensure menu is loaded when showing authenticated sections
            if (typeof coffeeClubMenu !== 'undefined' && !coffeeClubMenu.productsLoaded) {
                const client = getSupabaseClient();
                if (client) {
                    coffeeClubMenu.loadProducts();
                }
            }
            
            // User is authenticated and verified
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('welcome-section').style.display = 'block';
            document.getElementById('account-section').style.display = 'block';
            const fundingSection = document.getElementById('funding-section');
            if (fundingSection) {
                fundingSection.style.display = 'block';
                // Ensure accordion starts collapsed
                fundingSection.classList.remove('expanded');
            }
            // Transaction history is now inside the funding accordion, so no separate section to show
            document.getElementById('order-history-section').style.display = 'block';
            if (menuCartSection) menuCartSection.style.display = 'grid'; // Show menu and cart

            // Ensure menu is loaded when showing authenticated sections
            if (typeof coffeeClubMenu !== 'undefined') {
                const client = getSupabaseClient();
                if (client && (!coffeeClubMenu.productsLoaded || coffeeClubMenu.products.length === 0)) {
                    await coffeeClubMenu.loadProducts();
                }
            }

            // Reset activity timer and start monitoring
            this.lastActivityTime = Date.now();
            localStorage.setItem('coffeeClubLastActivity', this.lastActivityTime.toString());
            this.startInactivityTimer();

            await this.updateAccountDisplay();
            await this.updateOrderHistory();
            await this.updateTransactionHistory();
            await this.updateAdminLinkVisibility();
        } else {
            // User is not authenticated
            this.clearInactivityTimer();
            localStorage.removeItem('coffeeClubLastActivity');
            
            document.getElementById('auth-section').style.display = 'block';
            document.getElementById('welcome-section').style.display = 'none';
            document.getElementById('account-section').style.display = 'none';
            document.getElementById('funding-section').style.display = 'none';
            document.getElementById('order-history-section').style.display = 'none';
            if (menuCartSection) menuCartSection.style.display = 'none'; // Hide menu and cart

            this.setupAuthUI();
            this.updateAdminLinkVisibility();
        }
    }

    async updateAdminLinkVisibility() {
        // Update admin link visibility in navigation
        const adminLinks = document.querySelectorAll('.admin-nav-link');
        
        // Clear role cache to ensure we get the latest role from database
        if (adminManager.clearRoleCache) {
            adminManager.clearRoleCache();
        }
        
        const isStaff = await adminManager.isStaff();
        
        adminLinks.forEach(link => {
            if (isStaff) {
                link.style.display = '';
            } else {
                link.style.display = 'none';
            }
        });
    }

    async updateAccountDisplay() {
        const accountInfo = document.getElementById('account-info');
        const welcomeContent = document.getElementById('welcome-content');
        if (!accountInfo) return;

        const account = await accountManager.getAccount();
        const balance = account ? parseFloat(account.balance) : 0;
        
        // Get user's full name from account or user metadata
        const fullName = account?.full_name || 
                        authManager.currentUser?.user_metadata?.full_name || 
                        authManager.currentUser?.email?.split('@')[0] || 
                        'Member';
        const displayName = fullName || 'Member';

        // Update welcome section
        if (welcomeContent) {
            welcomeContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="color: var(--deep-brown); margin: 0 0 0.5rem 0; font-size: 1.8rem;">
                            Welcome back, ${displayName}! 👋
                        </h2>
                        <p style="color: var(--text-dark); margin: 0; opacity: 0.8;">
                            Ready to order your favorite coffee?
                        </p>
                    </div>
                    <button class="btn btn-secondary" onclick="coffeeClubApp.signOut()" style="white-space: nowrap;">
                        Sign Out
                    </button>
                </div>
            `;
        }

        // Update account info
        accountInfo.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div>
                    <h3 style="color: var(--deep-brown); margin-bottom: 0.5rem;">Account Balance</h3>
                    <p style="font-size: 2rem; color: var(--auburn); font-weight: 600;">$${balance.toFixed(2)}</p>
                </div>
                <div>
                    <h3 style="color: var(--deep-brown); margin-bottom: 0.5rem;">Email</h3>
                    <p style="color: var(--text-dark);">${authManager.currentUser?.email || 'N/A'}</p>
                </div>
            </div>
        `;
    }

    setupFundingUI() {
        const fundingContainer = document.getElementById('funding-container');
        if (!fundingContainer) return;

        const fundingAmounts = [10, 20, 50, 100];

        fundingContainer.innerHTML = `
            <div class="funding-amounts">
                ${fundingAmounts.map(amount => `
                    <button class="btn btn-funding" onclick="coffeeClubApp.initiateFunding(${amount})">
                        Add $${amount}
                    </button>
                `).join('')}
            </div>
            <div style="text-align: right; margin-top: 1rem;">
                <button onclick="testCardsModal.show()" style="background: none; border: none; color: var(--auburn); text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0; transition: color 0.3s ease;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                    Test Cards Reference
                </button>
            </div>
            <div id="funding-payment-form" style="display: none; margin-top: 2rem;">
                <h3>Payment Information</h3>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="billing-name">Cardholder Name *</label>
                    <input type="text" id="billing-name" placeholder="John Doe" required style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                </div>
                <div id="card-element" style="margin: 1rem 0;" autocomplete="off">
                    <!-- Stripe card element will be mounted here -->
                </div>
                <style>
                    /* Hide browser autofill suggestions on Stripe Elements */
                    #card-element iframe {
                        pointer-events: auto;
                    }
                    /* Hide autofill dropdown that browsers show */
                    input:-webkit-autofill,
                    input:-webkit-autofill:hover,
                    input:-webkit-autofill:focus {
                        -webkit-box-shadow: 0 0 0px 1000px white inset !important;
                    }
                </style>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="billing-address-line1">Billing Address Line 1 *</label>
                    <input type="text" id="billing-address-line1" placeholder="123 Main St" required style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="billing-address-line2">Billing Address Line 2</label>
                    <input type="text" id="billing-address-line2" placeholder="Apt 4B (optional)" style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="billing-city">City *</label>
                        <input type="text" id="billing-city" placeholder="City" required style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                    </div>
                    <div class="form-group">
                        <label for="billing-state">State *</label>
                        <input type="text" id="billing-state" placeholder="TX" maxlength="2" required style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                    </div>
                    <div class="form-group">
                        <label for="billing-postal-code">ZIP *</label>
                        <input type="text" id="billing-postal-code" placeholder="77840" pattern="[0-9]{5}(-[0-9]{4})?" required style="width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem;">
                    </div>
                </div>
                <div id="card-errors" style="color: var(--auburn); margin-bottom: 1rem; min-height: 1.5rem; font-size: 0.9rem; display: none;"></div>
                <button class="btn" onclick="coffeeClubApp.processFunding()">Complete Payment</button>
                <button class="btn btn-secondary" onclick="coffeeClubApp.cancelFunding()" style="margin-left: 1rem;">Cancel</button>
            </div>
        `;
    }

    toggleFundingAccordion() {
        const fundingSection = document.getElementById('funding-section');
        if (!fundingSection) return;

        const isExpanded = fundingSection.classList.contains('expanded');
        if (isExpanded) {
            fundingSection.classList.remove('expanded');
        } else {
            fundingSection.classList.add('expanded');
        }
    }

    setupAccountUI() {
        // This method can be used for additional account UI setup if needed
        // Currently handled by updateAccountDisplay()
    }

    async initiateFunding(amount) {
        if (!authManager.isAuthenticated()) {
            errorDialog.show('Please sign in to fund your account', 'Authentication Required');
            return;
        }

        if (!configManager.getStripeConfig().publishableKey) {
            errorDialog.show('Stripe not configured. Please set your Stripe publishable key in the configuration dialog.', 'Configuration Required');
            return;
        }

        this.fundingAmount = amount;
        const paymentForm = document.getElementById('funding-payment-form');
        const cardElement = document.getElementById('card-element');

        if (paymentForm && cardElement) {
            paymentForm.style.display = 'block';
            
            // Wait for Stripe to be ready
            if (!stripeManager.stripe) {
                window.addEventListener('stripeReady', () => {
                    this.initiateFunding(amount);
                }, { once: true });
                return;
            }
            
            // Initialize Stripe card element
            try {
                // Clear any existing element
                cardElement.innerHTML = '';
                stripeManager.createCardElement('card-element');
            } catch (error) {
                errorDialog.show('Error initializing payment form: ' + error.message, 'Payment Error');
                return;
            }
        }
    }

    async processFunding() {
        if (!this.fundingAmount) {
            errorDialog.show('Please select a funding amount', 'Missing Information');
            return;
        }

        // Create payment method
        const paymentMethodResult = await stripeManager.createPaymentMethod();
        if (!paymentMethodResult.success) {
            document.getElementById('card-errors').textContent = paymentMethodResult.error;
            return;
        }

        // Create payment intent - requires backend endpoint
        let paymentIntentResult;
        try {
            paymentIntentResult = await stripeManager.createPaymentIntent(
                this.fundingAmount,
                authManager.currentUser.id
            );
        } catch (error) {
            const isBackendError = error.message.includes('Backend endpoint') || 
                                  error.message.includes('endpoint not found') ||
                                  error.message.includes('Failed to fetch');
            
            if (isBackendError) {
                errorDialog.show(
                    error.message + '<br><br>' +
                    '<strong style="color: var(--auburn);">Setup Required:</strong><br>' +
                    'You need to create a backend endpoint that creates Stripe PaymentIntents. Options include:<br><br>' +
                    '• <strong>Supabase Edge Function</strong> (recommended)<br>' +
                    '• Serverless function (Vercel, Netlify, etc.)<br>' +
                    '• Your own backend API<br><br>' +
                    'The endpoint should use your Stripe secret key to create a PaymentIntent and return the client_secret.<br><br>' +
                    '📄 See <code style="background: rgba(139, 111, 71, 0.1); padding: 2px 6px; border-radius: 4px;">supabase-edge-function-example.md</code> for detailed setup instructions.',
                    'Backend Endpoint Required',
                    true // Allow HTML formatting
                );
            } else {
                errorDialog.show(error.message, 'Payment Error');
            }
            return;
        }

        // Confirm payment
        const paymentResult = await stripeManager.confirmPayment(
            paymentIntentResult.clientSecret,
            paymentMethodResult.paymentMethod.id
        );

        if (paymentResult.success) {
            // Fund account
            const fundResult = await accountManager.fundAccount(
                this.fundingAmount,
                paymentIntentResult.paymentIntentId
            );

            if (fundResult.success) {
                errorDialog.showSuccess(`Successfully added $${this.fundingAmount.toFixed(2)} to your account!`, 'Account Funded');
                this.cancelFunding();
                await this.updateAccountDisplay();
            } else {
                errorDialog.show('Error funding account: ' + (fundResult.error || 'Please try again.'), 'Funding Error');
            }
        } else {
            // Show payment error (including declined cards) in error dialog for better visibility
            const errorMessage = paymentResult.error || 'Payment failed. Please check your card details and try again.';
            errorDialog.show(errorMessage, 'Payment Failed');
            // Also show in card-errors div for inline display
            const cardErrorsDiv = document.getElementById('card-errors');
            if (cardErrorsDiv) {
                cardErrorsDiv.textContent = errorMessage;
            }
        }
    }

    cancelFunding() {
        this.fundingAmount = null;
        const paymentForm = document.getElementById('funding-payment-form');
        if (paymentForm) {
            paymentForm.style.display = 'none';
        }
        const cardElement = document.getElementById('card-element');
        if (cardElement) {
            cardElement.innerHTML = '';
        }
        const cardErrors = document.getElementById('card-errors');
        if (cardErrors) {
            cardErrors.textContent = '';
        }
        
        // Clear billing form fields
        const billingFields = ['billing-name', 'billing-address-line1', 'billing-address-line2', 
                              'billing-city', 'billing-state', 'billing-postal-code'];
        billingFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
    }

    async updateOrderHistory() {
        const orderHistoryContainer = document.getElementById('order-history-container');
        if (!orderHistoryContainer) return;

        const orderProcessor = new OrderProcessor();
        const orders = await orderProcessor.getOrderHistory(10);

        if (orders.length === 0) {
            orderHistoryContainer.innerHTML = '<p style="text-align: center; color: var(--text-dark); opacity: 0.7;">No orders yet</p>';
            return;
        }

        let html = '<div class="order-history-list">';
        orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            html += `
                <div class="order-history-item">
                    <div class="order-history-header">
                        <span><strong>Order #${order.id.substring(0, 8)}</strong></span>
                        <span>${date}</span>
                    </div>
                    <div class="order-history-total">
                        Total: $${parseFloat(order.total).toFixed(2)}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        orderHistoryContainer.innerHTML = html;
    }

    async updateTransactionHistory() {
        const transactionHistoryContainer = document.getElementById('transaction-history-container');
        if (!transactionHistoryContainer) return;

        try {
            const transactions = await accountManager.getTransactions(50);
            
            if (!transactions || transactions.length === 0) {
                transactionHistoryContainer.innerHTML = `
                    <p style="text-align: center; color: var(--text-dark); opacity: 0.7;">
                        No transactions yet. Add funds to your account to see transaction history.
                    </p>
                `;
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
            transactions.forEach(transaction => {
                const date = new Date(transaction.created_at).toLocaleString();
                const amount = parseFloat(transaction.amount);
                const isPositive = transaction.type === 'deposit' || transaction.type === 'refund';
                const typeLabel = transaction.type === 'deposit' ? 'Deposit' : 
                                 transaction.type === 'purchase' ? 'Purchase' : 
                                 transaction.type === 'refund' ? 'Refund' : transaction.type;
                
                html += `
                    <div style="background: white; border: 1px solid rgba(139, 111, 71, 0.2); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div style="flex: 1; min-width: 200px;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">
                                ${typeLabel}
                            </div>
                            <div style="color: var(--text-dark); font-size: 0.9rem; opacity: 0.8;">
                                ${transaction.description || 'No description'}
                            </div>
                            <div style="color: var(--text-dark); font-size: 0.85rem; opacity: 0.6; margin-top: 0.25rem;">
                                ${date}
                            </div>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: ${isPositive ? 'var(--auburn)' : 'var(--text-dark)'};">
                            ${isPositive ? '+' : '-'}$${amount.toFixed(2)}
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            transactionHistoryContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading transaction history:', error);
            transactionHistoryContainer.innerHTML = `
                <p style="text-align: center; color: var(--auburn);">
                    Error loading transaction history. Please try again later.
                </p>
            `;
        }
    }
}

// Initialize app when DOM is ready
const coffeeClubApp = new CoffeeClubApp();

