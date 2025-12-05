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

        const categories = {
            drink: { name: '☕ Drinks', products: [] },
            food: { name: '🥐 Food', products: [] },
            ingredient: { name: '🛒 Ingredients', products: [] },
            merch: { name: '👕 Merchandise', products: [] }
        };

        this.products.forEach(product => {
            if (categories[product.category]) {
                categories[product.category].products.push(product);
            }
        });

        let html = '';
        Object.values(categories).forEach(category => {
            if (category.products.length === 0) return;

            html += `<div class="menu-category">`;
            html += `<h2>${category.name}</h2>`;
            html += `<div class="menu-grid">`;

            category.products.forEach(product => {
                html += `
                    <div class="menu-item coffee-club-item">
                        <h3>${product.name}</h3>
                        <p class="description">${product.description || ''}</p>
                        <p class="price">$${product.price.toFixed(2)}</p>
                        <div class="add-to-cart-controls">
                            <button class="btn btn-sm" onclick="coffeeClubMenu.addToCart('${product.id}')">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = this.cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                productId: productId,
                name: product.name,
                category: product.category,
                price: parseFloat(product.price),
                taxRate: parseFloat(product.tax_rate),
                quantity: 1
            });
        }

        this.updateCartDisplay();
        this.showCartNotification();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.updateCartDisplay();
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.productId === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
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
            const itemSubtotal = item.price * item.quantity;
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
            const itemSubtotal = item.price * item.quantity;
            const itemTax = itemSubtotal * item.taxRate;
            const itemTotal = itemSubtotal + itemTax;

            html += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="coffeeClubMenu.removeFromCart('${item.productId}')">×</button>
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
            alert('Please sign in to checkout');
            return;
        }

        if (this.cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        const balance = await accountManager.getBalance();
        const totals = this.calculateTotals();

        if (balance < totals.total) {
            alert(`Insufficient balance. You have $${balance.toFixed(2)}, but need $${totals.total.toFixed(2)}. Please fund your account.`);
            return;
        }

        // Process order
        const orderProcessor = new OrderProcessor();
        const result = await orderProcessor.processOrder(this.cart, totals);

        if (result.success) {
            this.cart = [];
            this.updateCartDisplay();
            alert('Order placed successfully!');
            // Refresh account balance
            await accountManager.getAccount();
            window.dispatchEvent(new CustomEvent('accountUpdated'));
        } else {
            alert('Error processing order: ' + result.error);
        }
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
    }
}

// Global menu instance
const coffeeClubMenu = new CoffeeClubMenu();

