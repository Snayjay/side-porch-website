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
        // In a real implementation, this would call your backend API
        // For now, we'll simulate it
        // You'll need to create a backend endpoint that:
        // 1. Creates a Stripe PaymentIntent
        // 2. Records the transaction in Supabase
        // 3. Returns the client_secret
        
        // Mock implementation - replace with actual API call
        return {
            clientSecret: 'mock_client_secret_' + Date.now(),
            paymentIntentId: 'pi_mock_' + Date.now()
        };
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

