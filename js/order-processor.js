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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            // Create order
            const { data: order, error: orderError } = await client
                .from('orders')
                .insert({
                    account_id: user.id,
                    shop_id: shopId,
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
            const orderItemsData = cartItems.map(item => {
                const itemPrice = item.finalPrice || item.basePrice || item.price || 0;
                const itemSubtotal = itemPrice * item.quantity;
                const itemTax = itemSubtotal * item.taxRate;
                const itemTotal = itemSubtotal + itemTax;

                return {
                    order_id: order.id,
                    shop_id: shopId,
                    product_id: item.productId,
                    product_name: item.name,
                    product_category: item.category,
                    quantity: item.quantity,
                    unit_price: itemPrice,
                    tax_rate: item.taxRate,
                    tax_amount: itemTax,
                    subtotal: itemSubtotal,
                    total: itemTotal,
                    selected_size: item.selectedSize || null, // Store selected size name
                    customizations: item.customizations || [] // Store customizations for reference
                };
            });

            const { data: insertedItems, error: itemsError } = await client
                .from('order_items')
                .insert(orderItemsData)
                .select();

            if (itemsError) throw itemsError;

            // Save customizations for each order item
            const customizationsToInsert = [];
            insertedItems.forEach((orderItem, index) => {
                const cartItem = cartItems[index];
                if (cartItem.customizations && cartItem.customizations.length > 0) {
                    cartItem.customizations.forEach(cust => {
                        customizationsToInsert.push({
                            order_item_id: orderItem.id,
                            ingredient_id: cust.ingredientId,
                            amount: cust.amount,
                            action: cust.difference > 0 ? 'add' : (cust.difference < 0 ? 'remove' : 'modify'),
                            cost_adjustment: cust.cost
                        });
                    });
                }
            });

            if (customizationsToInsert.length > 0) {
                const { error: custError } = await client
                    .from('order_item_customizations')
                    .insert(customizationsToInsert);

                if (custError) {
                    console.error('Error saving customizations:', custError);
                    // Don't fail the order if customizations fail to save
                }
            }

            // Create purchase transaction
            const { error: transactionError } = await client
                .from('account_transactions')
                .insert({
                    account_id: user.id,
                    shop_id: shopId,
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

        const shopId = configManager.getShopId();

        try {
            let query = client
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .eq('account_id', user.id);
            
            if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error } = await query
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

