// Coffee Club Menu Component
// Displays products and handles cart functionality

class CoffeeClubMenu {
    constructor() {
        this.products = [];
        this.cart = [];
        this.productsLoaded = false;
        
        // Wait for Supabase to be ready before loading products
        if (typeof configManager !== 'undefined' && configManager.isSupabaseConfigured()) {
            // Supabase is configured, wait for it to be ready
            window.addEventListener('supabaseReady', () => {
                this.loadProducts();
            }, { once: true });
            
            // Fallback: Check if Supabase is already ready
            setTimeout(() => {
                const client = getSupabaseClient();
                if (client && !this.productsLoaded) {
                    this.loadProducts();
                }
            }, 100);
        } else {
            // Supabase not configured yet, wait for config
            window.addEventListener('configLoaded', () => {
                if (configManager.isSupabaseConfigured()) {
                    window.addEventListener('supabaseReady', () => {
                        this.loadProducts();
                    }, { once: true });
                }
            }, { once: true });
        }
    }

    async loadProducts() {
        const client = getSupabaseClient();
        if (!client) {
            console.error('Supabase not configured - will retry when Supabase is ready');
            this.products = [];
            this.renderMenu();
            // Don't set productsLoaded to true, so it will retry later
            return;
        }
        
        this.productsLoaded = true;

        const shopId = configManager.getShopId();
        if (!shopId) {
            console.error('Shop ID not configured - cannot load products');
            this.products = [];
            this.renderMenu();
            return;
        }

        try {
            // Load products with their categories (including display_order for sorting)
            const { data, error } = await client
                .from('products')
                .select(`
                    *,
                    menu_categories (
                        id,
                        name,
                        type,
                        display_order
                    )
                `)
                .eq('available', true)
                .eq('shop_id', shopId)
                .order('name', { ascending: true });

            if (error) throw error;
            
            this.products = data || [];
            
            // Load sizes for all products (check both has_sizes flag and actual sizes in DB)
            // Get all product IDs first
            const allProductIds = this.products.map(p => p.id);
            
            if (allProductIds.length > 0) {
                const { data: sizesData, error: sizesError } = await client
                    .from('product_sizes')
                    .select('product_id, price')
                    .eq('shop_id', shopId)
                    .in('product_id', allProductIds)
                    .eq('available', true);
                
                if (sizesError) {
                    console.error('Error loading product sizes:', sizesError);
                } else if (sizesData && sizesData.length > 0) {
                    console.log(`Loaded ${sizesData.length} product sizes`);
                    
                    // Group sizes by product_id
                    const sizesByProduct = {};
                    sizesData.forEach(size => {
                        if (!sizesByProduct[size.product_id]) {
                            sizesByProduct[size.product_id] = [];
                        }
                        sizesByProduct[size.product_id].push(parseFloat(size.price));
                    });
                    
                    // Attach sizes to products
                    this.products.forEach(product => {
                        if (sizesByProduct[product.id]) {
                            product.sizes = sizesByProduct[product.id];
                            console.log(`Product "${product.name}" has ${product.sizes.length} sizes:`, product.sizes);
                        }
                    });
                } else {
                    console.log('No product sizes found');
                }
            }
            
            console.log('Loaded products for Coffee Club Menu:', this.products.length);
            console.log('Sample products:', this.products.slice(0, 3).map(p => ({
                id: p.id,
                name: p.name,
                category_id: p.category_id,
                has_menu_categories: !!p.menu_categories,
                menu_categories: p.menu_categories,
                has_sizes: p.has_sizes,
                sizes_count: p.sizes ? p.sizes.length : 0
            })));
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
            // Check if product has category relationship
            if (!product.category_id) {
                console.warn('Product missing category_id:', product.id, product.name);
                return; // Skip products without category_id
            }
            
            // Handle both single category object and array (Supabase join can return either)
            const category = Array.isArray(product.menu_categories) 
                ? product.menu_categories[0] 
                : product.menu_categories;
            
            if (!category) {
                console.warn('Product missing menu_categories relationship:', product.id, product.name, 'category_id:', product.category_id);
                return; // Skip products without category relationship
            }
            
            const categoryId = product.category_id;
            
            if (!categoriesMap[categoryId]) {
                // Get emoji for category type
                const emoji = this.getCategoryEmoji(category.type);
                categoriesMap[categoryId] = {
                    id: categoryId,
                    name: category.name,
                    type: category.type,
                    display_order: category.display_order,
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
        });

        // Sort categories by display_order (primary), then by type, then by name
        const sortedCategories = Object.values(categoriesMap).sort((a, b) => {
            // Primary sort: display_order (handle 0 correctly - don't treat it as falsy)
            const orderA = (a.display_order !== null && a.display_order !== undefined) ? parseInt(a.display_order) : 999999;
            const orderB = (b.display_order !== null && b.display_order !== undefined) ? parseInt(b.display_order) : 999999;
            if (orderA !== orderB) return orderA - orderB;
            
            // Secondary sort: type (if display_order is the same)
            const typeA = a.type || '';
            const typeB = b.type || '';
            if (typeA !== typeB) return typeA.localeCompare(typeB);
            
            // Tertiary sort: name
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
        const hasImage = product.image_url && product.image_url.trim() !== '';
        
        // Calculate price display - show range if product has sizes
        let priceDisplay = '';
        if (product.sizes && product.sizes.length > 0) {
            const minPrice = Math.min(...product.sizes);
            const maxPrice = Math.max(...product.sizes);
            if (minPrice === maxPrice) {
                priceDisplay = `$${minPrice.toFixed(2)}`;
            } else {
                priceDisplay = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
            }
            console.log(`Product "${product.name}" price range: ${priceDisplay}`, product.sizes);
        } else {
            priceDisplay = `$${parseFloat(product.price || 0).toFixed(2)}`;
            if (product.has_sizes) {
                console.log(`Product "${product.name}" has has_sizes=true but no sizes array`, product);
            }
        }
        
        return `
            <div class="menu-line-item" data-product-id="${productId}">
                ${hasImage ? `
                    <div class="menu-line-item-image" style="width: 60px; height: 60px; flex-shrink: 0; border-radius: 8px; overflow: hidden; margin-right: 1rem;">
                        <img src="${product.image_url}" alt="${this.escapeHtml(product.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                ` : ''}
                <div class="menu-line-item-info" style="${hasImage ? '' : 'flex: 1;'}">
                    <div class="menu-item-name-text">${this.escapeHtml(product.name)}</div>
                    ${description ? `<div class="menu-item-description">${this.escapeHtml(description)}</div>` : ''}
                </div>
                <div class="menu-line-item-price">${priceDisplay}</div>
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
        const { product, customizations, recipeIngredients, priceAdjustment, finalPrice, basePrice, selectedSize } = customizedDrink;
        
        // Create a unique cart item ID that includes customizations and size
        const sizeSuffix = selectedSize ? `_${selectedSize}` : '';
        const cartItemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${sizeSuffix}`;
        
        const categoryType = product.menu_categories?.type || 'drink';
        
        // Build display name with size
        let displayName = product.name;
        if (selectedSize) {
            displayName += ` (${selectedSize})`;
        } else if (product.fixed_size_oz) {
            displayName += ` (${product.fixed_size_oz}oz)`;
        }
        
        // Use the basePrice passed from the customizer (which is the size price if size selected)
        // Fall back to product.price if basePrice not provided
        const basePriceForCart = basePrice !== undefined ? basePrice : parseFloat(product.price || 0);
        
        this.cart.push({
            cartItemId: cartItemId,
            productId: product.id,
            name: displayName,
            originalName: product.name, // Keep original name for reference
            selectedSize: selectedSize, // Store selected size name
            category: categoryType,
            basePrice: basePriceForCart,
            priceAdjustment: priceAdjustment,
            finalPrice: finalPrice,
            taxRate: parseFloat(product.tax_rate || 0.0825),
            quantity: 1,
            customizations: customizations, // Price adjustments only
            recipeIngredients: recipeIngredients || [] // Full recipe for order label
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
            const itemTax = itemSubtotal * (item.taxRate || 0);
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
                            ${itemTax > 0 ? `<span style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-left: 0.5rem;">+ tax</span>` : ''}
                        </p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.cartItemId}', ${item.quantity - 1})">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="coffeeClubMenu.updateQuantity('${item.cartItemId}', ${item.quantity + 1})">+</button>
                        <button class="remove-btn" onclick="coffeeClubMenu.removeFromCart('${item.cartItemId}')">×</button>
                    </div>
                    <div class="cart-item-total">
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">$${itemSubtotal.toFixed(2)}</div>
                        ${itemTax > 0 ? `<div style="font-size: 0.75rem; color: var(--text-dark); opacity: 0.6;">+$${itemTax.toFixed(2)} tax</div>` : ''}
                        <div style="font-weight: 600; color: var(--deep-brown); margin-top: 0.25rem;">$${itemTotal.toFixed(2)}</div>
                    </div>
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

