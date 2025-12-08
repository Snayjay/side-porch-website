// Admin UI Components
// Handles rendering and interaction for admin interface

class AdminUI {
    constructor() {
        this.currentView = 'menu';
        this.editingCategory = null;
        this.editingProduct = null;
        this.editingIngredient = null;
        this.editingDrinkIngredients = null;
        this.selectedCategoryType = 'drink';
        this.selectedCategoryId = null;
    }

    async init() {
        // Show debug info immediately
        const container = document.getElementById('admin-content');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-dark);">Checking authorization...</p>';
        }
        
        try {
            console.log('Admin UI: Starting initialization...');
            
            // Wait a moment for Supabase to restore session from storage
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Wait for user to be authenticated - try multiple times if needed
            let user = await authManager.getCurrentUser();
            console.log('Admin UI: User (first attempt):', user ? user.email : 'null');
            
            // If no user, wait a bit more and try again (session might still be restoring)
            if (!user) {
                console.log('Admin UI: No user on first attempt, waiting for session restore...');
                await new Promise(resolve => setTimeout(resolve, 500));
                user = await authManager.getCurrentUser();
                console.log('Admin UI: User (second attempt):', user ? user.email : 'null');
            }
            
            if (!user) {
                console.log('Admin UI: No user found after waiting, redirecting to coffee-club.html');
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: var(--auburn);">Not logged in. Redirecting...</p>';
                }
                // Add delay so user can see the message
                await new Promise(resolve => setTimeout(resolve, 2000));
                window.location.href = 'coffee-club.html';
                return;
            }

            // Show progress
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-dark);">Checking role...</p>';
            }

            // Clear cached role to force fresh check
            adminManager.clearRoleCache();
            
            // Wait for role to be loaded
            const role = await adminManager.getUserRole();
            console.log('Admin UI: User role:', role);
            
            // Check if user is staff
            const isStaff = await adminManager.isStaff();
            console.log('Admin UI: Is staff?', isStaff);
            
            if (!isStaff) {
                console.error('Admin UI: User is not staff! Role:', role);
                console.error('Admin UI: User object:', user);
                console.error('Admin UI: AdminManager userRole cache:', adminManager.userRole);
                
                // Show detailed error message
                if (container) {
                    container.innerHTML = `
                        <div style="padding: 2rem; text-align: center;">
                            <h3 style="color: var(--auburn); margin-bottom: 1rem;">⚠️ Access Denied</h3>
                            <p style="color: var(--text-dark); margin-bottom: 1rem;">
                                You do not have staff access.
                            </p>
                            <div style="background: var(--cream); padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                                <p style="margin: 0.5rem 0;"><strong>Your role:</strong> ${role || 'unknown'}</p>
                                <p style="margin: 0.5rem 0;"><strong>Your email:</strong> ${user?.email || 'unknown'}</p>
                                <p style="margin: 0.5rem 0;"><strong>Expected role:</strong> staff</p>
                            </div>
                            <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 1.5rem; font-size: 0.9rem;">
                                If you believe this is an error, please check the browser console (F12) for details.
                            </p>
                            <div style="display: flex; gap: 1rem; justify-content: center;">
                                <button class="btn" onclick="location.reload()">Reload Page</button>
                                <button class="btn btn-secondary" onclick="window.location.href='coffee-club.html'">Go to Coffee Club</button>
                            </div>
                        </div>
                    `;
                }
                // Don't redirect automatically - let user see the message
                return;
            }

            console.log('Admin UI: User is staff, rendering dashboard...');
            await this.renderDashboard();
        } catch (error) {
            console.error('Admin UI initialization error:', error);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <h3 style="color: var(--auburn); margin-bottom: 1rem;">❌ Error Loading Staff Dashboard</h3>
                        <p style="color: var(--text-dark); margin-bottom: 1rem;">${error.message || 'An unexpected error occurred'}</p>
                        <pre style="background: var(--cream); padding: 1rem; border-radius: 8px; text-align: left; overflow-x: auto; font-size: 0.85rem;">${error.stack || error.toString()}</pre>
                        <p style="color: var(--text-dark); opacity: 0.7; margin-top: 1rem; margin-bottom: 1rem; font-size: 0.9rem;">Check the browser console (F12) for more details.</p>
                        <button class="btn" onclick="location.reload()">Reload Page</button>
                    </div>
                `;
            }
        }
    }

    async renderDashboard() {
        const container = document.getElementById('admin-content');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-dashboard">
                <h2>Staff Dashboard</h2>
                <div class="admin-nav-tabs">
                    <button class="admin-tab active" onclick="adminUI.showView('menu', event)">Menu Category Management</button>
                    <button class="admin-tab" onclick="adminUI.showView('ingredients', event)">Ingredients</button>
                    <button class="admin-tab" onclick="adminUI.showView('social', event)">Social Platforms</button>
                    <button class="admin-tab" onclick="adminUI.showView('users', event)">Users</button>
                </div>
                <div id="admin-view-content"></div>
            </div>
        `;

        await this.showView('menu');
    }

    async showView(view, event) {
        this.currentView = view;
        const content = document.getElementById('admin-view-content');
        if (!content) return;

        // Update tab states
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // Fallback: activate tab by text content
            document.querySelectorAll('.admin-tab').forEach(tab => {
                const tabText = tab.textContent.trim().toLowerCase();
                if ((view === 'menu' && tabText.includes('menu')) ||
                    (view === 'ingredients' && tabText.includes('ingredients')) ||
                    (view === 'users' && tabText.includes('users'))) {
                    tab.classList.add('active');
                }
            });
        }

        switch (view) {
            case 'menu':
                await this.renderMenuManagementView();
                break;
            case 'ingredients':
                await this.renderIngredientsView();
                break;
            case 'social':
                await this.renderSocialPlatformsView();
                break;
            case 'users':
                await this.renderUsersView();
                break;
        }
    }

    async renderMenuManagementView() {
        const content = document.getElementById('admin-view-content');
        if (!content) return;

        try {
            // Get all categories grouped by type
            const categoriesResult = await adminManager.getAllCategories(null, true);
            const allCategories = categoriesResult.success ? categoriesResult.categories : [];
        
        const categoriesByType = {
            drink: allCategories.filter(c => c.type === 'drink'),
            food: allCategories.filter(c => c.type === 'food'),
            merch: allCategories.filter(c => c.type === 'merch'),
            ingredient: allCategories.filter(c => c.type === 'ingredient')
        };

        content.innerHTML = `
            <div class="admin-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>Menu Category Management</h3>
                    <button class="btn" onclick="adminUI.showCategoryForm()">+ Add Category</button>
                </div>

                <!-- Category Type Tabs -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                    <button class="category-type-tab ${this.selectedCategoryType === 'drink' ? 'active' : ''}" 
                            onclick="adminUI.selectCategoryType('drink')" 
                            style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid ${this.selectedCategoryType === 'drink' ? 'var(--accent-orange)' : 'transparent'}; color: var(--deep-brown); cursor: pointer; font-weight: ${this.selectedCategoryType === 'drink' ? '600' : '400'};">
                        Drinks
                    </button>
                    <button class="category-type-tab ${this.selectedCategoryType === 'ingredient' ? 'active' : ''}" 
                            onclick="adminUI.selectCategoryType('ingredient')" 
                            style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid ${this.selectedCategoryType === 'ingredient' ? 'var(--accent-orange)' : 'transparent'}; color: var(--deep-brown); cursor: pointer; font-weight: ${this.selectedCategoryType === 'ingredient' ? '600' : '400'};">
                        Ingredients
                    </button>
                    <button class="category-type-tab ${this.selectedCategoryType === 'food' ? 'active' : ''}" 
                            onclick="adminUI.selectCategoryType('food')" 
                            style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid ${this.selectedCategoryType === 'food' ? 'var(--accent-orange)' : 'transparent'}; color: var(--deep-brown); cursor: pointer; font-weight: ${this.selectedCategoryType === 'food' ? '600' : '400'};">
                        Food
                    </button>
                    <button class="category-type-tab ${this.selectedCategoryType === 'merch' ? 'active' : ''}" 
                            onclick="adminUI.selectCategoryType('merch')" 
                            style="padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 2px solid ${this.selectedCategoryType === 'merch' ? 'var(--accent-orange)' : 'transparent'}; color: var(--deep-brown); cursor: pointer; font-weight: ${this.selectedCategoryType === 'merch' ? '600' : '400'};">
                        Merch
                    </button>
                </div>

                <!-- Categories and Items -->
                <div id="menu-categories-container">
                    <p style="text-align: center; color: var(--text-dark); opacity: 0.7;">Loading categories...</p>
                </div>
            </div>
        `;

            // Load categories and items asynchronously
            await this.loadCategoriesAndItems(categoriesByType[this.selectedCategoryType] || [], this.selectedCategoryType);
        } catch (error) {
            console.error('Error rendering menu management view:', error);
            content.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h3 style="color: var(--auburn); margin-bottom: 1rem;">Error Loading Menu</h3>
                    <p style="color: var(--text-dark); margin-bottom: 1rem;">${error.message || 'An error occurred while loading the menu'}</p>
                    <button class="btn" onclick="adminUI.renderMenuManagementView()">Retry</button>
                </div>
            `;
        }
    }

    async loadCategoriesAndItems(categories, type) {
        const container = document.getElementById('menu-categories-container');
        if (!container) return;

        if (categories.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-dark); opacity: 0.7; padding: 2rem;">No ${type} categories yet. Create one to get started!</p>`;
            return;
        }

        container.innerHTML = '<div style="display: grid; gap: 2rem;">Loading...</div>';
        
        let html = '<div style="display: grid; gap: 2rem;">';
        
        // Render categories asynchronously
        for (const category of categories) {
            const categoryHtml = await this.renderCategorySection(category, type);
            html += categoryHtml;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    async renderCategorySection(category, type) {
        // Get products for this category
        const productsResult = await adminManager.getProductsByCategory(category.id, true);
        const products = productsResult.success ? productsResult.products : [];

        let html = `
            <div class="category-section" style="border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 10px; padding: 1.5rem; background: var(--cream);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: var(--deep-brown); font-size: 1.3rem;">${category.name}</h4>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm" onclick="adminUI.showCategoryForm('${category.id}')">Edit</button>
                        ${type === 'drink' ? 
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'drink')">+ Add Drink</button>` :
                            type === 'food' ?
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'food')">+ Add Food Item</button>` :
                            type === 'merch' ?
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'merch')">+ Add Merch Item</button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-danger" onclick="adminUI.deleteCategory('${category.id}')">Delete</button>
                    </div>
                </div>
        `;

        if (products.length === 0) {
            html += `<p style="color: var(--text-dark); opacity: 0.6; font-style: italic; margin: 1rem 0;">No items in this category yet.</p>`;
        } else {
            if (type === 'drink') {
                html += this.renderDrinkItems(products);
            } else {
                html += this.renderFoodMerchItems(products, type);
            }
        }

        html += '</div>';
        return html;
    }

    renderDrinkItems(products) {
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">';
        products.forEach(product => {
            html += `
                <div style="background: var(--parchment); padding: 1rem; border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);">
                    <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.5rem;">${product.name}</div>
                    <div style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.8; margin-bottom: 0.5rem;">$${parseFloat(product.price).toFixed(2)}</div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button class="btn btn-sm" onclick="adminUI.editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-sm" onclick="adminUI.manageDrinkIngredients('${product.id}')">Recipe</button>
                        <button class="btn btn-sm btn-danger" onclick="adminUI.deleteProduct('${product.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    renderFoodMerchItems(products, type) {
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">';
        products.forEach(product => {
            html += `
                <div style="background: var(--parchment); padding: 1rem; border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);">
                    ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 0.75rem;">` : ''}
                    <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.5rem;">${product.name}</div>
                    ${product.description ? `<div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-bottom: 0.5rem; line-height: 1.4;">${product.description.substring(0, 60)}${product.description.length > 60 ? '...' : ''}</div>` : ''}
                    <div style="font-size: 0.9rem; color: var(--deep-brown); font-weight: 600; margin-bottom: 0.75rem;">$${parseFloat(product.price).toFixed(2)}</div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm" onclick="adminUI.editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="adminUI.deleteProduct('${product.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async selectCategoryType(type) {
        this.selectedCategoryType = type;
        await this.renderMenuManagementView();
    }

    showCategoryForm(categoryId = null) {
        this.editingCategory = categoryId;
        const modal = this.createModal(
            categoryId ? 'Edit Category' : 'Add Category',
            this.getCategoryFormHTML(categoryId)
        );
        document.body.appendChild(modal);

        if (categoryId) {
            this.loadCategoryData(categoryId);
        }
    }

    getCategoryFormHTML(categoryId) {
        return `
            <form id="category-form" onsubmit="adminUI.saveCategory(event)">
                <div class="form-group">
                    <label for="category-name">Name *</label>
                    <input type="text" id="category-name" required>
                </div>
                <div class="form-group">
                    <label for="category-type">Type *</label>
                    <select id="category-type" required ${categoryId ? 'disabled' : ''}>
                        <option value="drink">Drink</option>
                        <option value="food">Food</option>
                        <option value="merch">Merch</option>
                        <option value="ingredient">Ingredient</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="category-display-order">Display Order</label>
                    <input type="number" id="category-display-order" min="0" value="0">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="category-available" checked> Available
                    </label>
                </div>
                <div id="category-form-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                </div>
            </form>
        `;
    }

    async loadCategoryData(categoryId) {
        const result = await adminManager.getAllCategories(null, true);
        const category = result.categories?.find(c => c.id === categoryId);
        
        if (category) {
            document.getElementById('category-name').value = category.name || '';
            document.getElementById('category-type').value = category.type || 'drink';
            document.getElementById('category-display-order').value = category.display_order || 0;
            document.getElementById('category-available').checked = category.available !== false;
        }
    }

    async saveCategory(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('category-form-error');
        errorDiv.style.display = 'none';

        const categoryData = {
            name: document.getElementById('category-name').value.trim(),
            type: document.getElementById('category-type').value,
            display_order: document.getElementById('category-display-order').value,
            available: document.getElementById('category-available').checked
        };

        let result;
        if (this.editingCategory) {
            result = await adminManager.updateCategory(this.editingCategory, categoryData);
        } else {
            result = await adminManager.createCategory(categoryData);
        }

        if (result.success) {
            document.querySelector('.admin-modal-overlay')?.remove();
            await this.renderMenuManagementView();
            errorDialog.showSuccess(
                this.editingCategory ? 'Category updated successfully!' : 'Category created successfully!',
                'Success'
            );
            this.editingCategory = null;
        } else {
            errorDiv.textContent = result.error || 'Error saving category';
            errorDiv.style.display = 'block';
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category? All items in this category will also be deleted.')) return;
        const result = await adminManager.deleteCategory(categoryId);
        if (result.success) {
            await this.renderMenuManagementView();
            errorDialog.showSuccess('Category deleted successfully!', 'Success');
        } else {
            errorDialog.show(result.error || 'Error deleting category', 'Error');
        }
    }

    async showProductForm(productId = null, categoryId = null, productType = null) {
        this.editingProduct = productId;
        this.selectedCategoryId = categoryId;
        
        // Determine product type
        if (!productType && productId) {
            // Load product to get type
            await this.loadProductForForm(productId);
            return;
        }
        
        if (!productType && categoryId) {
            // Get type from category
            const categoryResult = await adminManager.getAllCategories(null, true);
            const category = categoryResult.categories?.find(c => c.id === categoryId);
            if (category) {
                productType = category.type;
                await this.showProductFormModal(productId, categoryId, productType);
            }
            return;
        }

        await this.showProductFormModal(productId, categoryId, productType);
    }

    async loadProductForForm(productId) {
        const result = await adminManager.getAllProducts(true);
        const product = result.products?.find(p => p.id === productId);
        
        if (product) {
            const categoryId = product.category_id;
            const categoryResult = await adminManager.getAllCategories(null, true);
            const category = categoryResult.categories?.find(c => c.id === categoryId);
            const productType = category?.type || 'drink';
            await this.showProductFormModal(productId, categoryId, productType);
        }
    }

    async showProductFormModal(productId, categoryId, productType) {
        // Load categories for dropdown first
        const categoryResult = await adminManager.getAllCategories(productType, true);
        const categories = categoryResult.categories || [];
        
        const modal = this.createModal(
            productId ? 'Edit Item' : `Add ${productType === 'drink' ? 'Drink' : productType === 'food' ? 'Food Item' : 'Merch Item'}`,
            this.getProductFormHTML(productId, categoryId, productType, categories)
        );
        document.body.appendChild(modal);

        // Populate category dropdown
        const categorySelect = document.getElementById('product-category-id');
        categorySelect.innerHTML = '<option value="">Select a category...</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            if (categoryId && cat.id === categoryId) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });

        if (productId) {
            await this.loadProductData(productId);
        }
    }

    getProductFormHTML(productId, categoryId, productType, categories = []) {
        const isDrink = productType === 'drink';
        
        let categoryOptions = '<option value="">Select a category...</option>';
        categories.forEach(cat => {
            const selected = categoryId && cat.id === categoryId ? 'selected' : '';
            categoryOptions += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
        });
        
        return `
            <form id="product-form" onsubmit="adminUI.saveProduct(event)">
                <div class="form-group">
                    <label for="product-name">Name *</label>
                    <input type="text" id="product-name" required>
                </div>
                <div class="form-group">
                    <label for="product-description">Description</label>
                    <textarea id="product-description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="product-category-id">Category *</label>
                    <select id="product-category-id" required>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="product-price">Price *</label>
                    <input type="number" id="product-price" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="product-tax-rate">Tax Rate</label>
                    <input type="number" id="product-tax-rate" step="0.0001" min="0" max="1" value="0.0825">
                </div>
                ${!isDrink ? `
                    <div class="form-group">
                        <label for="product-image-url">Image URL</label>
                        <input type="url" id="product-image-url" placeholder="https://example.com/image.jpg">
                    </div>
                ` : ''}
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="product-available" checked> Available
                    </label>
                </div>
                <div id="product-form-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                    ${isDrink && productId ? `<button type="button" class="btn" onclick="adminUI.manageDrinkIngredients('${productId}')">Manage Recipe</button>` : ''}
                </div>
            </form>
        `;
    }

    async loadProductData(productId) {
        const result = await adminManager.getAllProducts(true);
        const product = result.products?.find(p => p.id === productId);
        
        if (product) {
            // Update category dropdown if needed
            const categorySelect = document.getElementById('product-category-id');
            if (categorySelect && product.category_id) {
                const option = categorySelect.querySelector(`option[value="${product.category_id}"]`);
                if (option) {
                    option.selected = true;
                }
            }

            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-tax-rate').value = product.tax_rate || 0.0825;
            const imageInput = document.getElementById('product-image-url');
            if (imageInput) {
                imageInput.value = product.image_url || '';
            }
            document.getElementById('product-available').checked = product.available !== false;
        }
    }

    async saveProduct(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('product-form-error');
        errorDiv.style.display = 'none';

        const categoryId = document.getElementById('product-category-id').value;
        if (!categoryId) {
            errorDiv.textContent = 'Please select a category';
            errorDiv.style.display = 'block';
            return;
        }

        const productData = {
            name: document.getElementById('product-name').value.trim(),
            description: document.getElementById('product-description').value.trim(),
            category_id: categoryId,
            price: document.getElementById('product-price').value,
            tax_rate: document.getElementById('product-tax-rate').value,
            image_url: document.getElementById('product-image-url')?.value.trim() || null,
            available: document.getElementById('product-available').checked
        };

        let result;
        if (this.editingProduct) {
            result = await adminManager.updateProduct(this.editingProduct, productData);
        } else {
            result = await adminManager.createProduct(productData);
        }

        if (result.success) {
            document.querySelector('.admin-modal-overlay')?.remove();
            await this.renderMenuManagementView();
            errorDialog.showSuccess(
                this.editingProduct ? 'Item updated successfully!' : 'Item created successfully!',
                'Success'
            );
            this.editingProduct = null;
        } else {
            errorDiv.textContent = result.error || 'Error saving item';
            errorDiv.style.display = 'block';
        }
    }

    async editProduct(productId) {
        const result = await adminManager.getAllProducts(true);
        const product = result.products?.find(p => p.id === productId);
        
        if (product) {
            const categoryResult = await adminManager.getAllCategories(null, true);
            const category = categoryResult.categories?.find(c => c.id === product.category_id);
            const productType = category?.type || 'drink';
            this.showProductForm(productId, product.category_id, productType);
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
        const result = await adminManager.deleteProduct(productId);
        if (result.success) {
            await this.renderMenuManagementView();
            errorDialog.showSuccess('Item deleted successfully!', 'Success');
        } else {
            errorDialog.show(result.error || 'Error deleting item', 'Error');
        }
    }

    async manageDrinkIngredients(productId) {
        this.editingDrinkIngredients = productId;
        const productResult = await adminManager.getAllProducts(true);
        const product = productResult.products?.find(p => p.id === productId);
        
        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];

        const drinkIngredientsResult = await adminManager.getDrinkIngredients(productId);
        const drinkIngredients = drinkIngredientsResult.drinkIngredients || [];
        const drinkIngredientMap = {};
        drinkIngredients.forEach(di => {
            drinkIngredientMap[di.ingredient_id] = di;
        });

        const modal = this.createModal(
            `Manage Recipe: ${product?.name || 'Drink'}`,
            this.getDrinkIngredientsFormHTML(allIngredients, drinkIngredientMap)
        );
        document.body.appendChild(modal);
    }

    getDrinkIngredientsFormHTML(allIngredients, drinkIngredientMap) {
        const categories = {
            base_drinks: { name: 'Base Drinks', ingredients: [] },
            sugars: { name: 'Sugars', ingredients: [] },
            liquid_creamers: { name: 'Liquid Creamers', ingredients: [] },
            toppings: { name: 'Toppings', ingredients: [] },
            add_ins: { name: 'Add-ins', ingredients: [] }
        };

        allIngredients.forEach(ing => {
            const cat = categories[ing.category] || categories.add_ins;
            cat.ingredients.push(ing);
        });

        let html = '<div style="max-height: 60vh; overflow-y: auto;">';
        Object.values(categories).forEach(category => {
            if (category.ingredients.length === 0) return;
            
            html += `<h4 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--deep-brown);">${category.name}</h4>`;
            category.ingredients.forEach(ing => {
                const di = drinkIngredientMap[ing.id];
                html += `
                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--cream); border-radius: 4px; margin-bottom: 0.5rem;">
                        <div style="flex: 1;">
                            <strong>${ing.name}</strong>
                            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">
                                ${ing.unit_type} • $${parseFloat(ing.unit_cost).toFixed(2)}/${ing.unit_type === 'shots' ? 'shot' : ing.unit_type === 'pumps' ? 'pump' : ing.unit_type}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <label style="font-size: 0.85rem;">Default:</label>
                            <input type="number" id="ing-${ing.id}-amount" step="0.1" min="0" value="${di?.default_amount || 0}" style="width: 60px; padding: 0.25rem;">
                        </div>
                        <div>
                            <label style="font-size: 0.85rem;">
                                <input type="checkbox" id="ing-${ing.id}-required" ${di?.is_required ? 'checked' : ''}> Required
                            </label>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem;">
                                <input type="checkbox" id="ing-${ing.id}-removable" ${di?.is_removable !== false ? 'checked' : ''}> Removable
                            </label>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem;">
                                <input type="checkbox" id="ing-${ing.id}-addable" ${di?.is_addable !== false ? 'checked' : ''}> Addable
                            </label>
                        </div>
                    </div>
                `;
            });
        });
        html += '</div>';
        html += `
            <div id="drink-ingredients-error" style="color: var(--auburn); margin: 1rem 0; display: none;"></div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                <button type="button" class="btn" onclick="adminUI.saveDrinkIngredients()">Save</button>
            </div>
        `;
        return html;
    }

    async saveDrinkIngredients() {
        const errorDiv = document.getElementById('drink-ingredients-error');
        errorDiv.style.display = 'none';

        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];

        const ingredients = [];
        allIngredients.forEach(ing => {
            const amount = parseFloat(document.getElementById(`ing-${ing.id}-amount`)?.value || 0);
            const required = document.getElementById(`ing-${ing.id}-required`)?.checked || false;
            const removable = document.getElementById(`ing-${ing.id}-removable`)?.checked !== false;
            const addable = document.getElementById(`ing-${ing.id}-addable`)?.checked !== false;

            if (amount > 0 || required) {
                ingredients.push({
                    ingredient_id: ing.id,
                    default_amount: amount,
                    is_required: required,
                    is_removable: removable,
                    is_addable: addable
                });
            }
        });

        const result = await adminManager.setDrinkIngredients(this.editingDrinkIngredients, ingredients);
        if (result.success) {
            document.querySelector('.admin-modal-overlay')?.remove();
            errorDialog.showSuccess('Drink recipe updated successfully!', 'Success');
            this.editingDrinkIngredients = null;
        } else {
            errorDiv.textContent = result.error || 'Error saving drink recipe';
            errorDiv.style.display = 'block';
        }
    }

    async renderIngredientsView() {
        const content = document.getElementById('admin-view-content');
        if (!content) return;

        const result = await adminManager.getAllIngredients(true);
        const ingredients = result.success ? result.ingredients : [];

        // Load unit types
        const unitTypesResult = await adminManager.getAllUnitTypes();
        const unitTypes = unitTypesResult.success ? unitTypesResult.unitTypes : [];

        content.innerHTML = `
            <div class="admin-section">
                <div class="ingredient-accordion" style="margin-bottom: 3rem;">
                    <button class="ingredient-accordion-header" onclick="adminUI.toggleUnitTypesAccordion()" type="button">
                        <span>Unit Types (${unitTypes.length})</span>
                        <svg class="accordion-icon" id="accordion-icon-unit-types" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="ingredient-accordion-content" id="accordion-content-unit-types" style="display: none;">
                        <div style="padding: 1.5rem;">
                            <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                                <button class="btn" onclick="adminUI.showUnitTypeForm()">+ Add Unit Type</button>
                            </div>
                            <div class="admin-table-container">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 30px;"></th>
                                            <th>Name</th>
                                            <th>Display Name</th>
                                            <th>Abbreviation</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="unit-types-table-body">
                                        ${unitTypes.map((ut, index) => `
                                            <tr data-unit-type-id="${ut.id}" style="cursor: move;">
                                                <td style="text-align: center; color: var(--text-dark); opacity: 0.5;">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <line x1="9" y1="5" x2="9" y2="19"></line>
                                                        <line x1="15" y1="5" x2="15" y2="19"></line>
                                                    </svg>
                                                </td>
                                                <td>${ut.name}</td>
                                                <td>${ut.display_name}</td>
                                                <td>${ut.abbreviation}</td>
                                                <td>
                                                    <button class="btn btn-sm" onclick="adminUI.editUnitType('${ut.id}')">Edit</button>
                                                    <button class="btn btn-sm btn-danger" onclick="adminUI.deleteUnitType('${ut.id}')">Delete</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>Ingredients</h3>
                    <button class="btn" onclick="adminUI.showIngredientForm()">+ Add Ingredient</button>
                </div>
                
                ${this.renderIngredientsAccordions(ingredients)}
            </div>
        `;

        // Initialize drag and drop for unit types
        this.initUnitTypeDragAndDrop();
    }

    initUnitTypeDragAndDrop() {
        const tbody = document.getElementById('unit-types-table-body');
        if (!tbody) return;

        let draggedElement = null;

        // Make rows draggable
        Array.from(tbody.querySelectorAll('tr')).forEach(row => {
            row.draggable = true;
            row.style.userSelect = 'none';
            row.style.cursor = 'move';

            row.addEventListener('dragstart', (e) => {
                draggedElement = row;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', row.outerHTML);
                row.style.opacity = '0.5';
                row.classList.add('dragging');
            });

            row.addEventListener('dragend', (e) => {
                row.style.opacity = '1';
                row.classList.remove('dragging');
                // Remove all drag-over classes
                Array.from(tbody.querySelectorAll('tr')).forEach(r => {
                    r.classList.remove('drag-over');
                });
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const afterElement = this.getDragAfterElement(tbody, e.clientY);
                
                if (draggedElement && afterElement == null) {
                    tbody.appendChild(draggedElement);
                } else if (draggedElement && afterElement && draggedElement !== afterElement) {
                    tbody.insertBefore(draggedElement, afterElement);
                }
            });

            row.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (row !== draggedElement) {
                    row.classList.add('drag-over');
                }
            });

            row.addEventListener('dragleave', (e) => {
                row.classList.remove('drag-over');
            });

            row.addEventListener('drop', async (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                
                if (draggedElement && draggedElement !== row) {
                    // Get new order
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    const newOrder = rows.map((r, index) => ({
                        id: r.dataset.unitTypeId,
                        display_order: index + 1
                    }));

                    // Update order in database
                    await this.updateUnitTypeOrder(newOrder);
                }
            });
        });
    }

    renderIngredientsAccordions(ingredients) {
        // Group ingredients by category
        const categories = {
            base_drinks: { name: 'Base Drinks', ingredients: [] },
            sugars: { name: 'Sugars', ingredients: [] },
            liquid_creamers: { name: 'Liquid Creamers', ingredients: [] },
            toppings: { name: 'Toppings', ingredients: [] },
            add_ins: { name: 'Add-ins', ingredients: [] }
        };

        ingredients.forEach(ing => {
            const cat = categories[ing.category] || categories.add_ins;
            cat.ingredients.push(ing);
        });

        // Generate accordion HTML
        return Object.entries(categories).map(([key, category]) => {
            const count = category.ingredients.length;
            return `
                <div class="ingredient-accordion" style="margin-bottom: 1rem;">
                    <button class="ingredient-accordion-header" onclick="adminUI.toggleIngredientAccordion('${key}')" type="button">
                        <span>${category.name} (${count})</span>
                        <svg class="accordion-icon" id="accordion-icon-${key}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="ingredient-accordion-content" id="accordion-content-${key}" style="display: none;">
                        <div class="admin-table-container">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Unit Type</th>
                                        <th>Unit Cost</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${category.ingredients.map(ing => `
                                        <tr>
                                            <td>${ing.name}</td>
                                            <td>${ing.unit_type}</td>
                                            <td>$${parseFloat(ing.unit_cost).toFixed(2)}</td>
                                            <td>${ing.available ? '<span style="color: green;">Active</span>' : '<span style="color: orange;">Unavailable</span>'}</td>
                                            <td>
                                                <button class="btn btn-sm" onclick="adminUI.editIngredient('${ing.id}')">Edit</button>
                                                <button class="btn btn-sm btn-danger" onclick="adminUI.deleteIngredient('${ing.id}')">Delete</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleIngredientAccordion(categoryKey) {
        const content = document.getElementById(`accordion-content-${categoryKey}`);
        const icon = document.getElementById(`accordion-icon-${categoryKey}`);
        
        if (!content || !icon) return;

        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        
        // Rotate icon
        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        icon.style.transition = 'transform 0.2s ease';
    }

    toggleUnitTypesAccordion() {
        const content = document.getElementById('accordion-content-unit-types');
        const icon = document.getElementById('accordion-icon-unit-types');
        
        if (!content || !icon) return;

        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        
        // Rotate icon
        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        icon.style.transition = 'transform 0.2s ease';
        
        // Initialize drag and drop when expanded (in case it wasn't initialized yet)
        if (!isExpanded) {
            setTimeout(() => {
                this.initUnitTypeDragAndDrop();
            }, 100);
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async updateUnitTypeOrder(orderedUnitTypes) {
        try {
            const result = await adminManager.updateUnitTypeOrder(orderedUnitTypes);
            if (result.success) {
                // Refresh the view
                await this.renderIngredientsView();
            } else {
                errorDialog.show(result.error || 'Error updating order', 'Error');
            }
        } catch (error) {
            console.error('Error updating unit type order:', error);
            errorDialog.show('Error updating order. Please try again.', 'Error');
        }
    }

    async showIngredientForm(ingredientId = null) {
        this.editingIngredient = ingredientId;
        const formHTML = await this.getIngredientFormHTML(ingredientId);
        const modal = this.createModal(
            ingredientId ? 'Edit Ingredient' : 'Add Ingredient',
            formHTML
        );
        document.body.appendChild(modal);

        if (ingredientId) {
            this.loadIngredientData(ingredientId);
        }
    }

    async getIngredientFormHTML(ingredientId) {
        // Load unit types from database
        const unitTypesResult = await adminManager.getAllUnitTypes();
        const unitTypes = unitTypesResult.success ? unitTypesResult.unitTypes : [];
        
        const unitTypeOptions = unitTypes.map(ut => 
            `<option value="${ut.name}">${ut.display_name}</option>`
        ).join('');

        return `
            <form id="ingredient-form" onsubmit="adminUI.saveIngredient(event)">
                <div class="form-group">
                    <label for="ingredient-name">Name *</label>
                    <input type="text" id="ingredient-name" required>
                </div>
                <div class="form-group">
                    <label for="ingredient-category">Category *</label>
                    <select id="ingredient-category" required>
                        <option value="base_drinks">Base Drinks</option>
                        <option value="sugars">Sugars</option>
                        <option value="liquid_creamers">Liquid Creamers</option>
                        <option value="toppings">Toppings</option>
                        <option value="add_ins">Add-ins</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="ingredient-unit-type">Unit Type *</label>
                    <select id="ingredient-unit-type" required>
                        ${unitTypeOptions || '<option value="">No unit types available</option>'}
                    </select>
                </div>
                <div class="form-group">
                    <label for="ingredient-unit-cost">Unit Cost *</label>
                    <input type="number" id="ingredient-unit-cost" step="0.0001" min="0" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="ingredient-available" checked> Available
                    </label>
                </div>
                <div id="ingredient-form-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                </div>
            </form>
        `;
    }

    async loadIngredientData(ingredientId) {
        const client = getSupabaseClient();
        const { data } = await client
            .from('ingredients')
            .select('*')
            .eq('id', ingredientId)
            .single();

        if (data) {
            document.getElementById('ingredient-name').value = data.name || '';
            document.getElementById('ingredient-category').value = data.category || 'add_ins';
            
            // Ensure unit type select is populated with current unit types
            const unitTypesResult = await adminManager.getAllUnitTypes();
            const unitTypes = unitTypesResult.success ? unitTypesResult.unitTypes : [];
            const unitTypeSelect = document.getElementById('ingredient-unit-type');
            
            // Update options if unit types are loaded
            if (unitTypes.length > 0) {
                const currentValue = unitTypeSelect.value;
                unitTypeSelect.innerHTML = unitTypes.map(ut => 
                    `<option value="${ut.name}">${ut.display_name}</option>`
                ).join('');
                // Restore the value if it still exists, otherwise use the data value
                if (unitTypes.some(ut => ut.name === currentValue)) {
                    unitTypeSelect.value = currentValue;
                } else {
                    unitTypeSelect.value = data.unit_type || (unitTypes.length > 0 ? unitTypes[0].name : 'count');
                }
            } else {
                unitTypeSelect.value = data.unit_type || 'count';
            }
            
            document.getElementById('ingredient-unit-cost').value = data.unit_cost || 0;
            document.getElementById('ingredient-available').checked = data.available !== false;
        }
    }

    async saveIngredient(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('ingredient-form-error');
        errorDiv.style.display = 'none';

        const ingredientData = {
            name: document.getElementById('ingredient-name').value.trim(),
            category: document.getElementById('ingredient-category').value,
            unit_type: document.getElementById('ingredient-unit-type').value,
            unit_cost: document.getElementById('ingredient-unit-cost').value,
            available: document.getElementById('ingredient-available').checked
        };

        let result;
        if (this.editingIngredient) {
            result = await adminManager.updateIngredient(this.editingIngredient, ingredientData);
        } else {
            result = await adminManager.createIngredient(ingredientData);
        }

        if (result.success) {
            document.querySelector('.admin-modal-overlay')?.remove();
            await this.renderIngredientsView();
            errorDialog.showSuccess(
                this.editingIngredient ? 'Ingredient updated successfully!' : 'Ingredient created successfully!',
                'Success'
            );
            this.editingIngredient = null;
        } else {
            errorDiv.textContent = result.error || 'Error saving ingredient';
            errorDiv.style.display = 'block';
        }
    }

    async editIngredient(ingredientId) {
        this.showIngredientForm(ingredientId);
    }

    async deleteIngredient(ingredientId) {
        if (!confirm('Are you sure you want to delete this ingredient? This action cannot be undone.')) return;
        const result = await adminManager.deleteIngredient(ingredientId);
        if (result.success) {
            await this.renderIngredientsView();
            errorDialog.showSuccess('Ingredient deleted successfully!', 'Success');
        } else {
            errorDialog.show(result.error || 'Error deleting ingredient', 'Error');
        }
    }

    async renderSocialPlatformsView() {
        const content = document.getElementById('admin-view-content');
        if (!content) return;

        const platforms = await adminManager.getSocialPlatforms();

        content.innerHTML = `
            <div class="admin-section">
                <h3>Social Platforms</h3>
                <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 1.5rem;">
                    Manage social media platform links displayed on the website.
                </p>
                <div id="admin-social-platforms">
                    ${this.renderSocialPlatformsList(platforms)}
                </div>
                <button class="btn btn-secondary" onclick="adminUI.addSocialPlatform()" style="margin-top: 1rem;">
                    + Add Platform
                </button>
            </div>
        `;
    }

    renderSocialPlatformsList(platforms) {
        if (platforms.length === 0) {
            return '<p style="color: var(--text-dark); opacity: 0.7; text-align: center; padding: 2rem;">No social platforms configured. Click "Add Platform" to add one.</p>';
        }

        return platforms.map((platform, index) => {
            // Check if platform is new/unsaved (no platform name or marked as new)
            const isNew = platform._isNew || !platform.platform || platform.platform.trim() === '';
            
            return `
            <div class="social-platform-item">
                ${isNew ? '' : `
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" 
                           id="admin-social-enabled-${index}"
                           ${platform.enabled ? 'checked' : ''}
                           onchange="adminUI.updateSocialPlatform(${index}, 'enabled', this.checked)">
                    <span style="font-size: 0.9rem; color: var(--text-dark);">Active</span>
                </label>
                `}
                <input type="text" 
                       class="platform-name"
                       id="admin-social-platform-${index}"
                       value="${platform.platform || ''}"
                       placeholder="Platform name"
                       onblur="adminUI.updateSocialPlatform(${index}, 'platform', this.value)">
                <input type="text" 
                       id="admin-social-url-${index}"
                       value="${platform.url || ''}"
                       placeholder="https://..."
                       onblur="adminUI.updateSocialPlatform(${index}, 'url', this.value)">
                ${isNew ? 
                    `<button class="btn" onclick="adminUI.saveNewSocialPlatform(${index})">Add</button>` :
                    `<button class="btn-remove" onclick="adminUI.removeSocialPlatform(${index})">Remove</button>`
                }
            </div>
        `;
        }).join('');
    }

    async addSocialPlatform() {
        const platforms = await adminManager.getSocialPlatforms();
        const newPlatform = {
            platform: '',
            url: '',
            enabled: false,
            _isNew: true  // Mark as new/unsaved
        };
        platforms.push(newPlatform);
        
        // Re-render just the social platforms section
        const container = document.getElementById('admin-social-platforms');
        if (container) {
            container.innerHTML = this.renderSocialPlatformsList(platforms);
        }
        
        // Focus on the platform name input for the new platform
        const newIndex = platforms.length - 1;
        const platformInput = document.getElementById(`admin-social-platform-${newIndex}`);
        if (platformInput) {
            platformInput.focus();
            platformInput.select();
        }
    }

    async updateSocialPlatform(index, field, value) {
        const platforms = await adminManager.getSocialPlatforms();
        if (!platforms[index]) {
            return;
        }

        if (field === 'enabled') {
            platforms[index].enabled = value;
        } else if (field === 'url') {
            platforms[index].url = value;
        } else if (field === 'platform') {
            platforms[index].platform = value;
        }
        
        // Only save platforms that have a name (empty platforms stay in local state for editing)
        const platformsToSave = platforms.filter(p => p.platform && p.platform.trim() !== '');
        
        // If we're updating a platform name and it's now empty, don't save yet
        if (field === 'platform' && !value.trim()) {
            // User cleared the name or hasn't entered one yet - don't save
            // Re-render to update button state
            const container = document.getElementById('admin-social-platforms');
            if (container) {
                container.innerHTML = this.renderSocialPlatformsList(platforms);
            }
            return;
        }
        
        // Save only platforms with names
        try {
            const result = await adminManager.setSocialPlatforms(platformsToSave);
            if (result.success) {
                // After saving, reload from database and merge with any local empty platforms
                const savedPlatforms = await adminManager.getSocialPlatforms();
                
                // Keep any empty platforms that are still being edited
                const emptyPlatforms = platforms.filter(p => !p.platform || !p.platform.trim());
                
                // Combine saved platforms with empty ones being edited
                const allPlatforms = [...savedPlatforms, ...emptyPlatforms];
                
                // Re-render to show updated state
                const container = document.getElementById('admin-social-platforms');
                if (container) {
                    container.innerHTML = this.renderSocialPlatformsList(allPlatforms);
                }
                
                // Update footer links
                await adminManager.updateFooterSocialLinks();
                
                errorDialog.showSuccess('Social platforms updated', 'Success');
            } else {
                errorDialog.show(`Error: ${result.error}`, 'Error');
            }
        } catch (error) {
            errorDialog.show(`Error saving: ${error.message}`, 'Error');
        }
    }

    async saveNewSocialPlatform(index) {
        // Get current values from the form inputs
        const platformNameInput = document.getElementById(`admin-social-platform-${index}`);
        const platformUrlInput = document.getElementById(`admin-social-url-${index}`);
        
        if (!platformNameInput) {
            errorDialog.show('Could not find platform input', 'Error');
            return;
        }

        const platformName = platformNameInput.value.trim();
        const platformUrl = platformUrlInput?.value.trim() || '';
        // New platforms default to enabled/active
        const enabled = true;

        if (!platformName) {
            errorDialog.show('Please enter a platform name', 'Validation Error');
            platformNameInput.focus();
            return;
        }

        // Get existing platforms from database
        const existingPlatforms = await adminManager.getSocialPlatforms();
        
        // Create new platform object
        const newPlatform = {
            platform: platformName,
            url: platformUrl,
            enabled: enabled
        };
        
        // Add to existing platforms
        const allPlatforms = [...existingPlatforms, newPlatform];

        // Save to database
        try {
            const result = await adminManager.setSocialPlatforms(allPlatforms);
            if (result.success) {
                // Reload from database to get the saved state
                const savedPlatforms = await adminManager.getSocialPlatforms();
                
                // Re-render to show only saved platforms (input fields will disappear)
                const container = document.getElementById('admin-social-platforms');
                if (container) {
                    container.innerHTML = this.renderSocialPlatformsList(savedPlatforms);
                }
                
                // Update footer links
                await adminManager.updateFooterSocialLinks();
                
                errorDialog.showSuccess('Social platform added successfully!', 'Success');
            } else {
                errorDialog.show(`Error: ${result.error}`, 'Error');
            }
        } catch (error) {
            console.error('Error saving social platform:', error);
            errorDialog.show(`Error saving: ${error.message}`, 'Error');
        }
    }

    async removeSocialPlatform(index) {
        if (confirm('Remove this social platform?')) {
            const platforms = await adminManager.getSocialPlatforms();
            platforms.splice(index, 1);
            
            // Re-render just the social platforms section
            const container = document.getElementById('admin-social-platforms');
            if (container) {
                container.innerHTML = this.renderSocialPlatformsList(platforms);
            }
            
            // Auto-save
            try {
                const result = await adminManager.setSocialPlatforms(platforms);
                if (result.success) {
                    await adminManager.updateFooterSocialLinks();
                    errorDialog.showSuccess('Platform removed', 'Success');
                } else {
                    errorDialog.show(`Error: ${result.error}`, 'Error');
                }
            } catch (error) {
                errorDialog.show(`Error saving: ${error.message}`, 'Error');
            }
        }
    }

    async renderUsersView() {
        const content = document.getElementById('admin-view-content');
        if (!content) return;

        const result = await adminManager.getAllUsers();
        const users = result.success ? result.users : [];

        content.innerHTML = `
            <div class="admin-section">
                <h3>User Management</h3>
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Balance</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            ${users.map(u => `
                                <tr>
                                    <td>${u.email}</td>
                                    <td>${u.full_name || '-'}</td>
                                    <td>
                                        <select id="role-${u.id}" onchange="adminUI.updateUserRole('${u.id}', this.value)" style="padding: 0.25rem;">
                                            <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
                                            <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>Staff</option>
                                        </select>
                                    </td>
                                    <td>$${parseFloat(u.balance || 0).toFixed(2)}</td>
                                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-sm" onclick="adminUI.updateUserRole('${u.id}', document.getElementById('role-${u.id}').value)" style="margin-right: 0.5rem;">Update Role</button>
                                        <button class="btn btn-sm" onclick="adminUI.editUserFunds('${u.id}', '${u.email}', '${u.full_name || ''}', ${parseFloat(u.balance || 0)})" style="background-color: var(--auburn);">Edit Funds</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async updateUserRole(userId, role) {
        const result = await adminManager.updateUserRole(userId, role);
        if (result.success) {
            errorDialog.showSuccess('User role updated successfully!', 'Success');
            await this.renderUsersView();
        } else {
            errorDialog.show(result.error || 'Error updating user role', 'Error');
        }
    }

    async editUserFunds(userId, userEmail, userName, currentBalance) {
        // Fetch user transactions
        const transactionsResult = await adminManager.getUserTransactions(userId);
        const transactions = transactionsResult.success ? transactionsResult.transactions : [];

        // Build transaction history HTML
        let transactionsHTML = '';
        if (transactions.length === 0) {
            transactionsHTML = '<p style="text-align: center; color: var(--text-dark); opacity: 0.7;">No transactions yet.</p>';
        } else {
            transactionsHTML = '<div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto;">';
            transactions.forEach(transaction => {
                const date = new Date(transaction.created_at).toLocaleString();
                const amount = parseFloat(transaction.amount);
                const isPositive = transaction.type === 'deposit' || transaction.type === 'refund';
                const typeLabel = transaction.type === 'deposit' ? 'Deposit' : 
                                 transaction.type === 'purchase' ? 'Purchase' : 
                                 transaction.type === 'refund' ? 'Refund' : transaction.type;
                
                transactionsHTML += `
                    <div style="background: white; border: 1px solid rgba(139, 111, 71, 0.2); border-radius: 8px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--deep-brown); font-size: 0.9rem;">
                                ${typeLabel}
                            </div>
                            <div style="color: var(--text-dark); font-size: 0.85rem; opacity: 0.8; margin-top: 0.25rem;">
                                ${transaction.description || 'No description'}
                            </div>
                            <div style="color: var(--text-dark); font-size: 0.75rem; opacity: 0.6; margin-top: 0.25rem;">
                                ${date}
                            </div>
                        </div>
                        <div style="font-size: 1rem; font-weight: 600; color: ${isPositive ? 'var(--auburn)' : 'var(--text-dark)'}; margin-left: 1rem;">
                            ${isPositive ? '+' : '-'}$${amount.toFixed(2)}
                        </div>
                    </div>
                `;
            });
            transactionsHTML += '</div>';
        }

        const modalContent = `
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div>
                    <h3 style="color: var(--deep-brown); margin-bottom: 0.5rem;">User Information</h3>
                    <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${userEmail}</p>
                    <p style="margin: 0.25rem 0;"><strong>Name:</strong> ${userName || 'N/A'}</p>
                    <p style="margin: 0.25rem 0;"><strong>Current Balance:</strong> <span style="color: var(--auburn); font-size: 1.2rem; font-weight: 600;">$${currentBalance.toFixed(2)}</span></p>
                </div>

                <div>
                    <h3 style="color: var(--deep-brown); margin-bottom: 0.75rem;">Transaction History</h3>
                    ${transactionsHTML}
                </div>

                <div style="border-top: 2px solid rgba(139, 111, 71, 0.2); padding-top: 1.5rem;">
                    <h3 style="color: var(--deep-brown); margin-bottom: 0.75rem;">Adjust Funds</h3>
                    <form id="adjust-funds-form" onsubmit="adminUI.handleAdjustFunds(event, '${userId}')">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label for="adjust-amount" style="display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 600;">Amount ($)</label>
                                <input type="number" id="adjust-amount" step="0.01" min="0.01" required 
                                       style="width: 100%; padding: 0.75rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-size: 1rem;">
                            </div>
                            <div>
                                <label for="adjust-type" style="display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 600;">Transaction Type</label>
                                <select id="adjust-type" required 
                                        style="width: 100%; padding: 0.75rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-size: 1rem;">
                                    <option value="deposit">Add Funds (Deposit)</option>
                                    <option value="refund">Refund (Add Funds)</option>
                                </select>
                            </div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label for="adjust-description" style="display: block; margin-bottom: 0.5rem; color: var(--text-dark); font-weight: 600;">Description</label>
                            <input type="text" id="adjust-description" placeholder="e.g., Reward for loyalty, Prize winner, etc." 
                                   style="width: 100%; padding: 0.75rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 8px; font-size: 1rem;">
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn" style="background-color: var(--auburn);">Apply Adjustment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.createModal('Edit User Funds', modalContent);
    }

    async handleAdjustFunds(event, userId) {
        event.preventDefault();
        
        const amount = parseFloat(document.getElementById('adjust-amount').value);
        const type = document.getElementById('adjust-type').value;
        const description = document.getElementById('adjust-description').value || undefined;

        if (!amount || amount <= 0) {
            errorDialog.show('Please enter a valid amount', 'Invalid Amount');
            return;
        }

        const result = await adminManager.adjustUserBalance(userId, amount, description, type);
        
        if (result.success) {
            errorDialog.showSuccess(`Successfully ${type === 'deposit' || type === 'refund' ? 'added' : 'removed'} $${amount.toFixed(2)}. New balance: $${result.newBalance.toFixed(2)}`, 'Funds Adjusted');
            
            // Close modal and refresh users view
            const modal = document.querySelector('.admin-modal-overlay');
            if (modal) modal.remove();
            
            await this.renderUsersView();
        } else {
            errorDialog.show(result.error || 'Error adjusting funds', 'Error');
        }
    }

    createModal(title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(3px);
        `;

        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;

        modal.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: var(--deep-brown);">${title}</h2>
                    <button style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;" onclick="this.closest('.admin-modal-overlay').remove()">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                ${content}
            </div>
        `;

        overlay.appendChild(modal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        return overlay;
    }

    // Unit Type Management Methods
    showUnitTypeForm(unitTypeId = null) {
        this.editingUnitType = unitTypeId;
        const modal = this.createModal(
            unitTypeId ? 'Edit Unit Type' : 'Add Unit Type',
            this.getUnitTypeFormHTML(unitTypeId)
        );
        document.body.appendChild(modal);

        if (unitTypeId) {
            this.loadUnitTypeData(unitTypeId);
        }

        // Add validation on blur for the name field
        const nameInput = document.getElementById('unit-type-name');
        if (nameInput) {
            nameInput.addEventListener('blur', () => {
                this.validateUnitTypeName();
            });
        }
    }

    validateUnitTypeName() {
        const nameInput = document.getElementById('unit-type-name');
        const errorDiv = document.getElementById('unit-type-form-error');
        if (!nameInput || !errorDiv) return;

        const name = nameInput.value.trim();
        
        // Reset styling
        nameInput.style.borderColor = '';
        nameInput.style.borderWidth = '';
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        // Only validate if there's a value
        if (!name) {
            return;
        }

        // Validate format: lowercase letters and underscores only
        const namePattern = /^[a-z_]+$/;
        if (!namePattern.test(name)) {
            const hasUppercase = /[A-Z]/.test(name);
            const hasSpaces = /\s/.test(name);
            const hasInvalidChars = /[^a-z_]/.test(name);
            
            let errorMessage = 'Name (internal) format is invalid: ';
            const errors = [];
            
            if (hasUppercase) {
                errors.push('must be lowercase only (no capital letters)');
            }
            if (hasSpaces) {
                errors.push('cannot contain spaces');
            }
            if (hasInvalidChars && !hasUppercase && !hasSpaces) {
                errors.push('can only contain lowercase letters and underscores');
            }
            
            errorMessage += errors.join(', ') + '.';
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            nameInput.style.borderColor = 'var(--auburn)';
            nameInput.style.borderWidth = '2px';
        }
    }

    getUnitTypeFormHTML(unitTypeId) {
        return `
            <form id="unit-type-form" onsubmit="adminUI.saveUnitType(event)">
                <div class="form-group">
                    <label for="unit-type-name">Name (internal) *</label>
                    <input type="text" id="unit-type-name" required ${unitTypeId ? 'readonly' : ''} 
                           placeholder="e.g., shots, pumps, oz" 
                           pattern="[a-z_]+" 
                           title="Lowercase letters and underscores only">
                    <small>Internal identifier (lowercase, no spaces). Cannot be changed after creation.</small>
                </div>
                <div class="form-group">
                    <label for="unit-type-display-name">Display Name *</label>
                    <input type="text" id="unit-type-display-name" required placeholder="e.g., Shots, Pumps, Ounces">
                    <small>Name shown to users</small>
                </div>
                <div class="form-group">
                    <label for="unit-type-abbreviation">Abbreviation *</label>
                    <input type="text" id="unit-type-abbreviation" required placeholder="e.g., shot, pump, oz">
                    <small>Short form used in displays</small>
                </div>
                <div id="unit-type-form-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                </div>
            </form>
        `;
    }

    async loadUnitTypeData(unitTypeId) {
        const client = getSupabaseClient();
        const { data } = await client
            .from('unit_types')
            .select('*')
            .eq('id', unitTypeId)
            .single();

        if (data) {
            document.getElementById('unit-type-name').value = data.name;
            document.getElementById('unit-type-display-name').value = data.display_name;
            document.getElementById('unit-type-abbreviation').value = data.abbreviation;
        }
    }

    async saveUnitType(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('unit-type-form-error');
        const nameInput = document.getElementById('unit-type-name');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        // Reset input styling
        nameInput.style.borderColor = '';
        nameInput.style.borderWidth = '';

        const formData = {
            name: nameInput.value.trim(),
            display_name: document.getElementById('unit-type-display-name').value.trim(),
            abbreviation: document.getElementById('unit-type-abbreviation').value.trim()
        };

        if (!formData.name || !formData.display_name || !formData.abbreviation) {
            errorDiv.textContent = 'Please fill in all required fields';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate Name (internal) field format
        // Must be lowercase letters and underscores only, no spaces
        const namePattern = /^[a-z_]+$/;
        if (!namePattern.test(formData.name)) {
            // Use the validation function to show consistent error
            this.validateUnitTypeName();
            nameInput.focus();
            return;
        }

        try {
            let result;
            if (this.editingUnitType) {
                result = await adminManager.updateUnitType(this.editingUnitType, formData);
            } else {
                result = await adminManager.createUnitType(formData);
            }

            if (result.success) {
                errorDialog.showSuccess(
                    this.editingUnitType ? 'Unit type updated successfully!' : 'Unit type created successfully!',
                    'Success'
                );
                document.querySelector('.admin-modal-overlay').remove();
                await this.renderIngredientsView();
            } else {
                errorDiv.textContent = result.error || 'Error saving unit type';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Error saving unit type';
            errorDiv.style.display = 'block';
        }
    }

    async editUnitType(unitTypeId) {
        this.showUnitTypeForm(unitTypeId);
    }

    async deleteUnitType(unitTypeId) {
        if (!confirm('Are you sure you want to delete this unit type?')) {
            return;
        }

        const result = await adminManager.deleteUnitType(unitTypeId);
        if (result.success) {
            errorDialog.showSuccess('Unit type deleted successfully!', 'Success');
            await this.renderIngredientsView();
        } else {
            if (result.inUse) {
                const message = result.ingredients && result.ingredients.length > 0
                    ? `${result.error}\n\nIngredients using this unit type:\n${result.ingredients.slice(0, 5).join(', ')}${result.ingredients.length > 5 ? '...' : ''}`
                    : result.error;
                errorDialog.show(message, 'Cannot Delete Unit Type');
            } else {
                errorDialog.show(result.error || 'Error deleting unit type', 'Error');
            }
        }
    }
}

// Global admin UI instance
const adminUI = new AdminUI();

