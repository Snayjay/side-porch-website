// Coffee Club App - Main application logic
// Handles UI updates and component coordination

class CoffeeClubApp {
    constructor() {
        this.init();
    }

    async init() {
        // Check if configuration is needed
        if (!configManager.isSupabaseConfigured()) {
            // Show secrets dialog automatically if not configured
            setTimeout(() => {
                secretsDialog.show();
            }, 500);
        }

        // Setup auth UI immediately
        this.setupAuthUI();
        this.setupFundingUI();

        // Wait for config to be ready
        if (configManager.isSupabaseConfigured()) {
            // Wait for Supabase to be ready
            window.addEventListener('supabaseReady', () => {
                this.setupAuthUI();
                this.setupAccountUI();
            });

            // Check if already authenticated
            const user = await authManager.getCurrentUser();
            if (user) {
                this.handleAuthStateChange(user);
            }
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
            <div style="background: rgba(160, 82, 45, 0.1); border: 1px solid var(--auburn); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                <p style="color: var(--auburn); margin: 0 0 1rem 0; text-align: center;">
                    ⚠️ API keys are required to use Coffee Club features.
                </p>
                <div style="text-align: center;">
                    <button class="btn" onclick="secretsDialog.show()">Configure API Keys Securely</button>
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
                    <label for="signup-email">Email</label>
                    <div id="signup-email-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <div id="signup-password-container"></div>
                </div>
                <div class="form-group">
                    <label for="signup-name">Full Name (optional)</label>
                    <div id="signup-name-container"></div>
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

        // Create sign-in password field
        const signinPasswordContainer = document.getElementById('signin-password-container');
        if (signinPasswordContainer && !signinPasswordContainer.querySelector('input')) {
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'signin-password';
            passwordInput.setAttribute('data-auth-field', 'password');
            passwordInput.placeholder = 'Password';
            passwordInput.autocomplete = 'new-password';
            passwordInput.style.cssText = 'width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            signinPasswordContainer.appendChild(passwordInput);
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

        // Create sign-up password field
        const signupPasswordContainer = document.getElementById('signup-password-container');
        if (signupPasswordContainer && !signupPasswordContainer.querySelector('input')) {
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'signup-password';
            passwordInput.setAttribute('data-auth-field', 'password');
            passwordInput.placeholder = 'Password (min 6 characters)';
            passwordInput.autocomplete = 'new-password';
            passwordInput.style.cssText = 'width: 100%; padding: 0.9rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-family: inherit; font-size: 1rem; background-color: white !important;';
            signupPasswordContainer.appendChild(passwordInput);
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
            alert('Please enter email and password');
            return;
        }

        const result = await authManager.signInWithEmail(email, password);
        if (result.success) {
            this.handleAuthStateChange(result.user);
        } else {
            // Show more helpful error message for email verification
            if (result.needsEmailVerification) {
                this.showEmailVerificationMessage(email);
            } else {
                alert('Sign in failed: ' + result.error);
            }
        }
    }

    async signUp() {
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        const name = document.getElementById('signup-name').value.trim();

        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        const userData = name ? { full_name: name } : {};
        const result = await authManager.signUpWithEmail(email, password, userData);
        
        if (result.success) {
            if (result.needsEmailConfirmation) {
                // Show success message with email verification notice
                this.showEmailVerificationMessage(email);
            } else if (result.user) {
                // Email verification disabled or already verified
                this.handleAuthStateChange(result.user);
            } else {
                // Shouldn't happen, but handle it
                alert('Account created! Please check your email to verify your account.');
            }
        } else {
            alert('Sign up failed: ' + result.error);
        }
    }

    showEmailVerificationMessage(email) {
        const authContainer = document.getElementById('auth-container');
        if (!authContainer) return;

        authContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📧</div>
                <h2 style="color: var(--deep-brown); margin-bottom: 1rem;">Check Your Email</h2>
                <p style="color: var(--text-dark); margin-bottom: 1.5rem; line-height: 1.6;">
                    We've sent a confirmation email to <strong>${email}</strong>
                </p>
                <p style="color: var(--text-dark); margin-bottom: 1.5rem; line-height: 1.6;">
                    Please click the link in the email to verify your account, then you can sign in.
                </p>
                <p style="color: var(--auburn); font-size: 0.9rem; margin-bottom: 1.5rem;">
                    Didn't receive the email? Check your spam folder or try signing up again.
                </p>
                <button class="btn btn-secondary" onclick="coffeeClubApp.setupAuthUI()">Back to Sign In</button>
            </div>
        `;
    }

    async signOut() {
        const result = await authManager.signOut();
        if (result.success) {
            this.handleAuthStateChange(null);
            coffeeClubMenu.clearCart();
        } else {
            alert('Sign out failed: ' + result.error);
        }
    }

    async handleAuthStateChange(user) {
        if (user) {
            // User is authenticated
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('account-section').style.display = 'block';
            document.getElementById('funding-section').style.display = 'block';
            document.getElementById('order-history-section').style.display = 'block';
            document.getElementById('config-button-container').style.display = 'block';

            await this.updateAccountDisplay();
            await this.updateOrderHistory();
        } else {
            // User is not authenticated
            document.getElementById('auth-section').style.display = 'block';
            document.getElementById('account-section').style.display = 'none';
            document.getElementById('funding-section').style.display = 'none';
            document.getElementById('order-history-section').style.display = 'none';
            document.getElementById('config-button-container').style.display = 'none';

            this.setupAuthUI();
        }
    }

    async updateAccountDisplay() {
        const accountInfo = document.getElementById('account-info');
        if (!accountInfo) return;

        const account = await accountManager.getAccount();
        const balance = account ? parseFloat(account.balance) : 0;

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
            <div id="funding-payment-form" style="display: none; margin-top: 2rem;">
                <h3>Payment Information</h3>
                <div id="card-element" style="margin: 1rem 0;">
                    <!-- Stripe card element will be mounted here -->
                </div>
                <div id="card-errors" style="color: var(--auburn); margin-bottom: 1rem;"></div>
                <button class="btn" onclick="coffeeClubApp.processFunding()">Complete Payment</button>
                <button class="btn btn-secondary" onclick="coffeeClubApp.cancelFunding()" style="margin-left: 1rem;">Cancel</button>
            </div>
        `;
    }

    setupAccountUI() {
        // This method can be used for additional account UI setup if needed
        // Currently handled by updateAccountDisplay()
    }

    async initiateFunding(amount) {
        if (!authManager.isAuthenticated()) {
            alert('Please sign in to fund your account');
            return;
        }

        if (!configManager.getStripeConfig().publishableKey) {
            alert('Stripe not configured. Please set your Stripe publishable key in the configuration dialog.');
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
                alert('Error initializing payment form: ' + error.message);
                return;
            }
        }
    }

    async processFunding() {
        if (!this.fundingAmount) {
            alert('Please select a funding amount');
            return;
        }

        // Create payment method
        const paymentMethodResult = await stripeManager.createPaymentMethod();
        if (!paymentMethodResult.success) {
            document.getElementById('card-errors').textContent = paymentMethodResult.error;
            return;
        }

        // Create payment intent (in real app, this would call your backend)
        const paymentIntentResult = await stripeManager.createPaymentIntent(
            this.fundingAmount,
            authManager.currentUser.id
        );

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
                alert(`Successfully added $${this.fundingAmount.toFixed(2)} to your account!`);
                this.cancelFunding();
                await this.updateAccountDisplay();
            } else {
                alert('Error funding account: ' + fundResult.error);
            }
        } else {
            document.getElementById('card-errors').textContent = paymentResult.error;
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
        document.getElementById('card-errors').textContent = '';
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
}

// Initialize app when DOM is ready
const coffeeClubApp = new CoffeeClubApp();

