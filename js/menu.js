// Menu Display Module
// Handles loading and displaying menu items from the database

class MenuDisplay {
    constructor() {
        this.categories = [];
        this.products = [];
    }

    // Get all categories (public access - no auth required)
    async getAllCategories(type = null) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
            let query = client
                .from('menu_categories')
                .select('*')
                .eq('available', true)
                .order('type', { ascending: true })
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, categories: data || [] };
        } catch (error) {
            console.error('Get all categories error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all products (public access - no auth required)
    async getAllProducts() {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        try {
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
            return { success: true, products: data || [] };
        } catch (error) {
            console.error('Get all products error:', error);
            return { success: false, error: error.message };
        }
    }

    // Format price for display
    formatPrice(price) {
        if (!price && price !== 0) return 'Price TBD';
        return `$${parseFloat(price).toFixed(2)}`;
    }

    // Get emoji for category type
    getCategoryEmoji(type) {
        const emojis = {
            'drink': '☕',
            'food': '🥐',
            'merch': '🛍️',
            'ingredient': '✨'
        };
        return emojis[type] || '📋';
    }

    // Render menu items
    renderMenuItems() {
        const container = document.getElementById('menu-content');
        if (!container) return;

        // Group products by category
        const productsByCategory = {};
        this.products.forEach(product => {
            if (product.menu_categories && product.category_id) {
                const categoryId = product.category_id;
                if (!productsByCategory[categoryId]) {
                    productsByCategory[categoryId] = [];
                }
                productsByCategory[categoryId].push(product);
            }
        });

        // Group categories by type
        const categoriesByType = {
            'drink': [],
            'food': [],
            'merch': []
        };

        this.categories.forEach(category => {
            if (categoriesByType[category.type]) {
                categoriesByType[category.type].push(category);
            }
        });

        let html = '';

        // Render drinks
        if (categoriesByType.drink.length > 0) {
            categoriesByType.drink.forEach(category => {
                const categoryProducts = productsByCategory[category.id] || [];
                if (categoryProducts.length > 0) {
                    html += this.renderCategorySection(category, categoryProducts);
                }
            });
        }

        // Render food
        if (categoriesByType.food.length > 0) {
            categoriesByType.food.forEach(category => {
                const categoryProducts = productsByCategory[category.id] || [];
                if (categoryProducts.length > 0) {
                    html += this.renderCategorySection(category, categoryProducts);
                }
            });
        }

        // Render merch
        if (categoriesByType.merch.length > 0) {
            categoriesByType.merch.forEach(category => {
                const categoryProducts = productsByCategory[category.id] || [];
                if (categoryProducts.length > 0) {
                    html += this.renderCategorySection(category, categoryProducts);
                }
            });
        }

        if (!html) {
            html = '<p style="text-align: center; color: var(--text-dark); opacity: 0.7; padding: 3rem;">No menu items available at this time. Please check back soon!</p>';
        }

        container.innerHTML = html;
    }

    // Render a category section
    renderCategorySection(category, products) {
        const emoji = this.getCategoryEmoji(category.type);
        let html = `
            <div class="menu-category">
                <h2>${emoji} ${category.name}</h2>
                <div class="menu-grid">
        `;

        products.forEach(product => {
            html += this.renderProductItem(product, category.type);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    // Render a single product item
    renderProductItem(product, categoryType) {
        let html = '<div class="menu-item">';
        
        // Add image if available (for food and merch)
        if (product.image_url && (categoryType === 'food' || categoryType === 'merch')) {
            html += `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">`;
        }
        
        html += `<h3>${this.escapeHtml(product.name)}</h3>`;
        
        if (product.description) {
            html += `<p class="description">${this.escapeHtml(product.description)}</p>`;
        }
        
        html += `<p class="price">${this.formatPrice(product.price)}</p>`;
        
        html += '</div>';
        return html;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Load and display menu
    async loadMenu() {
        try {
            // Load categories
            const categoriesResult = await this.getAllCategories();
            if (!categoriesResult.success) {
                console.error('Failed to load categories:', categoriesResult.error);
                return;
            }
            this.categories = categoriesResult.categories;

            // Load products
            const productsResult = await this.getAllProducts();
            if (!productsResult.success) {
                console.error('Failed to load products:', productsResult.error);
                return;
            }
            this.products = productsResult.products;

            // Render menu
            this.renderMenuItems();
        } catch (error) {
            console.error('Error loading menu:', error);
            const container = document.getElementById('menu-content');
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: var(--auburn); padding: 3rem;">Error loading menu. Please try again later.</p>';
            }
        }
    }
}

// Global menu display instance
const menuDisplay = new MenuDisplay();

