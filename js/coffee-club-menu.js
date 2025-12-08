// Coffee Club Menu Component
// Displays products and handles cart functionality

class CoffeeClubMenu {
    constructor() {
        this.products = [];
        this.cart = [];
        this.loadProducts();
    }

    async loadProducts() {
        const client = getSupabaseClient();
        if (!client) {
            console.error('Supabase not configured');
            this.products = [];
            this.renderMenu();
            return;
        }

        try {
            // Load products with their categories
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    menu_categories (
                        id,
                        name,
                        type
                    )
                `)
                .eq('available', true)
                .order('name', { ascending: true });

            if (error) throw error;
            
            this.products = data || [];
        } catch (error) {
            console.error('Load products error:', error);
            this.products = [];
        }

        this.renderMenu();
    }


    renderMenu() {
        const container = document.getElementById('coffee-club-menu-container');
        if (!container) return;

        if (this.products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dark); opacity: 0.7; padding: 2rem;">No menu items available at this time. Please check back soon!</p>';
            return;
        }

        // Group products by category from menu_categories table
        const categoriesMap = {};
        
        this.products.forEach(product => {
            if (product.menu_categories && product.category_id) {
                const category = product.menu_categories;
                const categoryId = product.category_id;
                
                if (!categoriesMap[categoryId]) {
                    // Get emoji for category type
                    const emoji = this.getCategoryEmoji(category.type);
                    categoriesMap[categoryId] = {
                        id: categoryId,
                        name: category.name,
                        type: category.type,
                        emoji: emoji,
                        products: [],
                        sections: {}
                    };
                }
                
                // For drinks, group by menu_section if available
                if (category.type === 'drink' && product.menu_section) {
                    const section = product.menu_section;
                    if (!categoriesMap[categoryId].sections[section]) {
                        categoriesMap[categoryId].sections[section] = [];
                    }
                    categoriesMap[categoryId].sections[section].push(product);
                } else {
                    categoriesMap[categoryId].products.push(product);
                }
            }
        });

        // Sort categories by type (drink, food, merch) then by display_order
        const sortedCategories = Object.values(categoriesMap).sort((a, b) => {
            const typeOrder = { 'drink': 1, 'food': 2, 'merch': 3, 'ingredient': 4 };
            const typeDiff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
            if (typeDiff !== 0) return typeDiff;
            return a.name.localeCompare(b.name);
        });

        let html = '';
        sortedCategories.forEach(category => {
            if (category.type === 'drink') {
                // Render drinks grouped by menu_section
                const sections = Object.keys(category.sections).sort();
                const drinksWithoutSection = category.products;
                
                if (sections.length > 0 || drinksWithoutSection.length > 0) {
                    html += `<div class="menu-category">`;
                    html += `<h2>${category.emoji} ${category.name}</h2>`;
                    
                    // Render drinks by section
                    sections.forEach(section => {
                        html += `<h3 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--deep-brown); font-size: 1.3rem;">${this.escapeHtml(section)}</h3>`;
                        html += `<div class="menu-line-items">`;
                        category.sections[section].forEach(product => {
                            html += this.renderMenuItem(product);
                        });
                        html += `</div>`;
                    });
                    
                    // Render drinks without a section
                    if (drinksWithoutSection.length > 0) {
                        if (sections.length > 0) {
                            html += `<h3 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--deep-brown); font-size: 1.3rem;">Other</h3>`;
                        }
                        html += `<div class="menu-line-items">`;
                        drinksWithoutSection.forEach(product => {
                            html += this.renderMenuItem(product);
                        });
                        html += `</div>`;
                    }
                    
                    html += `</div>`;
                }
            } else {
                // Render other categories normally
                if (category.products.length === 0) return;

                html += `<div class="menu-category">`;
                html += `<h2>${category.emoji} ${this.escapeHtml(category.name)}</h2>`;
                html += `<div class="menu-line-items">`;

                category.products.forEach(product => {
                    html += this.renderMenuItem(product);
                });

                html += `</div></div>`;
            }
        });

        container.innerHTML = html;
    }

    renderMenuItem(product) {
        const categoryType = product.menu_categories?.type || 'drink';
        const isDrink = categoryType === 'drink';
        const description = product.description || '';
        const productId = product.id;
        
        return `
            <div class="menu-line-item" data-product-id="${productId}">
                <div class="menu-line-item-info">
                    <div class="menu-item-name-text">${this.escapeHtml(product.name)}</div>
                    ${description ? `<div class="menu-item-description">${this.escapeHtml(description)}</div>` : ''}
                </div>
                <div class="menu-line-item-price">$${parseFloat(product.price || 0).toFixed(2)}</div>
                <div class="menu-line-item-action">
                    ${isDrink ? `
                        <button class="btn btn-sm" onclick="coffeeClubMenu.customizeDrink('${productId}')">
                            Customize
                        </button>
                    ` : `
                        <button class="btn btn-sm" onclick="coffeeClubMenu.addToCart('${productId}')">
                            Add
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    getCategoryEmoji(type) {
        const emojis = {
            'drink': '☕',
            'food': '🥐',
            'merch': '🛍️',
            'ingredient': '✨'
        };
        return emojis[type] || '📋';
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    customizeDrink(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        drinkCustomizer.showCustomizationDialog(product, (customizedDrink) => {
            this.addCustomizedDrinkToCart(customizedDrink);
        });
    }

    addCustomizedDrinkToCart(customizedDrink) {
        const { product, customizations, priceAdjustment, finalPrice } = customizedDrink;
        
        // Create a unique cart item ID that includes customizations
        const cartItemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const categoryType = product.menu_categories?.type || 'drink';
        this.cart.push({
            cartItemId: cartItemId,
            productId: product.id,
            name: product.name,
            category: categoryType,
            basePrice: parseFloat(product.price || 0),
            priceAdjustment: priceAdjustment,
            finalPrice: finalPrice,
            taxRate: parseFloat(product.tax_rate || 0.0825),
            quantity: 1,
            customizations: customizations
        });

        this.updateCartDisplay();
        this.showCartNotification();
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // For drinks, show customization dialog instead
        const categoryType = product.menu_categories?.type || 'drink';
        if (categoryType === 'drink') {
            this.customizeDrink(productId);
            return;
        }

        // For non-drinks, add directly
        const existingItem = this.cart.find(item => 
            item.productId === productId && 
            !item.customizations && 
            item.customizations?.length === 0
        );
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const cartItemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const categoryType = product.menu_categories?.type || 'drink';
            this.cart.push({
                cartItemId: cartItemId,
                productId: productId,
                name: product.name,
                category: categoryType,
                basePrice: parseFloat(product.price || 0),
                priceAdjustment: 0,
                finalPrice: parseFloat(product.price || 0),
                taxRate: parseFloat(product.tax_rate || 0.0825),
                quantity: 1,
                customizations: []
            });
        }

        this.updateCartDisplay();
        this.showCartNotification();
    }

    removeFromCart(cartItemId) {
        this.cart = this.cart.filter(item => item.cartItemId !== cartItemId);
        this.updateCartDisplay();
    }

    updateQuantity(cartItemId, quantity) {
        const item = this.cart.find(item => item.cartItemId === cartItemId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(cartItemId);
            } else {
                item.quantity = quantity;
                this.updateCartDisplay();
            }
        }
    }

    calculateTotals() {
        let subtotal = 0;
        let totalTax = 0;

        this.cart.forEach(item => {
            const itemPrice = item.finalPrice || item.basePrice || item.price || 0;
            const itemSubtotal = itemPrice * item.quantity;
            const itemTax = itemSubtotal * item.taxRate;
            subtotal += itemSubtotal;
            totalTax += itemTax;
        });

        const total = subtotal + totalTax;

        return {
            subtotal: subtotal,
            tax: totalTax,
            total: total
        };
    }

    updateCartDisplay() {
        const cartContainer = document.getElementById('cart-container');
        if (!cartContainer) return;

        if (this.cart.length === 0) {
            cartContainer.innerHTML = '<p style="text-align: center; color: var(--text-dark); opacity: 0.7;">Your cart is empty</p>';
            return;
        }

        const totals = this.calculateTotals();
        let html = '<div class="cart-items">';

        this.cart.forEach(item => {
            const itemPrice = item.finalPrice || item.basePrice || item.price || 0;
            const itemSubtotal = itemPrice * item.quantity;
            const itemTax = itemSubtotal * item.taxRate;
            const itemTotal = itemSubtotal + itemTax;
            const hasCustomizations = item.customizations && item.customizations.length > 0;

            html += `
                <div class="cart-item">
                    <div class="cart-item-info" style="flex: 1;">
                        <h4>${item.name}</h4>
                        ${hasCustomizations ? `
                            <div class="cart-item-customizations" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-dark); opacity: 0.8;">
                                ${item.customizations.map(cust => {
                                    const sign = cust.difference > 0 ? '+' : '';
                                    const unitLabel = cust.unitType === 'shots' ? 'shot' : 
                                                     cust.unitType === 'pumps' ? 'pump' :
                                                     cust.unitType === 'oz' ? 'oz' :
                                                     cust.unitType === 'tsp' ? 'tsp' :
                                                     cust.unitType === 'packets' ? 'packet' : '';
                                    return `${sign}${cust.difference} ${unitLabel} ${cust.ingredientName}`;
                                }).join(', ')}
                            </div>
                        ` : ''}
                        <p class="cart-item-price">
                            $${itemPrice.toFixed(2)} × ${item.quantity}
                            ${item.priceAdjustment && item.priceAdjustment !== 0 ? 
                                ` <span style="color: ${item.priceAdjustment > 0 ? 'var(--auburn)' : '#28a745'};">
                                    (${item.priceAdjustment > 0 ? '+' : ''}$${item.priceAdjustment.toFixed(2)})
                                </span>` : ''}
                        </p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.cartItemId}', ${item.quantity - 1})">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.cartItemId}', ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="coffeeClubMenu.removeFromCart('${item.cartItemId}')">×</button>
                    </div>
                    <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
                </div>
            `;
        });

        html += '</div>';
        html += `
            <div class="cart-totals">
                <div class="cart-total-line">
                    <span>Subtotal:</span>
                    <span>$${totals.subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-total-line">
                    <span>Tax:</span>
                    <span>$${totals.tax.toFixed(2)}</span>
                </div>
                <div class="cart-total-line cart-total-final">
                    <span>Total:</span>
                    <span>$${totals.total.toFixed(2)}</span>
                </div>
            </div>
            <button class="btn btn-checkout" onclick="coffeeClubMenu.checkout()" ${!authManager.isAuthenticated() ? 'disabled' : ''}>
                Checkout
            </button>
        `;

        cartContainer.innerHTML = html;
    }

    showCartNotification() {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = 'Added to cart!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--auburn);
            color: var(--cream);
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    async checkout() {
        if (!authManager.isAuthenticated()) {
            errorDialog.show('Please sign in to checkout', 'Authentication Required');
            return;
        }

        if (this.cart.length === 0) {
            errorDialog.show('Your cart is empty', 'Empty Cart');
            return;
        }

        const balance = await accountManager.getBalance();
        const totals = this.calculateTotals();

        if (balance < totals.total) {
            errorDialog.show(`Insufficient balance. You have $${balance.toFixed(2)}, but need $${totals.total.toFixed(2)}. Please fund your account.`, 'Insufficient Balance');
            return;
        }

        // Process order
        const orderProcessor = new OrderProcessor();
        const result = await orderProcessor.processOrder(this.cart, totals);

        if (result.success) {
            this.cart = [];
            this.updateCartDisplay();
            errorDialog.showSuccess('Order placed successfully!', 'Order Confirmed');
            // Refresh account balance
            await accountManager.getAccount();
            window.dispatchEvent(new CustomEvent('accountUpdated'));
        } else {
            errorDialog.show('Error processing order: ' + (result.error || 'Please try again.'), 'Order Error');
        }
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    }
}

// Global menu instance
const coffeeClubMenu = new CoffeeClubMenu();

