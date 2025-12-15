// Stripe Integration Module
// Handles Stripe payments for account funding

class StripeManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.cardElement = null;
        this.initializeStripe();
    }

    initializeStripe() {
        const config = configManager.getStripeConfig();
        
        if (!config.publishableKey) {
            console.warn('Stripe not configured. Please set publishable key in the secrets dialog.');
            return;
        }

        // Load Stripe JS library dynamically if not already loaded
        if (typeof Stripe === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                this.stripe = Stripe(config.publishableKey);
                window.dispatchEvent(new CustomEvent('stripeReady'));
            };
            document.head.appendChild(script);
        } else {
            this.stripe = Stripe(config.publishableKey);
            window.dispatchEvent(new CustomEvent('stripeReady'));
        }
    }

    async createPaymentIntent(amount, accountId) {
        // Try to call backend endpoint (Supabase Edge Function or other API)
        const supabaseConfig = configManager.getSupabaseConfig();
        const supabaseClient = getSupabaseClient();
        
        if (supabaseConfig?.url && supabaseClient) {
            try {
                // Get current session for authentication
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    throw new Error('Not authenticated');
                }

                // Get user email for receipt
                const user = await authManager.getCurrentUser();
                const shopId = configManager.getShopId();
                
                // Try calling Supabase Edge Function
                const response = await fetch(
                    `${supabaseConfig.url}/functions/v1/create-payment-intent`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                            'apikey': supabaseConfig.anonKey || ''
                        },
                        body: JSON.stringify({
                            amount: amount,
                            accountId: accountId,
                            shopId: shopId,
                            currency: 'usd', // Required: ISO currency code
                            description: `Coffee Club account funding: $${amount.toFixed(2)}`,
                            receiptEmail: user?.email || undefined // Recommended: email for receipt
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    return {
                        clientSecret: data.clientSecret,
                        paymentIntentId: data.paymentIntentId
                    };
                } else {
                    // If endpoint doesn't exist, fall through to error message
                    const error = await response.json().catch(() => ({ error: 'Backend endpoint not found' }));
                    throw new Error(error.error || 'Backend endpoint returned an error');
                }
            } catch (error) {
                // If fetch fails (endpoint doesn't exist), show helpful error
                if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                    throw new Error(
                        'Backend endpoint not found. Please create a Supabase Edge Function or other backend endpoint. ' +
                        'See supabase-edge-function-example.md for setup instructions.'
                    );
                }
                throw error;
            }
        }
        
        // If no backend configured, throw helpful error
        throw new Error(
            'Backend endpoint required: Please create a backend API endpoint to create Stripe PaymentIntents. ' +
            'The endpoint should call Stripe API with your secret key to create a PaymentIntent and return the client_secret. ' +
            'See supabase-edge-function-example.md for setup instructions or visit: ' +
            'https://stripe.com/docs/payments/accept-a-payment#web-create-payment-intent'
        );
    }

    async confirmPayment(clientSecret, paymentMethodId) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        try {
            // Get return URL for 3D Secure authentication redirects (required for some payment methods)
            const returnUrl = `${window.location.origin}${window.location.pathname}`;

            const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethodId,
                return_url: returnUrl // Required for 3D Secure authentication redirects
            });

            if (error) {
                // Return detailed error information including decline codes
                return { 
                    success: false, 
                    error: error.message || 'Payment failed',
                    declineCode: error.decline_code,
                    code: error.code,
                    type: error.type
                };
            }

            return { success: true, paymentIntent };
        } catch (error) {
            console.error('Payment confirmation error:', error);
            return { 
                success: false, 
                error: error.message || 'Payment confirmation failed',
                declineCode: error.decline_code,
                code: error.code,
                type: error.type
            };
        }
    }

    createCardElement(containerId) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        this.elements = this.stripe.elements();
        this.cardElement = this.elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                },
                invalid: {
                    color: '#9e2146',
                },
            },
        });

        const container = document.getElementById(containerId);
        if (container) {
            this.cardElement.mount(container);
            
            // Listen for real-time validation errors
            this.cardElement.on('change', (event) => {
                const cardErrors = document.getElementById('card-errors');
                if (cardErrors) {
                    if (event.error) {
                        cardErrors.textContent = event.error.message;
                        cardErrors.style.display = 'block';
                    } else {
                        cardErrors.textContent = '';
                        cardErrors.style.display = 'none';
                    }
                }
            });
            
            // Also listen for focus events to potentially hide autofill
            this.cardElement.on('focus', () => {
                // Try to prevent browser autofill suggestions
                const container = document.getElementById(containerId);
                if (container) {
                    container.setAttribute('autocomplete', 'off');
                }
            });
        }

        return this.cardElement;
    }

    async createPaymentMethod() {
        if (!this.stripe || !this.cardElement) {
            throw new Error('Stripe or card element not initialized');
        }

        try {
            // Get billing information from form fields
            const billingName = document.getElementById('billing-name')?.value?.trim();
            const addressLine1 = document.getElementById('billing-address-line1')?.value?.trim();
            const addressLine2 = document.getElementById('billing-address-line2')?.value?.trim();
            const city = document.getElementById('billing-city')?.value?.trim();
            const state = document.getElementById('billing-state')?.value?.trim();
            const postalCode = document.getElementById('billing-postal-code')?.value?.trim();
            
            // Get user information for email
            const user = await authManager.getCurrentUser();
            const account = await accountManager.getAccount();
            
            // Validate required billing fields
            if (!billingName) {
                throw new Error('Cardholder name is required');
            }
            if (!addressLine1) {
                throw new Error('Billing address is required');
            }
            if (!city) {
                throw new Error('City is required');
            }
            if (!state) {
                throw new Error('State is required');
            }
            if (!postalCode) {
                throw new Error('ZIP code is required');
            }

            // Build billing details object (required/recommended for Stripe compliance)
            const billingDetails = {
                name: billingName,
                email: user?.email || '',
                address: {
                    line1: addressLine1,
                    line2: addressLine2 || undefined,
                    city: city,
                    state: state,
                    postal_code: postalCode,
                    country: 'US' // Default to US, can be made configurable
                }
            };

            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement,
                billing_details: billingDetails
            });

            if (error) {
                throw error;
            }

            return { success: true, paymentMethod };
        } catch (error) {
            console.error('Payment method creation error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global Stripe instance
const stripeManager = new StripeManager();

