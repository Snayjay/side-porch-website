// Order Processor Module
// Handles order creation and processing

class OrderProcessor {
    async processOrder(cartItems, totals) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            // Create order
            const { data: order, error: orderError } = await client
                .from('orders')
                .insert({
                    account_id: user.id,
                    subtotal: totals.subtotal,
                    tax: totals.tax,
                    total: totals.total,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cartItems.map(item => {
                const itemSubtotal = item.price * item.quantity;
                const itemTax = itemSubtotal * item.taxRate;
                const itemTotal = itemSubtotal + itemTax;

                return {
                    order_id: order.id,
                    product_id: item.productId,
                    product_name: item.name,
                    product_category: item.category,
                    quantity: item.quantity,
                    unit_price: item.price,
                    tax_rate: item.taxRate,
                    tax_amount: itemTax,
                    subtotal: itemSubtotal,
                    total: itemTotal
                };
            });

            const { error: itemsError } = await client
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Create purchase transaction
            const { error: transactionError } = await client
                .from('account_transactions')
                .insert({
                    account_id: user.id,
                    type: 'purchase',
                    amount: totals.total,
                    description: `Order #${order.id.substring(0, 8)}`
                });

            if (transactionError) throw transactionError;

            return { success: true, order };
        } catch (error) {
            console.error('Process order error:', error);
            return { success: false, error: error.message };
        }
    }

    async getOrderHistory(limit = 10) {
        const client = getSupabaseClient();
        if (!client) {
            return [];
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            return [];
        }

        try {
            const { data, error } = await client
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('account_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get order history error:', error);
            return [];
        }
    }
}

