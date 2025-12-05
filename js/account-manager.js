// Account Management Module
// Handles account balance, funding, and transactions

class AccountManager {
    constructor() {
        this.account = null;
        this.transactions = [];
    }

    async getAccount() {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            return null;
        }

        try {
            const { data, error } = await client
                .from('coffee_club_accounts')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            
            this.account = data;
            return data;
        } catch (error) {
            console.error('Get account error:', error);
            return null;
        }
    }

    async getBalance() {
        const account = await this.getAccount();
        return account ? parseFloat(account.balance) : 0;
    }

    async fundAccount(amount, paymentIntentId) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            // Create transaction record
            const { data, error } = await client
                .from('account_transactions')
                .insert({
                    account_id: user.id,
                    type: 'deposit',
                    amount: amount,
                    description: `Account funding: $${amount.toFixed(2)}`,
                    stripe_payment_intent_id: paymentIntentId
                })
                .select()
                .single();

            if (error) throw error;

            // Refresh account balance
            await this.getAccount();
            
            return { success: true, transaction: data };
        } catch (error) {
            console.error('Fund account error:', error);
            return { success: false, error: error.message };
        }
    }

    async getTransactions(limit = 20) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            return [];
        }

        try {
            const { data, error } = await client
                .from('account_transactions')
                .select('*')
                .eq('account_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            
            this.transactions = data || [];
            return this.transactions;
        } catch (error) {
            console.error('Get transactions error:', error);
            return [];
        }
    }
}

// Global account manager instance
const accountManager = new AccountManager();

