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
            // Use mock data if Supabase not configured
            this.products = this.getMockProducts();
            this.renderMenu();
            return;
        }

        try {
            const { data, error } = await client
                .from('products')
                .select('*')
                .eq('available', true)
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            
            this.products = data || this.getMockProducts();
        } catch (error) {
            console.error('Load products error:', error);
            this.products = this.getMockProducts();
        }

        this.renderMenu();
    }

    getMockProducts() {
        return [
            // Drinks (8.25% tax)
            { id: '1', name: 'Maple Pecan Latte', description: 'Rich espresso with steamed milk, real maple syrup, and toasted pecans', category: 'drink', price: 5.95, tax_rate: 0.0825 },
            { id: '2', name: 'Pumpkin Spice Latte', description: 'Espresso, steamed milk, pumpkin puree, and warm spices', category: 'drink', price: 5.75, tax_rate: 0.0825 },
            { id: '3', name: 'Spiced Apple Cider', description: 'Warm, mulled apple cider with cinnamon and cloves', category: 'drink', price: 4.50, tax_rate: 0.0825 },
            { id: '4', name: 'Caramel Apple Macchiato', description: 'Espresso with steamed milk, apple syrup, and caramel', category: 'drink', price: 5.85, tax_rate: 0.0825 },
            { id: '5', name: 'Chai Latte', description: 'Traditional spiced chai tea with steamed milk', category: 'drink', price: 4.95, tax_rate: 0.0825 },
            { id: '6', name: 'Hazelnut Mocha', description: 'Chocolate and espresso with hazelnut syrup', category: 'drink', price: 5.65, tax_rate: 0.0825 },
            { id: '7', name: 'Maple Brew House Blend', description: 'Medium roast with notes of maple and caramel', category: 'drink', price: 4.25, tax_rate: 0.0825 },
            { id: '8', name: 'Americano', description: 'Rich espresso shots topped with hot water', category: 'drink', price: 3.75, tax_rate: 0.0825 },
            { id: '9', name: 'Cappuccino', description: 'Equal parts espresso, steamed milk, and foam', category: 'drink', price: 4.50, tax_rate: 0.0825 },
            { id: '10', name: 'Cold Brew', description: 'Smooth, slow-steeped coffee served over ice', category: 'drink', price: 4.50, tax_rate: 0.0825 },
            // Food (8.25% tax)
            { id: '11', name: 'Cinnamon Roll', description: 'Freshly baked cinnamon rolls with cream cheese frosting', category: 'food', price: 4.50, tax_rate: 0.0825 },
            { id: '12', name: 'Pumpkin Muffin', description: 'Moist pumpkin muffin with warm spices', category: 'food', price: 3.95, tax_rate: 0.0825 },
            { id: '13', name: 'Apple Pie Slice', description: 'Homemade apple pie with flaky crust', category: 'food', price: 5.50, tax_rate: 0.0825 },
            { id: '14', name: 'Maple Scone', description: 'Buttery scone drizzled with real maple glaze', category: 'food', price: 3.75, tax_rate: 0.0825 },
            { id: '15', name: 'Chocolate Chip Cookie', description: 'Classic cookie made with real butter', category: 'food', price: 2.95, tax_rate: 0.0825 },
            { id: '16', name: 'Croissant', description: 'Buttery, flaky French croissant', category: 'food', price: 3.50, tax_rate: 0.0825 },
            // Ingredients (0% tax)
            { id: '17', name: 'Coffee Beans - House Blend', description: '1 lb bag of our signature house blend', category: 'ingredient', price: 14.99, tax_rate: 0.0000 },
            { id: '18', name: 'Coffee Beans - Dark Roast', description: '1 lb bag of dark roast beans', category: 'ingredient', price: 15.99, tax_rate: 0.0000 },
            { id: '19', name: 'Maple Syrup', description: '12 oz bottle of pure maple syrup', category: 'ingredient', price: 12.99, tax_rate: 0.0000 },
            { id: '20', name: 'Chai Tea Blend', description: '4 oz bag of our signature chai blend', category: 'ingredient', price: 8.99, tax_rate: 0.0000 },
            { id: '21', name: 'Pumpkin Spice Mix', description: '2 oz jar of pumpkin spice seasoning', category: 'ingredient', price: 6.99, tax_rate: 0.0000 },
            // Merch (8.25% tax)
            { id: '22', name: 'Coffee Club T-Shirt', description: 'Comfortable cotton t-shirt with Coffee Club logo', category: 'merch', price: 24.99, tax_rate: 0.0825 },
            { id: '23', name: 'Coffee Club Mug', description: 'Ceramic mug with Side Porch Coffee Co. logo', category: 'merch', price: 16.99, tax_rate: 0.0825 },
            { id: '24', name: 'Coffee Club Tote Bag', description: 'Reusable canvas tote bag', category: 'merch', price: 18.99, tax_rate: 0.0825 },
            { id: '25', name: 'Coffee Club Hoodie', description: 'Cozy hoodie with Coffee Club branding', category: 'merch', price: 45.99, tax_rate: 0.0825 },
            { id: '26', name: 'Coffee Club Hat', description: 'Adjustable cap with embroidered logo', category: 'merch', price: 22.99, tax_rate: 0.0825 }
        ];
    }

    renderMenu() {
        const container = document.getElementById('coffee-club-menu-container');
        if (!container) return;

        // Group products by category first, then by menu_section for drinks
        const categories = {
            drink: { name: '☕ Drinks', products: [], sections: {} },
            food: { name: '🥐 Food', products: [] },
            ingredient: { name: '🛒 Ingredients', products: [] },
            merch: { name: '👕 Merchandise', products: [] }
        };

        this.products.forEach(product => {
            if (categories[product.category]) {
                if (product.category === 'drink' && product.menu_section) {
                    // Group drinks by menu_section
                    const section = product.menu_section;
                    if (!categories.drink.sections[section]) {
                        categories.drink.sections[section] = [];
                    }
                    categories.drink.sections[section].push(product);
                } else {
                    // Non-drinks or drinks without menu_section go to main category
                    categories[product.category].products.push(product);
                }
            }
        });

        let html = '';
        Object.entries(categories).forEach(([categoryKey, category]) => {
            if (categoryKey === 'drink') {
                // Render drinks grouped by menu_section
                const sections = Object.keys(category.sections).sort();
                const drinksWithoutSection = category.products;
                
                if (sections.length > 0 || drinksWithoutSection.length > 0) {
                    html += `<div class="menu-category">`;
                    html += `<h2>${category.name}</h2>`;
                    
                    // Render drinks by section
                    sections.forEach(section => {
                        html += `<h3 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--deep-brown); font-size: 1.3rem;">${section}</h3>`;
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
                html += `<h2>${category.name}</h2>`;
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
        const isDrink = product.category === 'drink';
        const description = product.description || '';
        const productId = product.id;
        
        return `
            <div class="menu-line-item" data-product-id="${productId}">
                <div class="menu-line-item-info">
                    <div class="menu-item-name-text">${product.name}</div>
                    ${description ? `<div class="menu-item-description">${description}</div>` : ''}
                </div>
                <div class="menu-line-item-price">$${parseFloat(product.price).toFixed(2)}</div>
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
        
        this.cart.push({
            cartItemId: cartItemId,
            productId: product.id,
            name: product.name,
            category: product.category,
            basePrice: parseFloat(product.price),
            priceAdjustment: priceAdjustment,
            finalPrice: finalPrice,
            taxRate: parseFloat(product.tax_rate),
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
        if (product.category === 'drink') {
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
            this.cart.push({
                cartItemId: cartItemId,
                productId: productId,
                name: product.name,
                category: product.category,
                basePrice: parseFloat(product.price),
                priceAdjustment: 0,
                finalPrice: parseFloat(product.price),
                taxRate: parseFloat(product.tax_rate),
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

