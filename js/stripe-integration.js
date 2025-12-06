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
                            accountId: accountId
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

    async confirmPayment(clientSecret, paymentMethod) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        try {
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethod
            });

            if (error) {
                throw error;
            }

            return { success: true, paymentIntent };
        } catch (error) {
            console.error('Payment confirmation error:', error);
            return { success: false, error: error.message };
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
        }

        return this.cardElement;
    }

    async createPaymentMethod() {
        if (!this.stripe || !this.cardElement) {
            throw new Error('Stripe or card element not initialized');
        }

        try {
            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement,
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

