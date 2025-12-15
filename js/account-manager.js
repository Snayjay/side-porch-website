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

        const shopId = configManager.getShopId();

        try {
            let query = client
                .from('coffee_club_accounts')
                .select('*')
                .eq('id', user.id);
            
            if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error } = await query.single();

            if (error) throw error;
            
            // If account exists but doesn't have shop_id, update it
            if (data && !data.shop_id && shopId) {
                await this.updateAccountShopId(data.id, shopId);
                data.shop_id = shopId;
            }
            
            this.account = data;
            return data;
        } catch (error) {
            console.error('Get account error:', error);
            return null;
        }
    }
    
    async updateAccountShopId(accountId, shopId) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            const { error } = await client
                .from('coffee_club_accounts')
                .update({ shop_id: shopId })
                .eq('id', accountId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Update account shop_id error:', error);
            return { success: false, error: error.message };
        }
    }

    async getRole() {
        const account = await this.getAccount();
        return account?.role || 'customer';
    }

    isStaff() {
        return this.account?.role === 'staff';
    }

    isCustomer() {
        return this.account?.role === 'customer';
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            throw new Error('Shop ID not configured');
        }

        try {
            // Ensure account has shop_id
            const account = await this.getAccount();
            if (account && !account.shop_id) {
                await this.updateAccountShopId(account.id, shopId);
            }

            // Create transaction record
            const { data, error } = await client
                .from('account_transactions')
                .insert({
                    account_id: user.id,
                    shop_id: shopId,
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

        const shopId = configManager.getShopId();

        try {
            let query = client
                .from('account_transactions')
                .select('*')
                .eq('account_id', user.id);
            
            if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error } = await query
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

