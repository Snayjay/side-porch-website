// Admin UI Components
// Handles rendering and interaction for admin interface

class AdminUI {
    constructor() {
        this.currentView = 'menu';
        this.editingCategory = null;
        this.editingProduct = null;
        this.editingIngredient = null;
        this.editingDrinkIngredients = null;
        this.selectedRecipeSizeId = null; // Track selected size for recipe editing
        this.selectedCategoryType = 'drink';
        this.selectedCategoryId = null;
        this.savedSizes = []; // Store product sizes for form
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
                <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2); align-items: center;">
                    <div style="display: flex; gap: 0.5rem; flex: 1;">
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
                    ${this.selectedCategoryType === 'drink' ? `
                        <button class="btn btn-sm" onclick="adminUI.generateImagesForAllDrinks()" style="white-space: nowrap;">
                            Generate All Drink Images
                        </button>
                    ` : ''}
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
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-sm" onclick="adminUI.showCategoryForm('${category.id}')" style="background: var(--accent-orange); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; font-weight: 500;">Edit</button>
                        ${type === 'drink' ? 
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'drink')" style="background: var(--accent-orange); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; font-weight: 500;">+ Add Drink</button>` :
                            type === 'food' ?
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'food')" style="background: var(--accent-orange); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; font-weight: 500;">+ Add Food Item</button>` :
                            type === 'merch' ?
                            `<button class="btn btn-sm" onclick="adminUI.showProductForm(null, '${category.id}', 'merch')" style="background: var(--accent-orange); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; font-weight: 500;">+ Add Merch Item</button>` :
                            ''
                        }
                        <button class="btn btn-sm btn-danger" onclick="adminUI.deleteCategory('${category.id}')" style="background: var(--auburn); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; font-weight: 500;">Delete</button>
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
        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        products.forEach(product => {
            const tempDisplay = product.temp ? (product.temp.charAt(0).toUpperCase() + product.temp.slice(1)) : '—';
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--parchment); border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                    <div style="flex: 1; display: flex; align-items: center; gap: 1rem;">
                        <div style="font-weight: 600; color: var(--deep-brown); min-width: 150px;">${product.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; min-width: 60px;">${tempDisplay}</div>
                        <div style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.8;">$${parseFloat(product.price).toFixed(2)}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                        <button class="btn btn-sm" onclick="adminUI.manageDrinkIngredients('${product.id}')" style="background: var(--accent-orange); color: white;">Recipe</button>
                        <button class="btn btn-sm btn-danger" onclick="adminUI.deleteProduct('${product.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    renderFoodMerchItems(products, type) {
        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        products.forEach(product => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--parchment); border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                    <div style="flex: 1; display: flex; align-items: center; gap: 1rem;">
                        ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">` : ''}
                        <div style="min-width: 150px;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">${product.name}</div>
                            ${product.description ? `<div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; line-height: 1.3;">${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}</div>` : ''}
                        </div>
                        <div style="font-size: 0.9rem; color: var(--deep-brown); font-weight: 600; min-width: 80px;">$${parseFloat(product.price).toFixed(2)}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
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
            
            // If creating a new category, switch to its type tab so it's visible
            if (!this.editingCategory && categoryData.type) {
                this.selectedCategoryType = categoryData.type;
            }
            
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
        // First check if category has any items
        const productsResult = await adminManager.getProductsByCategory(categoryId, true);
        const products = productsResult.success ? productsResult.products : [];
        
        if (products && products.length > 0) {
            errorDialog.show(
                `Cannot delete category: There are ${products.length} item(s) in this category. Please remove or move all items before deleting the category.`,
                'Cannot Delete Category'
            );
            return;
        }
        
        // Get category name for confirmation message
        const categoriesResult = await adminManager.getAllCategories(null, true);
        const category = categoriesResult.categories?.find(c => c.id === categoryId);
        const categoryName = category?.name || 'this category';
        
        if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
            return;
        }
        
        const result = await adminManager.deleteCategory(categoryId);
        if (result.success) {
            await this.renderMenuManagementView();
            errorDialog.showSuccess(`Category "${categoryName}" deleted successfully!`, 'Success');
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
        // Recipe management is now handled separately via the Recipe button
    }

    async initializeIngredientRows() {
        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];
        const unitTypesResult = await adminManager.getAllUnitTypes(true);
        const unitTypes = unitTypesResult.unitTypes || [];
        
        // Store for use in ingredient management
        this.availableIngredients = allIngredients;
        this.availableUnitTypes = unitTypes;
        
        // Initialize saved ingredients list
        this.savedIngredients = [];
        
        // Create the new ingredient input row
        this.createNewIngredientRow();
    }

    createNewIngredientRow() {
        const container = document.getElementById('new-ingredient-row');
        if (!container) return;
        
        const ingredients = this.availableIngredients || [];
        const unitTypes = this.availableUnitTypes || [];
        
        // Build ingredient options (without unit type in display)
        // Sort ingredients alphabetically by name
        const sortedIngredients = [...ingredients].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        let ingredientOptions = '<option value="">Select ingredient...</option>';
        sortedIngredients.forEach(ing => {
            ingredientOptions += `<option value="${ing.id}" data-default-unit="${ing.unit_type}">${ing.name}</option>`;
        });
        
        // Build unit type options (include "parts" for ratio-based recipes)
        let unitOptions = '<option value="parts">Parts</option>';
        unitTypes.forEach(ut => {
            unitOptions += `<option value="${ut.name}">${ut.display_name || ut.name}</option>`;
        });
        
        container.innerHTML = `
            <div style="flex: 2;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Ingredient</label>
                <select id="new-ingredient-select" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                    ${ingredientOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Unit</label>
                <select id="new-ingredient-unit" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                    ${unitOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Quantity</label>
                <input type="number" id="new-ingredient-quantity" step="0.1" min="0" placeholder="0" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
            </div>
            <div style="flex: 0 0 auto; padding-bottom: 0.25rem;">
                <button type="button" onclick="adminUI.addIngredientToList()" class="btn btn-sm" style="background: var(--accent-orange); color: white; padding: 0.5rem 1rem; font-size: 0.9rem; white-space: nowrap;">
                    Add to Recipe
                </button>
            </div>
        `;
    }

    addIngredientToList() {
        const ingredientSelect = document.getElementById('new-ingredient-select');
        const unitSelect = document.getElementById('new-ingredient-unit');
        const quantityInput = document.getElementById('new-ingredient-quantity');
        
        const ingredientId = ingredientSelect?.value;
        const unit = unitSelect?.value || '';
        const quantity = parseFloat(quantityInput?.value || 0);
        
        if (!ingredientId) {
            errorDialog.show('Please select an ingredient', 'Validation Error');
            return;
        }
        
        if (!quantity || quantity <= 0) {
            errorDialog.show('Please enter a quantity greater than 0', 'Validation Error');
            return;
        }
        
        // Check if this ingredient is already in the saved ingredients list
        if (!this.savedIngredients) {
            this.savedIngredients = [];
        }
        
        const existingIngredient = this.savedIngredients.find(si => si.ingredient_id === ingredientId);
        if (existingIngredient) {
            errorDialog.show('This ingredient is already in the recipe. Please edit or remove the existing entry first.', 'Duplicate Ingredient');
            return;
        }
        
        const ingredients = this.availableIngredients || [];
        const unitTypes = this.availableUnitTypes || [];
        const ingredient = ingredients.find(i => i.id === ingredientId);
        
        if (!ingredient) return;
        
        // Get unit display name
        let unitDisplay = 'Parts';
        if (unit === 'parts') {
            unitDisplay = 'Parts';
        } else {
            const unitType = unitTypes.find(ut => ut.name === unit);
            unitDisplay = unitType?.display_name || unitType?.name || unit;
        }
        
        // Add to saved ingredients
        const savedIngredient = {
            id: Date.now() + Math.random().toString(36).substr(2, 9), // Unique ID
            ingredient_id: ingredientId,
            ingredient_name: ingredient.name,
            unit: unit,
            unit_display: unitDisplay,
            quantity: quantity
        };
        
        this.savedIngredients.push(savedIngredient);
        
        // Refresh the saved ingredients display
        this.renderSavedIngredients();
        
        // Clear the input fields
        ingredientSelect.value = '';
        unitSelect.value = 'parts';
        quantityInput.value = '';
    }

    renderSavedIngredients() {
        const container = document.getElementById('saved-ingredients-container');
        if (!container) return;
        
        if (!this.savedIngredients || this.savedIngredients.length === 0) {
            container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No ingredients added yet. Add ingredients below.</p>';
            return;
        }
        
        const ingredients = this.availableIngredients || [];
        const unitTypes = this.availableUnitTypes || [];
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        
        this.savedIngredients.forEach((savedIng, index) => {
            const ingredient = ingredients.find(i => i.id === savedIng.ingredient_id);
            if (!ingredient) return;
            
            html += `
                <div class="saved-ingredient-row" data-ingredient-id="${savedIng.id}" style="display: flex; gap: 0.75rem; align-items: center; padding: 0.75rem; background: white; border: 1px solid rgba(139, 111, 71, 0.2); border-radius: 6px;">
                    <div style="flex: 2; font-weight: 500; color: var(--deep-brown);">
                        ${savedIng.ingredient_name} (${savedIng.unit_display})
                    </div>
                    <div style="flex: 1; color: var(--text-dark);">
                        Quantity: <strong>${savedIng.quantity}</strong>
                    </div>
                    <div style="flex: 0 0 auto; display: flex; gap: 0.5rem;">
                        <button type="button" onclick="adminUI.editSavedIngredient('${savedIng.id}')" style="background: var(--accent-orange); color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.85rem;">
                            Edit
                        </button>
                        <button type="button" onclick="adminUI.removeSavedIngredient('${savedIng.id}')" style="background: var(--auburn); color: white; border: none; border-radius: 4px; padding: 0.4rem 0.75rem; cursor: pointer; font-size: 0.85rem;">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    editSavedIngredient(savedIngredientId) {
        const savedIng = this.savedIngredients.find(si => si.id === savedIngredientId);
        if (!savedIng) return;
        
        // Remove from saved list
        this.savedIngredients = this.savedIngredients.filter(si => si.id !== savedIngredientId);
        this.renderSavedIngredients();
        
        // Populate the new ingredient row with this data
        const ingredientSelect = document.getElementById('new-ingredient-select');
        const unitSelect = document.getElementById('new-ingredient-unit');
        const quantityInput = document.getElementById('new-ingredient-quantity');
        
        if (ingredientSelect) ingredientSelect.value = savedIng.ingredient_id;
        if (unitSelect) unitSelect.value = savedIng.unit;
        if (quantityInput) quantityInput.value = savedIng.quantity;
    }

    removeSavedIngredient(savedIngredientId) {
        this.savedIngredients = this.savedIngredients.filter(si => si.id !== savedIngredientId);
        this.renderSavedIngredients();
    }

    addIngredientRow(ingredientData = null) {
        const container = document.getElementById('drink-ingredients-list');
        if (!container) return;
        
        const rowId = 'ingredient-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const ingredients = this.availableIngredients || [];
        const unitTypes = this.availableUnitTypes || [];
        
        // Build ingredient options (without unit type in display)
        // Sort ingredients alphabetically by name
        const sortedIngredients = [...ingredients].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        let ingredientOptions = '<option value="">Select ingredient...</option>';
        sortedIngredients.forEach(ing => {
            const selected = ingredientData && ingredientData.ingredient_id === ing.id ? 'selected' : '';
            ingredientOptions += `<option value="${ing.id}" data-default-unit="${ing.unit_type}" ${selected}>${ing.name}</option>`;
        });
        
        // Build unit type options (include "parts" for ratio-based recipes)
        let unitOptions = '<option value="parts">Parts</option>';
        unitTypes.forEach(ut => {
            const selected = ingredientData && ingredientData.unit === ut.name ? 'selected' : '';
            unitOptions += `<option value="${ut.name}" ${selected}>${ut.display_name || ut.name}</option>`;
        });
        
        // Get selected unit display name
        const selectedUnit = ingredientData?.unit || 'parts';
        const selectedUnitDisplay = selectedUnit === 'parts' ? 'Parts' : 
            (unitTypes.find(ut => ut.name === selectedUnit)?.display_name || selectedUnit);
        
        const row = document.createElement('div');
        row.id = rowId;
        row.className = 'ingredient-row';
        row.style.cssText = 'display: flex; gap: 0.75rem; align-items: flex-start; margin-bottom: 1rem; padding: 1rem; background: var(--cream); border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);';
        
        row.innerHTML = `
            <div style="flex: 2;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Ingredient</label>
                <select class="ingredient-select" data-row-id="${rowId}" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                    ${ingredientOptions}
                </select>
                <div class="ingredient-display" style="font-size: 0.8rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.25rem; min-height: 1rem;">
                    ${ingredientData ? `${ingredients.find(i => i.id === ingredientData.ingredient_id)?.name || ''} (${selectedUnitDisplay})` : ''}
                </div>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Unit</label>
                <select class="ingredient-unit" data-row-id="${rowId}" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                    ${unitOptions}
                </select>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Quantity</label>
                <input type="number" class="ingredient-quantity" step="0.1" min="0" value="${ingredientData?.quantity || ''}" placeholder="0" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
            </div>
            <div style="flex: 0 0 auto; padding-top: 1.5rem;">
                <button type="button" onclick="adminUI.removeIngredientRow('${rowId}')" style="background: var(--auburn); color: white; border: none; border-radius: 6px; padding: 0.5rem 0.75rem; cursor: pointer; font-size: 0.9rem;" title="Remove ingredient">
                    ✕
                </button>
            </div>
        `;
        
        container.appendChild(row);
        
        // Add event listeners to update display when ingredient or unit changes
        const ingredientSelect = row.querySelector('.ingredient-select');
        const unitSelect = row.querySelector('.ingredient-unit');
        const displayDiv = row.querySelector('.ingredient-display');
        
        const updateDisplay = () => {
            const selectedIngredientId = ingredientSelect.value;
            const selectedUnitValue = unitSelect.value;
            
            if (selectedIngredientId) {
                const ingredient = ingredients.find(i => i.id === selectedIngredientId);
                if (ingredient) {
                    // Get unit display name
                    let unitDisplay = 'Parts';
                    if (selectedUnitValue === 'parts') {
                        unitDisplay = 'Parts';
                    } else {
                        const unitType = unitTypes.find(ut => ut.name === selectedUnitValue);
                        unitDisplay = unitType?.display_name || unitType?.name || selectedUnitValue;
                    }
                    
                    displayDiv.textContent = `${ingredient.name} (${unitDisplay})`;
                    displayDiv.style.display = 'block';
                } else {
                    displayDiv.textContent = '';
                    displayDiv.style.display = 'none';
                }
            } else {
                displayDiv.textContent = '';
                displayDiv.style.display = 'none';
            }
        };
        
        ingredientSelect.addEventListener('change', updateDisplay);
        unitSelect.addEventListener('change', updateDisplay);
        
        // Initial update if ingredient is already selected
        if (ingredientData && ingredientData.ingredient_id) {
            updateDisplay();
        }
    }

    removeIngredientRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
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
                    <label for="product-price">Price ${isDrink ? '<span id="price-required-indicator">*</span>' : '*'}</label>
                    <input type="number" id="product-price" step="0.01" min="0" ${isDrink ? '' : 'required'}>
                    ${isDrink ? '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.5rem;" id="price-help-text">Required for fixed-size drinks. Optional if drink has size options (each size will have its own price).</p>' : ''}
                </div>
                <div class="form-group">
                    <label for="product-tax-rate">Tax Rate</label>
                    <input type="number" id="product-tax-rate" step="0.0001" min="0" max="1" value="0.0825">
                </div>
                ${isDrink ? `
                    <div class="form-group">
                        <label for="product-temp">Temp *</label>
                        <select id="product-temp" required>
                            <option value="">Select temperature...</option>
                            <option value="hot">Hot</option>
                            <option value="cold">Cold</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="product-has-sizes" onchange="adminUI.toggleSizeOptions()">
                            Has Size Options
                        </label>
                        <p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.5rem;">
                            Check this if the drink has multiple size options. You can define custom sizes below (e.g., Small, Medium, Large, or any custom names). Uncheck for fixed-size drinks (e.g., Cortado).
                        </p>
                    </div>
                    <div id="product-size-options-container" style="display: none; margin-top: 1rem; padding: 1.25rem; background: var(--cream); border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="margin-bottom: 1rem;">
                            <h4 style="font-size: 1rem; font-weight: 600; color: var(--deep-brown); margin-bottom: 0.5rem;">Custom Size Options</h4>
                            <p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.8; line-height: 1.5;">
                                Define your own size options for this drink. You can add as many sizes as needed (e.g., "Small", "Medium", "Large", "Venti", "Trenta", or any custom names). Each size can have its own price and recipe.
                            </p>
                        </div>
                        <div id="product-sizes-list" style="margin-bottom: 1rem;">
                            <p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below to create your first size option.</p>
                        </div>
                        <button type="button" class="btn btn-sm" onclick="adminUI.addProductSizeRow()" style="margin-bottom: 0.5rem; background: var(--accent-orange); color: white;">+ Add Size</button>
                        <p style="font-size: 0.8rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.75rem; font-style: italic;">
                            💡 Tip: Use the "Order" field to control the display order of sizes. Lower numbers appear first.
                        </p>
                    </div>
                    <div id="product-fixed-size-container" style="display: none; margin-top: 1rem;">
                        <div class="form-group">
                            <label for="product-fixed-size-oz">Fixed Size (oz) *</label>
                            <input type="number" id="product-fixed-size-oz" step="0.1" min="0.1" placeholder="e.g., 4.0">
                            <p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.5rem;">
                                Enter the fixed size in ounces (e.g., 4 for a 4oz Cortado).
                            </p>
                        </div>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label for="product-image-url">Image URL</label>
                    <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
                        <input type="url" id="product-image-url" placeholder="https://example.com/image.jpg" style="flex: 1;">
                        ${isDrink ? `
                            <button type="button" class="btn btn-sm" onclick="adminUI.generateImageForCurrentProduct()" style="white-space: nowrap;">
                                Generate AI Image
                            </button>
                        ` : ''}
                    </div>
                    ${isDrink ? `
                        <p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.5rem;">
                            Use AI to generate a professional image for this drink
                        </p>
                    ` : ''}
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="product-available" checked> Available
                    </label>
                </div>
                ${isDrink ? `
                    <div class="form-group" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2);">
                        <div style="background: rgba(139, 111, 71, 0.05); padding: 1rem; border-radius: 8px; border-left: 4px solid var(--accent-orange);">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.5rem; font-size: 0.95rem;">📝 Recipe Management</div>
                            <p style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.8; margin-bottom: 0.75rem; line-height: 1.5;">
                                ${productId ? 
                                    'Use the <strong>"Recipe"</strong> button in the product list to manage ingredients and create size-specific recipes.' :
                                    'After saving this product, use the <strong>"Recipe"</strong> button in the product list to manage ingredients and create size-specific recipes.'
                                }
                            </p>
                            ${productId ? `
                                <button type="button" class="btn btn-sm" onclick="this.closest('.admin-modal-overlay').remove(); adminUI.manageDrinkIngredients('${productId}');" style="margin-top: 0.5rem;">
                                    Open Recipe Manager
                                </button>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                <div id="product-form-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
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
            let categoryType = null;
            if (categorySelect && product.category_id) {
                const option = categorySelect.querySelector(`option[value="${product.category_id}"]`);
                if (option) {
                    option.selected = true;
                }
                // Get category type from the categories loaded in the form
                const categoryResult = await adminManager.getAllCategories(null, true);
                const category = categoryResult.categories?.find(c => c.id === product.category_id);
                categoryType = category?.type;
            }

            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-tax-rate').value = product.tax_rate || 0.0825;
            
            // Load size options
            if (categoryType === 'drink') {
                // First, check if sizes exist in database (regardless of has_sizes flag)
                const sizesResult = await adminManager.getProductSizes(productId);
                const existingSizes = sizesResult.success ? (sizesResult.sizes || []) : [];
                
                // Determine if product has sizes - check both flag and actual data
                const hasSizes = product.has_sizes === true || existingSizes.length > 0;
                
                // Update checkbox and UI
                const hasSizesCheckbox = document.getElementById('product-has-sizes');
                if (hasSizesCheckbox) {
                    hasSizesCheckbox.checked = hasSizes;
                }
                
                // Toggle UI visibility
                this.toggleSizeOptions();
                
                if (hasSizes) {
                    // Load existing sizes (will populate from existingSizes if already loaded)
                    if (existingSizes.length > 0) {
                        this.savedSizes = existingSizes;
                        this.renderProductSizes();
                    } else {
                        await this.loadProductSizes(productId);
                    }
                } else {
                    // Load fixed size
                    const fixedSizeInput = document.getElementById('product-fixed-size-oz');
                    if (fixedSizeInput) {
                        fixedSizeInput.value = product.fixed_size_oz || '';
                    }
                }
            }
            
            const imageInput = document.getElementById('product-image-url');
            if (imageInput) {
                imageInput.value = product.image_url || '';
            }
            const tempInput = document.getElementById('product-temp');
            if (tempInput) {
                tempInput.value = product.temp || '';
            }
            document.getElementById('product-available').checked = product.available !== false;
            
            // Update price field requirement based on whether product has sizes
            if (product.has_sizes) {
                const priceInput = document.getElementById('product-price');
                const priceRequiredIndicator = document.getElementById('price-required-indicator');
                const priceHelpText = document.getElementById('price-help-text');
                
                if (priceInput) {
                    priceInput.required = false;
                }
                if (priceRequiredIndicator) {
                    priceRequiredIndicator.style.display = 'none';
                }
                if (priceHelpText) {
                    priceHelpText.textContent = 'Optional - each size will have its own price. Leave blank if using size options.';
                }
            }
            
            // Recipe management is now handled separately via the Recipe button
        }
    }

    async loadDrinkIngredients(productId, sizeId = null) {
        // Initialize ingredient rows first
        await this.initializeIngredientRows();
        
        // Load existing drink ingredients (product-level defaults if no sizeId)
        const drinkIngredientsResult = await adminManager.getDrinkIngredients(productId, sizeId);
        const drinkIngredients = drinkIngredientsResult.drinkIngredients || [];
        
        if (drinkIngredients.length === 0) {
            return;
        }
        
        // Load all ingredients to get their names
        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];
        const unitTypesResult = await adminManager.getAllUnitTypes(true);
        const unitTypes = unitTypesResult.unitTypes || [];
        const ingredientMap = {};
        allIngredients.forEach(ing => {
            ingredientMap[ing.id] = ing;
        });
        
        // Populate saved ingredients from existing drink ingredients
        this.savedIngredients = [];
        for (const di of drinkIngredients) {
            const ingredient = ingredientMap[di.ingredient_id];
            if (ingredient) {
                // Use the saved unit_type from drink_ingredients, fall back to ingredient's default
                const unit = di.unit_type || ingredient.unit_type || 'parts';
                let unitDisplay = 'Parts';
                if (unit === 'parts') {
                    unitDisplay = 'Parts';
                } else {
                    const unitType = unitTypes.find(ut => ut.name === unit);
                    unitDisplay = unitType?.display_name || unitType?.name || unit;
                }
                
                this.savedIngredients.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    ingredient_id: di.ingredient_id,
                    ingredient_name: ingredient.name,
                    unit: unit,
                    unit_display: unitDisplay,
                    quantity: parseFloat(di.default_amount || 0)
                });
            }
        }
        
        this.renderSavedIngredients();
    }

    async saveProduct(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('product-form-error');
        errorDiv.style.display = 'none';

        try {
            const categoryId = document.getElementById('product-category-id').value;
            if (!categoryId) {
                errorDiv.textContent = 'Please select a category';
                errorDiv.style.display = 'block';
                return;
            }

            const name = document.getElementById('product-name').value.trim();
            if (!name) {
                errorDiv.textContent = 'Please enter a product name';
                errorDiv.style.display = 'block';
                return;
            }

            const priceInput = document.getElementById('product-price');
            const price = priceInput.value;
            
            // Check if product has sizes - if so, price is optional
            const hasSizesCheckbox = document.getElementById('product-has-sizes');
            const hasSizes = hasSizesCheckbox && hasSizesCheckbox.checked;
            
            // Also check if sizes actually exist in the form
            const sizesContainer = document.getElementById('product-sizes-list');
            const sizeRows = sizesContainer ? sizesContainer.querySelectorAll('.product-size-row') : [];
            const hasActualSizes = sizeRows.length > 0;
            
            // Price is required if: not a drink OR (drink AND no sizes)
            const priceRequired = !hasSizes && !hasActualSizes;
            
            if (priceRequired && (!price || parseFloat(price) < 0)) {
                errorDiv.textContent = 'Please enter a valid price';
                errorDiv.style.display = 'block';
                return;
            }
            
            // If price is provided, validate it's not negative
            if (price && parseFloat(price) < 0) {
                errorDiv.textContent = 'Price cannot be negative';
                errorDiv.style.display = 'block';
                return;
            }
            
            // If drink has sizes but no price, use 0 as default (sizes will have their own prices)
            // If no sizes, price is required and should already be validated above
            const finalPrice = (hasSizes || hasActualSizes) ? (price || '0') : price;

            const productData = {
                name: name,
                description: document.getElementById('product-description').value.trim(),
                category_id: categoryId,
                price: finalPrice || '0', // Use finalPrice which handles size-based pricing
                tax_rate: document.getElementById('product-tax-rate').value,
                image_url: document.getElementById('product-image-url')?.value.trim() || null,
                available: document.getElementById('product-available').checked
            };

            // Add temp field for drinks
            const tempInput = document.getElementById('product-temp');
            if (tempInput) {
                productData.temp = tempInput.value || null;
            }

            // Add size fields for drinks
            // Reuse hasSizesCheckbox, hasSizes, sizesContainer, sizeRows, and hasActualSizes already declared above
            if (hasSizesCheckbox) {
                // Set has_sizes to true if checkbox is checked OR if sizes exist
                productData.has_sizes = hasSizes || hasActualSizes;
                
                if (productData.has_sizes) {
                    productData.fixed_size_oz = null;
                } else {
                    const fixedSizeInput = document.getElementById('product-fixed-size-oz');
                    if (fixedSizeInput && fixedSizeInput.value) {
                        productData.fixed_size_oz = parseFloat(fixedSizeInput.value);
                    } else {
                        productData.fixed_size_oz = null;
                    }
                }
            }

            console.log('Saving product:', productData);

            let result;
            if (this.editingProduct) {
                console.log('Updating product:', this.editingProduct);
                result = await adminManager.updateProduct(this.editingProduct, productData);
            } else {
                console.log('Creating new product');
                result = await adminManager.createProduct(productData);
            }

            console.log('Product save result:', result);

            if (result.success) {
                const productId = result.product?.id || this.editingProduct;
                console.log('Product saved with ID:', productId);
                
                // Save sizes if it's a drink with sizes
                const hasSizesCheckbox = document.getElementById('product-has-sizes');
                if (hasSizesCheckbox && hasSizesCheckbox.checked && productId) {
                    try {
                        console.log('Saving sizes for product:', productId);
                        await this.saveProductSizesFromForm(productId);
                        console.log('Sizes saved successfully');
                    } catch (error) {
                        console.error('Error saving sizes:', error);
                        errorDiv.textContent = `Item saved but failed to save sizes: ${error.message}`;
                        errorDiv.style.display = 'block';
                        return; // Don't close modal if sizes failed to save
                    }
                }
                
                // Recipe management is now handled separately via the Recipe button
                // No need to save ingredients here
                
                document.querySelector('.admin-modal-overlay')?.remove();
                await this.renderMenuManagementView();
                errorDialog.showSuccess(
                    this.editingProduct ? 'Item updated successfully!' : 'Item created successfully!',
                    'Success'
                );
                this.editingProduct = null;
                this.savedIngredients = []; // Clear saved ingredients
                this.savedSizes = []; // Clear saved sizes
            } else {
                const errorMsg = result.error || 'Error saving item';
                console.error('Save product error:', result);
                errorDiv.textContent = errorMsg;
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Unexpected error saving product:', error);
            errorDiv.textContent = `Unexpected error: ${error.message}`;
            errorDiv.style.display = 'block';
        }
    }

    async saveDrinkIngredientsFromForm(productId) {
        if (!this.savedIngredients || this.savedIngredients.length === 0) {
            // No ingredients to save, clear existing ingredients
            await adminManager.setDrinkIngredients(productId, []);
            return;
        }
        
        // Convert saved ingredients to format expected by setDrinkIngredients
        const drinkIngredients = this.savedIngredients.map(savedIng => ({
            ingredient_id: savedIng.ingredient_id,
            default_amount: savedIng.quantity,
            unit_type: savedIng.unit,  // Save the selected unit type for this recipe
            is_required: false,
            is_removable: true,
            is_addable: false
        }));
        
        const result = await adminManager.setDrinkIngredients(productId, drinkIngredients);
        if (!result.success) {
            console.error('Error saving drink ingredients:', result.error);
            throw new Error(result.error || 'Failed to save ingredients');
        }
    }

    toggleSizeOptions() {
        const hasSizesCheckbox = document.getElementById('product-has-sizes');
        const sizeOptionsContainer = document.getElementById('product-size-options-container');
        const fixedSizeContainer = document.getElementById('product-fixed-size-container');
        const fixedSizeInput = document.getElementById('product-fixed-size-oz');
        const priceInput = document.getElementById('product-price');
        const priceRequiredIndicator = document.getElementById('price-required-indicator');
        const priceHelpText = document.getElementById('price-help-text');
        
        if (!hasSizesCheckbox) return;
        
        const hasSizes = hasSizesCheckbox.checked;
        
        if (sizeOptionsContainer) {
            sizeOptionsContainer.style.display = hasSizes ? 'block' : 'none';
        }
        
        if (fixedSizeContainer) {
            fixedSizeContainer.style.display = hasSizes ? 'none' : 'block';
        }
        
        if (fixedSizeInput) {
            fixedSizeInput.required = !hasSizes;
        }
        
        // Update price field requirement based on size options
        if (priceInput) {
            priceInput.required = !hasSizes;
        }
        
        // Update price label indicator
        if (priceRequiredIndicator) {
            priceRequiredIndicator.style.display = hasSizes ? 'none' : 'inline';
        }
        
        // Update help text
        if (priceHelpText) {
            if (hasSizes) {
                priceHelpText.textContent = 'Optional - each size will have its own price. Leave blank if using size options.';
                priceHelpText.style.color = 'var(--text-dark)';
                priceHelpText.style.opacity = '0.7';
            } else {
                priceHelpText.textContent = 'Required for fixed-size drinks. Optional if drink has size options (each size will have its own price).';
                priceHelpText.style.color = 'var(--text-dark)';
                priceHelpText.style.opacity = '0.7';
            }
        }
    }

    getProductSizeRowHTML(sizeData = null) {
        const rowId = 'size-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        return `
            <div id="${rowId}" class="product-size-row" style="display: flex; gap: 0.75rem; align-items: flex-end; margin-bottom: 0.75rem; padding: 0.75rem; background: var(--parchment); border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                <div style="flex: 1;">
                    <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Size Name</label>
                    <input type="text" class="size-name" value="${sizeData?.size_name || ''}" placeholder="e.g., Small, Medium, Large, Venti..." style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;" required>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Size (oz)</label>
                    <input type="number" class="size-oz" step="0.1" min="0.1" value="${sizeData?.size_oz || ''}" placeholder="8.0" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Price</label>
                    <input type="number" class="size-price" step="0.01" min="0" value="${sizeData?.price || ''}" placeholder="3.50" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                </div>
                <div style="flex: 0 0 80px;">
                    <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Order</label>
                    <input type="number" class="size-display-order" step="1" min="0" value="${sizeData?.display_order || 0}" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
                </div>
                <div style="flex: 0 0 auto; padding-bottom: 0.5rem;">
                    <button type="button" onclick="adminUI.removeRecipeProductSizeRow('${rowId}')" style="background: var(--auburn); color: white; border: none; border-radius: 6px; padding: 0.5rem 0.75rem; cursor: pointer; font-size: 0.9rem;" title="Remove size">✕</button>
                </div>
            </div>
        `;
    }

    addProductSizeRow(sizeData = null) {
        const container = document.getElementById('product-sizes-list');
        if (!container) return;
        
        const rowId = 'size-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const row = document.createElement('div');
        row.id = rowId;
        row.className = 'product-size-row';
        row.style.cssText = 'display: flex; gap: 0.75rem; align-items: flex-end; margin-bottom: 0.75rem; padding: 0.75rem; background: var(--parchment); border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);';
        
        row.innerHTML = `
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Size Name</label>
                <input type="text" class="size-name" value="${sizeData?.size_name || ''}" placeholder="e.g., Small, Medium, Large, Venti..." style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;" required>
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Size (oz)</label>
                <input type="number" class="size-oz" step="0.1" min="0.1" value="${sizeData?.size_oz || ''}" placeholder="8.0" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
            </div>
            <div style="flex: 1;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Price</label>
                <input type="number" class="size-price" step="0.01" min="0" value="${sizeData?.price || ''}" placeholder="3.50" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
            </div>
            <div style="flex: 0 0 80px;">
                <label style="font-size: 0.85rem; color: var(--deep-brown); margin-bottom: 0.25rem; display: block;">Order</label>
                <input type="number" class="size-display-order" step="1" min="0" value="${sizeData?.display_order || 0}" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 6px; font-size: 0.9rem;">
            </div>
            <div style="flex: 0 0 auto; padding-bottom: 0.5rem;">
                <button type="button" onclick="adminUI.removeProductSizeRow('${rowId}')" style="background: var(--auburn); color: white; border: none; border-radius: 6px; padding: 0.5rem 0.75rem; cursor: pointer; font-size: 0.9rem;" title="Remove size">✕</button>
            </div>
        `;
        
        container.appendChild(row);
        
        // Clear placeholder text if container had it
        const placeholder = container.querySelector('p');
        if (placeholder && placeholder.textContent.includes('No sizes added')) {
            placeholder.remove();
        }
    }

    removeProductSizeRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
        }
        
        // Show placeholder if no sizes left
        const container = document.getElementById('product-sizes-list');
        if (container && container.children.length === 0) {
            container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below.</p>';
        }
    }

    async loadProductSizes(productId) {
        if (!productId) return;
        
        const result = await adminManager.getProductSizes(productId);
        if (!result.success) {
            console.error('Error loading product sizes:', result.error);
            return;
        }
        
        this.savedSizes = result.sizes || [];
        this.renderProductSizes();
    }

    renderProductSizes() {
        const container = document.getElementById('product-sizes-list');
        if (!container) return;
        
        if (!this.savedSizes || this.savedSizes.length === 0) {
            container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below.</p>';
            return;
        }
        
        container.innerHTML = '';
        this.savedSizes.forEach(size => {
            this.addProductSizeRow(size);
        });
    }

    async saveProductSizesFromForm(productId) {
        const container = document.getElementById('product-sizes-list');
        if (!container) {
            // No sizes container means product doesn't have sizes
            return;
        }
        
        const sizeRows = container.querySelectorAll('.product-size-row');
        const sizes = [];
        
        sizeRows.forEach(row => {
            const sizeName = row.querySelector('.size-name')?.value.trim();
            const sizeOz = row.querySelector('.size-oz')?.value;
            const price = row.querySelector('.size-price')?.value;
            const displayOrder = row.querySelector('.size-display-order')?.value;
            
            if (sizeName && sizeOz && price) {
                sizes.push({
                    size_name: sizeName,
                    size_oz: parseFloat(sizeOz),
                    price: parseFloat(price),
                    display_order: parseInt(displayOrder || 0),
                    available: true
                });
            }
        });
        
        const result = await adminManager.setProductSizes(productId, sizes);
        if (!result.success) {
            console.error('Error saving product sizes:', result.error);
            throw new Error(result.error || 'Failed to save sizes');
        }
    }

    // Recipe dialog size management functions
    toggleSizeManagement() {
        const content = document.getElementById('size-management-content');
        const icon = document.getElementById('size-management-icon');
        if (content && icon) {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }

    addRecipeProductSizeRow() {
        const container = document.getElementById('recipe-product-sizes-list');
        if (!container) return;
        
        const placeholder = container.querySelector('p');
        if (placeholder && placeholder.textContent.includes('No sizes added')) {
            container.innerHTML = '';
        }
        
        container.insertAdjacentHTML('beforeend', this.getProductSizeRowHTML());
    }

    removeRecipeProductSizeRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
        }
        
        // Show placeholder if no sizes left
        const container = document.getElementById('recipe-product-sizes-list');
        if (container && container.children.length === 0) {
            container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below.</p>';
        }
    }

    async saveRecipeProductSizes(productId) {
        const container = document.getElementById('recipe-product-sizes-list');
        if (!container) {
            errorDialog.show('Size management container not found', 'Error');
            return;
        }
        
        const sizeRows = container.querySelectorAll('.product-size-row');
        const sizes = [];
        
        sizeRows.forEach(row => {
            const sizeName = row.querySelector('.size-name')?.value.trim();
            const sizeOz = row.querySelector('.size-oz')?.value;
            const price = row.querySelector('.size-price')?.value;
            const displayOrder = row.querySelector('.size-display-order')?.value;
            
            if (sizeName && sizeOz && price) {
                sizes.push({
                    size_name: sizeName,
                    size_oz: parseFloat(sizeOz),
                    price: parseFloat(price),
                    display_order: parseInt(displayOrder || 0),
                    available: true
                });
            }
        });
        
        try {
            // Save sizes
            const result = await adminManager.setProductSizes(productId, sizes);
            if (!result.success) {
                errorDialog.show(result.error || 'Failed to save sizes', 'Error');
                return;
            }
            
            // Update product's has_sizes flag
            const productResult = await adminManager.getAllProducts(true);
            const product = productResult.products?.find(p => p.id === productId);
            if (product) {
                const hasSizes = sizes.length > 0;
                if (product.has_sizes !== hasSizes) {
                    const updateResult = await adminManager.updateProduct(productId, { has_sizes: hasSizes });
                    if (!updateResult.success) {
                        console.warn('Failed to update has_sizes flag:', updateResult.error);
                    }
                }
            }
            
            // Reload sizes and refresh the recipe dialog
            const sizesResult = await adminManager.getProductSizes(productId);
            const productSizes = sizesResult.success ? sizesResult.sizes : [];
            
            // Update the size list display in the "Manage Size Options" section
            const sizeListContainer = document.getElementById('recipe-product-sizes-list');
            if (sizeListContainer) {
                if (productSizes.length === 0) {
                    sizeListContainer.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below.</p>';
                } else {
                    sizeListContainer.innerHTML = '';
                    productSizes.forEach(size => {
                        sizeListContainer.insertAdjacentHTML('beforeend', this.getProductSizeRowHTML(size));
                    });
                }
            }
            
            // Reload all recipes to update the summary
            const allRecipesResult = await adminManager.getAllDrinkRecipes(productId);
            const existingRecipes = allRecipesResult.success ? allRecipesResult.recipesBySize : {};
            
            // Update recipe summary
            await this.updateRecipeSummary(productId, productSizes);
            
            // Update or create size selector dropdown
            let sizeSelector = document.getElementById('recipe-size-selector');
            let sizeSelectorSection = sizeSelector?.closest('div[style*="linear-gradient"]');
            
            // If sizes exist but selector section doesn't, create it
            if (productSizes.length > 0 && !sizeSelectorSection) {
                // Find the info message or size management section to insert after
                const sizeManagementSection = document.getElementById('size-management-content')?.parentElement;
                const infoMessage = document.querySelector('div[style*="rgba(255, 193, 7, 0.1)"]');
                const insertAfter = sizeManagementSection || infoMessage;
                
                if (insertAfter) {
                    const defaultRecipeExists = existingRecipes['default'] && existingRecipes['default'].ingredient_count > 0;
                    const defaultIndicator = defaultRecipeExists ? ' ✓' : '';
                    
                    // Create the size selector section
                    const newSection = document.createElement('div');
                    newSection.style.cssText = 'margin-bottom: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, var(--cream) 0%, rgba(139, 111, 71, 0.05) 100%); border-radius: 8px; border: 2px solid rgba(139, 111, 71, 0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
                    newSection.innerHTML = `
                        <label style="display: block; font-weight: 600; color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1.1rem;">📏 Select Size to Edit Recipe:</label>
                        <select id="recipe-size-selector" style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 4px; background: white; cursor: pointer; font-weight: 500;">
                            <option value="">Default Recipe (applies to all sizes unless overridden)${defaultIndicator}</option>
                        </select>
                        <div id="recipe-size-display" style="margin-top: 0.75rem; font-size: 0.95rem; color: var(--deep-brown); font-weight: 500; padding: 0.75rem; background: rgba(139, 111, 71, 0.15); border-radius: 4px; border-left: 4px solid var(--accent-orange);">✓ Editing default recipe (applies to all sizes unless overridden)</div>
                        <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-dark); opacity: 0.8; padding: 0.5rem; background: rgba(139, 111, 71, 0.05); border-radius: 4px;">💡 <strong>Tip:</strong> Select a size from the dropdown above to create/edit a size-specific recipe. If no size-specific recipe exists, the default recipe will be used for that size. Checkmarks (✓) indicate existing recipes.</div>
                    `;
                    
                    // Insert after the size management section or info message
                    insertAfter.insertAdjacentElement('afterend', newSection);
                    sizeSelectorSection = newSection;
                    sizeSelector = document.getElementById('recipe-size-selector');
                    
                    // Set up size selector change handler
                    if (sizeSelector) {
                        const ingredientsResult = await adminManager.getAllIngredients(true);
                        const allIngredients = ingredientsResult.ingredients || [];
                        
                        sizeSelector.addEventListener('change', async (e) => {
                            const selectedSizeId = e.target.value || null;
                            const sizeDisplay = document.getElementById('recipe-size-display');
                            if (sizeDisplay) {
                                sizeDisplay.textContent = 'Loading recipe...';
                            }
                            await this.loadRecipeForSize(productId, selectedSizeId, allIngredients);
                            await this.updateRecipeSummary(productId, productSizes);
                        });
                    }
                }
            }
            
            // Update size selector dropdown
            if (sizeSelector) {
                const defaultRecipeExists = existingRecipes['default'] && existingRecipes['default'].ingredient_count > 0;
                const defaultIndicator = defaultRecipeExists ? ' ✓' : '';
                
                // Clear and rebuild dropdown
                sizeSelector.innerHTML = `<option value="">Default Recipe (applies to all sizes unless overridden)${defaultIndicator}</option>`;
                
                productSizes.forEach(size => {
                    const sizeRecipe = existingRecipes[size.id];
                    const hasRecipe = sizeRecipe && sizeRecipe.ingredient_count > 0;
                    const indicator = hasRecipe ? ' ✓' : '';
                    const option = document.createElement('option');
                    option.value = size.id;
                    option.textContent = `${size.size_name} (${size.size_oz} oz)${indicator}`;
                    sizeSelector.appendChild(option);
                });
            }
            
            // Show/hide size selector section based on whether sizes exist
            if (sizeSelectorSection) {
                if (productSizes.length === 0) {
                    sizeSelectorSection.style.display = 'none';
                } else {
                    sizeSelectorSection.style.display = 'block';
                }
            }
            
            // Update the info message
            const infoMessage = document.querySelector('div[style*="rgba(255, 193, 7, 0.1)"]');
            if (infoMessage) {
                if (productSizes.length === 0) {
                    infoMessage.style.display = 'block';
                    infoMessage.innerHTML = 'ℹ️ This product does not have size options. Use "Manage Size Options" above to add sizes, or the recipe will apply to the product as a whole.';
                } else {
                    infoMessage.style.display = 'none';
                }
            }
            
            errorDialog.showSuccess(`Sizes saved successfully! ${sizes.length} size${sizes.length !== 1 ? 's' : ''} configured.`, 'Success');
        } catch (error) {
            console.error('Error saving recipe product sizes:', error);
            errorDialog.show(error.message || 'Failed to save sizes', 'Error');
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
        this.selectedRecipeSizeId = null; // Reset selected size
        const productResult = await adminManager.getAllProducts(true);
        const product = productResult.products?.find(p => p.id === productId);
        
        // Always try to load product sizes (in case product has sizes but flag isn't set)
        let productSizes = [];
        const sizesResult = await adminManager.getProductSizes(productId);
        if (sizesResult.success && sizesResult.sizes && sizesResult.sizes.length > 0) {
            productSizes = sizesResult.sizes;
            console.log(`Found ${productSizes.length} sizes for product ${productId}:`, productSizes);
        } else {
            console.log(`No sizes found for product ${productId} (has_sizes: ${product?.has_sizes})`);
        }
        
        // Load all existing recipes to show which sizes have recipes
        const allRecipesResult = await adminManager.getAllDrinkRecipes(productId);
        const existingRecipes = allRecipesResult.success ? allRecipesResult.recipesBySize : {};
        
        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];

        // Load product-level default recipe (sizeId = null)
        const drinkIngredientsResult = await adminManager.getDrinkIngredients(productId, null);
        const drinkIngredients = drinkIngredientsResult.drinkIngredients || [];
        const drinkIngredientMap = {};
        drinkIngredients.forEach(di => {
            drinkIngredientMap[di.ingredient_id] = di;
        });

        const modal = this.createModal(
            `Manage Recipe: ${product?.name || 'Drink'}`,
            await this.getDrinkIngredientsFormHTML(allIngredients, drinkIngredientMap, productSizes, productId, existingRecipes)
        );
        document.body.appendChild(modal);
        
        // Set up size selector change handler
        const sizeSelector = document.getElementById('recipe-size-selector');
        if (sizeSelector) {
            console.log('Size selector found, setting up change handler');
            sizeSelector.addEventListener('change', async (e) => {
                const selectedSizeId = e.target.value || null;
                console.log('Size selector changed to:', selectedSizeId);
                // Show loading state
                const sizeDisplay = document.getElementById('recipe-size-display');
                if (sizeDisplay) {
                    sizeDisplay.textContent = 'Loading recipe...';
                }
                await this.loadRecipeForSize(productId, selectedSizeId, allIngredients);
                // Refresh recipe summary after loading
                await this.updateRecipeSummary(productId, productSizes);
            });
        } else {
            console.log('No size selector found - product may not have sizes');
        }
        
        // Set up custom price toggle handlers for all ingredients
        allIngredients.forEach(ing => {
            const checkbox = document.getElementById(`ing-${ing.id}-use-default-price`);
            if (checkbox) {
                // Set initial state
                this.toggleCustomPrice(ing.id);
            }
            
            // Set up required checkbox change handler to update recipe list
            const requiredCheckbox = document.getElementById(`ing-${ing.id}-required`);
            if (requiredCheckbox) {
                requiredCheckbox.addEventListener('change', () => {
                    this.updateRecipeList();
                });
            }
        });
        
        // Initial recipe list update
        await this.updateRecipeList();
    }
    
    async updateRecipeSummary(productId, productSizes) {
        // Reload all recipes to update the summary
        const allRecipesResult = await adminManager.getAllDrinkRecipes(productId);
        const existingRecipes = allRecipesResult.success ? allRecipesResult.recipesBySize : {};
        
        // Find and update the recipe summary section
        const summaryContainer = document.querySelector('[data-recipe-summary]');
        if (summaryContainer) {
            const defaultRecipeExists = existingRecipes['default'] && existingRecipes['default'].ingredient_count > 0;
            
            let html = '<div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 0.95rem;">📋 Existing Recipes:</div>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
            
            // Show default recipe status
            if (defaultRecipeExists) {
                const defaultRecipe = existingRecipes['default'];
                html += `<span style="padding: 0.4rem 0.75rem; background: rgba(76, 175, 80, 0.15); color: #2e7d32; border-radius: 6px; font-size: 0.85rem; font-weight: 500; border: 1px solid rgba(76, 175, 80, 0.3);">✓ Default Recipe (${defaultRecipe.ingredient_count} ingredient${defaultRecipe.ingredient_count !== 1 ? 's' : ''})</span>`;
            } else {
                html += `<span style="padding: 0.4rem 0.75rem; background: rgba(158, 158, 158, 0.15); color: #616161; border-radius: 6px; font-size: 0.85rem; border: 1px solid rgba(158, 158, 158, 0.3);">○ Default Recipe (none)</span>`;
            }
            
            // Show size-specific recipe status
            if (productSizes && productSizes.length > 0) {
                productSizes.forEach(size => {
                    const sizeRecipe = existingRecipes[size.id];
                    if (sizeRecipe && sizeRecipe.ingredient_count > 0) {
                        html += `<span style="padding: 0.4rem 0.75rem; background: rgba(76, 175, 80, 0.15); color: #2e7d32; border-radius: 6px; font-size: 0.85rem; font-weight: 500; border: 1px solid rgba(76, 175, 80, 0.3);">✓ ${size.size_name} (${sizeRecipe.ingredient_count} ingredient${sizeRecipe.ingredient_count !== 1 ? 's' : ''})</span>`;
                    } else {
                        html += `<span style="padding: 0.4rem 0.75rem; background: rgba(158, 158, 158, 0.15); color: #616161; border-radius: 6px; font-size: 0.85rem; border: 1px solid rgba(158, 158, 158, 0.3);">○ ${size.size_name} (none)</span>`;
                    }
                });
            }
            
            html += '</div>';
            summaryContainer.innerHTML = html;
        }
        
        // Also update dropdown indicators
        const sizeSelector = document.getElementById('recipe-size-selector');
        if (sizeSelector && productSizes && productSizes.length > 0) {
            const defaultRecipeExists = existingRecipes['default'] && existingRecipes['default'].ingredient_count > 0;
            
            // Update default option
            sizeSelector.options[0].text = `Default Recipe (applies to all sizes unless overridden)${defaultRecipeExists ? ' ✓' : ''}`;
            
            // Update size options
            productSizes.forEach((size, index) => {
                const sizeRecipe = existingRecipes[size.id];
                const hasRecipe = sizeRecipe && sizeRecipe.ingredient_count > 0;
                const optionIndex = index + 1; // +1 because default is at index 0
                if (sizeSelector.options[optionIndex]) {
                    sizeSelector.options[optionIndex].text = `${size.size_name} (${size.size_oz} oz)${hasRecipe ? ' ✓' : ''}`;
                }
            });
        }
    }
    
    toggleCustomPrice(ingredientId) {
        const checkbox = document.getElementById(`ing-${ingredientId}-use-default-price`);
        const container = document.getElementById(`ing-${ingredientId}-custom-price-container`);
        
        if (checkbox && container) {
            const useDefaultPrice = checkbox.checked;
            container.style.display = useDefaultPrice ? 'none' : 'flex';
        }
    }

    async updateRecipeList() {
        const container = document.getElementById('recipe-list-container');
        const countElement = document.getElementById('recipe-list-count');
        if (!container) return;
        
        // Get all ingredients
        const ingredientsResult = await adminManager.getAllIngredients(true);
        const allIngredients = ingredientsResult.ingredients || [];
        
        // Find ingredients with amount > 0
        const recipeIngredients = [];
        allIngredients.forEach(ing => {
            const amountInput = document.getElementById(`ing-${ing.id}-amount`);
            const unitSelect = document.getElementById(`ing-${ing.id}-unit-type`);
            const requiredCheckbox = document.getElementById(`ing-${ing.id}-required`);
            
            if (amountInput) {
                const amount = parseFloat(amountInput.value || 0);
                if (amount > 0 || (requiredCheckbox && requiredCheckbox.checked)) {
                    const unitType = unitSelect?.value || ing.unit_type || 'parts';
                    const isRequired = requiredCheckbox?.checked || false;
                    recipeIngredients.push({
                        id: ing.id,
                        name: ing.name,
                        amount: amount,
                        unitType: unitType,
                        isRequired: isRequired,
                        category: ing.category
                    });
                }
            }
        });
        
        // Update count
        if (countElement) {
            countElement.textContent = `${recipeIngredients.length} ingredient${recipeIngredients.length !== 1 ? 's' : ''}`;
        }
        
        // Update container
        if (recipeIngredients.length === 0) {
            container.innerHTML = '<p style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.6; font-style: italic; text-align: center; padding: 1rem 0;">No ingredients added yet. Increase ingredient amounts above to add them to the recipe.</p>';
        } else {
            // Group by category
            const categories = {
                base_drinks: { name: 'Base Drinks', ingredients: [] },
                sugars: { name: 'Sugars', ingredients: [] },
                liquid_creamers: { name: 'Liquid Creamers', ingredients: [] },
                toppings: { name: 'Toppings', ingredients: [] },
                add_ins: { name: 'Add-ins', ingredients: [] }
            };
            
            recipeIngredients.forEach(ing => {
                const cat = categories[ing.category] || categories.add_ins;
                cat.ingredients.push(ing);
            });
            
            let html = '';
            Object.values(categories).forEach(category => {
                if (category.ingredients.length === 0) return;
                
                html += `<div style="margin-bottom: 0.75rem;">`;
                html += `<div style="font-size: 0.85rem; font-weight: 600; color: var(--deep-brown); margin-bottom: 0.5rem; opacity: 0.8;">${category.name}</div>`;
                
                category.ingredients.forEach(ing => {
                    // Get the display unit name (singular form for special cases)
                    let unitDisplay = ing.unitType;
                    if (ing.unitType === 'shots') {
                        unitDisplay = 'shot';
                    } else if (ing.unitType === 'pumps') {
                        unitDisplay = 'pump';
                    }
                    
                    // Determine if we need to pluralize
                    // Units that are already plural or don't need pluralization: parts, ounces, teaspoons, tablespoons, etc.
                    const pluralUnits = ['parts', 'ounces', 'teaspoons', 'tablespoons', 'cups', 'pints', 'quarts', 'gallons'];
                    const needsPluralization = !pluralUnits.includes(ing.unitType.toLowerCase()) && ing.amount !== 1;
                    
                    const unitText = needsPluralization ? `${unitDisplay}s` : unitDisplay;
                    
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; margin-bottom: 0.25rem; background: rgba(139, 111, 71, 0.05); border-radius: 4px; border-left: 3px solid ${ing.isRequired ? 'var(--auburn)' : 'rgba(139, 111, 71, 0.3)'};">
                            <div style="flex: 1;">
                                <span style="font-weight: 500; color: var(--deep-brown); font-size: 0.9rem;">${ing.name}</span>
                                ${ing.isRequired ? '<span style="font-size: 0.75rem; color: var(--auburn); margin-left: 0.5rem; font-weight: 600;">REQUIRED</span>' : ''}
                            </div>
                            <div style="font-size: 0.9rem; color: var(--text-dark); font-weight: 500;">
                                ${ing.amount} ${unitText}
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            });
            
            container.innerHTML = html;
        }
    }
    
    async loadRecipeForSize(productId, sizeId, allIngredients) {
        this.selectedRecipeSizeId = sizeId;
        console.log(`Loading recipe for product ${productId}, sizeId: ${sizeId || 'null (default)'}`);
        
        // Load recipe for the selected size (or product-level if sizeId is null)
        const drinkIngredientsResult = await adminManager.getDrinkIngredients(productId, sizeId);
        const drinkIngredients = drinkIngredientsResult.drinkIngredients || [];
        console.log(`Loaded ${drinkIngredients.length} ingredients for size ${sizeId || 'default'}`);
        
        const drinkIngredientMap = {};
        drinkIngredients.forEach(di => {
            drinkIngredientMap[di.ingredient_id] = di;
        });
        
        // Update form fields with the loaded recipe
        let updatedCount = 0;
        allIngredients.forEach(ing => {
            const di = drinkIngredientMap[ing.id];
            const amountInput = document.getElementById(`ing-${ing.id}-amount`);
            const unitSelect = document.getElementById(`ing-${ing.id}-unit-type`);
            const requiredCheckbox = document.getElementById(`ing-${ing.id}-required`);
            const removableCheckbox = document.getElementById(`ing-${ing.id}-removable`);
            const addableCheckbox = document.getElementById(`ing-${ing.id}-addable`);
            const useDefaultPriceCheckbox = document.getElementById(`ing-${ing.id}-use-default-price`);
            const customPriceInput = document.getElementById(`ing-${ing.id}-custom-price`);
            const customPriceContainer = document.getElementById(`ing-${ing.id}-custom-price-container`);
            
            if (amountInput) {
                amountInput.value = di?.default_amount || 0;
                updatedCount++;
            }
            if (unitSelect) {
                const savedUnitType = di?.unit_type || ing.unit_type || 'parts';
                unitSelect.value = savedUnitType;
            }
            if (requiredCheckbox) requiredCheckbox.checked = di?.is_required || false;
            if (removableCheckbox) removableCheckbox.checked = di?.is_removable !== false;
            if (addableCheckbox) addableCheckbox.checked = di?.is_addable !== false;
            if (useDefaultPriceCheckbox) {
                useDefaultPriceCheckbox.checked = di?.use_default_price !== false;
                // Update custom price container visibility
                if (customPriceContainer) {
                    customPriceContainer.style.display = useDefaultPriceCheckbox.checked ? 'none' : 'flex';
                }
            }
            if (customPriceInput) {
                customPriceInput.value = (di?.custom_price !== null && di?.custom_price !== undefined) ? parseFloat(di.custom_price).toFixed(2) : '';
            }
        });
        console.log(`Updated ${updatedCount} ingredient fields`);
        
        // Update size selector display
        const sizeSelector = document.getElementById('recipe-size-selector');
        if (sizeSelector) {
            const sizeDisplay = document.getElementById('recipe-size-display');
            if (sizeDisplay) {
                if (sizeId) {
                    const sizeOption = sizeSelector.options[sizeSelector.selectedIndex];
                    sizeDisplay.innerHTML = `✓ Editing recipe for: <strong>${sizeOption.text}</strong>`;
                    sizeDisplay.style.background = 'rgba(76, 175, 80, 0.15)';
                    sizeDisplay.style.borderLeftColor = '#4caf50';
                } else {
                    sizeDisplay.innerHTML = '✓ Editing default recipe (applies to all sizes unless overridden)';
                    sizeDisplay.style.background = 'rgba(139, 111, 71, 0.15)';
                    sizeDisplay.style.borderLeftColor = 'var(--accent-orange)';
                }
            }
        }
        
        // Update recipe list after loading
        await this.updateRecipeList();
    }

    async getDrinkIngredientsFormHTML(allIngredients, drinkIngredientMap, productSizes = [], productId = null, existingRecipes = {}) {
        // Load unit types for the unit selector
        const unitTypesResult = await adminManager.getAllUnitTypes(true);
        const unitTypes = unitTypesResult.unitTypes || [];
        
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

        let html = '';
        
        // Add recipe summary section showing which recipes exist
        const defaultRecipeExists = existingRecipes['default'] && existingRecipes['default'].ingredient_count > 0;
        const hasSizeRecipes = Object.keys(existingRecipes).some(key => key !== 'default' && existingRecipes[key].ingredient_count > 0);
        
        if (productSizes && productSizes.length > 0 || defaultRecipeExists || Object.keys(existingRecipes).length > 0) {
            html += '<div data-recipe-summary style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(139, 111, 71, 0.08); border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);">';
            html += '<div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 0.95rem;">📋 Existing Recipes:</div>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
            
            // Show default recipe status
            if (defaultRecipeExists) {
                const defaultRecipe = existingRecipes['default'];
                html += `<span style="padding: 0.4rem 0.75rem; background: rgba(76, 175, 80, 0.15); color: #2e7d32; border-radius: 6px; font-size: 0.85rem; font-weight: 500; border: 1px solid rgba(76, 175, 80, 0.3);">✓ Default Recipe (${defaultRecipe.ingredient_count} ingredient${defaultRecipe.ingredient_count !== 1 ? 's' : ''})</span>`;
            } else {
                html += `<span style="padding: 0.4rem 0.75rem; background: rgba(158, 158, 158, 0.15); color: #616161; border-radius: 6px; font-size: 0.85rem; border: 1px solid rgba(158, 158, 158, 0.3);">○ Default Recipe (none)</span>`;
            }
            
            // Show size-specific recipe status
            if (productSizes && productSizes.length > 0) {
                productSizes.forEach(size => {
                    const sizeRecipe = existingRecipes[size.id];
                    if (sizeRecipe && sizeRecipe.ingredient_count > 0) {
                        html += `<span style="padding: 0.4rem 0.75rem; background: rgba(76, 175, 80, 0.15); color: #2e7d32; border-radius: 6px; font-size: 0.85rem; font-weight: 500; border: 1px solid rgba(76, 175, 80, 0.3);">✓ ${size.size_name} (${sizeRecipe.ingredient_count} ingredient${sizeRecipe.ingredient_count !== 1 ? 's' : ''})</span>`;
                    } else {
                        html += `<span style="padding: 0.4rem 0.75rem; background: rgba(158, 158, 158, 0.15); color: #616161; border-radius: 6px; font-size: 0.85rem; border: 1px solid rgba(158, 158, 158, 0.3);">○ ${size.size_name} (none)</span>`;
                    }
                });
            }
            
            html += '</div>';
            html += '</div>';
        }
        
        // Add size management section (collapsible)
        html += '<div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(139, 111, 71, 0.08); border-radius: 8px; border: 1px solid rgba(139, 111, 71, 0.2);">';
        html += '<button type="button" id="toggle-size-management" onclick="adminUI.toggleSizeManagement()" style="width: 100%; display: flex; justify-content: space-between; align-items: center; background: none; border: none; padding: 0.75rem; cursor: pointer; font-size: 1rem; font-weight: 600; color: var(--deep-brown);">';
        html += '<span>📏 Manage Size Options</span>';
        html += '<span id="size-management-icon" style="font-size: 1.2rem; transition: transform 0.2s;">▼</span>';
        html += '</button>';
        html += '<div id="size-management-content" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(139, 111, 71, 0.2);">';
        html += '<div style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-dark); opacity: 0.8;">Define custom sizes for this product. Each size can have its own recipe and price.</div>';
        html += '<div id="recipe-product-sizes-list" style="margin-bottom: 1rem;">';
        if (productSizes && productSizes.length > 0) {
            productSizes.forEach(size => {
                html += this.getProductSizeRowHTML(size);
            });
        } else {
            html += '<p style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; font-style: italic;">No sizes added yet. Click "Add Size" below.</p>';
        }
        html += '</div>';
        html += '<div style="display: flex; gap: 0.75rem; margin-bottom: 1rem;">';
        html += '<button type="button" onclick="adminUI.addRecipeProductSizeRow()" class="btn btn-secondary" style="flex: 0 0 auto;">+ Add Size</button>';
        html += '<button type="button" onclick="adminUI.saveRecipeProductSizes(\'' + productId + '\')" class="btn" style="flex: 0 0 auto;">💾 Save Sizes</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Add size selector if product has sizes
        if (productSizes && productSizes.length > 0) {
            html += '<div style="margin-bottom: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, var(--cream) 0%, rgba(139, 111, 71, 0.05) 100%); border-radius: 8px; border: 2px solid rgba(139, 111, 71, 0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
            html += '<label style="display: block; font-weight: 600; color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1.1rem;">📏 Select Size to Edit Recipe:</label>';
            html += '<select id="recipe-size-selector" style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 4px; background: white; cursor: pointer; font-weight: 500;">';
            
            // Default option with indicator
            const defaultIndicator = defaultRecipeExists ? ' ✓' : '';
            html += `<option value="">Default Recipe (applies to all sizes unless overridden)${defaultIndicator}</option>`;
            
            // Size options with indicators
            productSizes.forEach(size => {
                const sizeRecipe = existingRecipes[size.id];
                const hasRecipe = sizeRecipe && sizeRecipe.ingredient_count > 0;
                const indicator = hasRecipe ? ' ✓' : '';
                html += `<option value="${size.id}">${size.size_name} (${size.size_oz} oz)${indicator}</option>`;
            });
            
            html += '</select>';
            html += '<div id="recipe-size-display" style="margin-top: 0.75rem; font-size: 0.95rem; color: var(--deep-brown); font-weight: 500; padding: 0.75rem; background: rgba(139, 111, 71, 0.15); border-radius: 4px; border-left: 4px solid var(--accent-orange);">✓ Editing default recipe (applies to all sizes unless overridden)</div>';
            html += '<div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-dark); opacity: 0.8; padding: 0.5rem; background: rgba(139, 111, 71, 0.05); border-radius: 4px;">💡 <strong>Tip:</strong> Select a size from the dropdown above to create/edit a size-specific recipe. If no size-specific recipe exists, the default recipe will be used for that size. Checkmarks (✓) indicate existing recipes.</div>';
            html += '</div>';
        } else {
            // Show message if product should have sizes but none are found
            html += '<div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(255, 193, 7, 0.1); border-radius: 4px; border-left: 4px solid #ffc107; font-size: 0.9rem; color: var(--text-dark);">';
            html += 'ℹ️ This product does not have size options. Use "Manage Size Options" above to add sizes, or the recipe will apply to the product as a whole.';
            html += '</div>';
        }
        
        // Add Recipe List section (shows only ingredients with amount > 0)
        html += '<div id="recipe-list-section" style="margin-bottom: 1.5rem; padding: 1.25rem; background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%); border-radius: 8px; border: 2px solid rgba(76, 175, 80, 0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">';
        html += '<label style="font-weight: 600; color: var(--deep-brown); font-size: 1.1rem;">📝 Current Recipe:</label>';
        html += '<span id="recipe-list-count" style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.7;">0 ingredients</span>';
        html += '</div>';
        html += '<div id="recipe-list-container" style="min-height: 60px; max-height: 200px; overflow-y: auto; padding: 0.75rem; background: white; border-radius: 6px; border: 1px solid rgba(76, 175, 80, 0.2);">';
        html += '<p style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.6; font-style: italic; text-align: center; padding: 1rem 0;">No ingredients added yet. Increase ingredient amounts above to add them to the recipe.</p>';
        html += '</div>';
        html += '</div>';
        
        html += '<div style="max-height: 60vh; overflow-y: auto;">';
        Object.values(categories).forEach(category => {
            if (category.ingredients.length === 0) return;
            
            html += `<h4 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--deep-brown);">${category.name}</h4>`;
            category.ingredients.forEach(ing => {
                const di = drinkIngredientMap[ing.id];
                // Get saved unit type or default to ingredient's unit type
                const savedUnitType = di?.unit_type || ing.unit_type || 'parts';
                
                // Build unit type options
                let unitTypeOptions = '<option value="parts">Parts</option>';
                unitTypes.forEach(ut => {
                    const selected = savedUnitType === ut.name ? 'selected' : '';
                    unitTypeOptions += `<option value="${ut.name}" ${selected}>${ut.display_name || ut.name}</option>`;
                });
                
                html += `
                    <div style="padding: 0.75rem; background: var(--cream); border-radius: 4px; margin-bottom: 0.5rem;">
                        <!-- First line: Name and default info -->
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                            <div style="flex: 1;">
                                <strong style="font-size: 1rem; color: var(--deep-brown);">${ing.name}</strong>
                                <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.25rem;">
                                    Default: ${ing.unit_type} • $${parseFloat(ing.unit_cost).toFixed(2)}/${ing.unit_type === 'shots' ? 'shot' : ing.unit_type === 'pumps' ? 'pump' : ing.unit_type}
                                </div>
                            </div>
                        </div>
                        <!-- Second line: Controls and checkboxes -->
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="font-size: 0.85rem; color: var(--deep-brown);">Amount:</label>
                                <input type="number" id="ing-${ing.id}-amount" step="0.1" min="0" value="${di?.default_amount || 0}" style="width: 70px; padding: 0.4rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 4px; font-size: 0.9rem;" onchange="adminUI.updateRecipeList()" oninput="adminUI.updateRecipeList()">
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="font-size: 0.85rem; color: var(--deep-brown);">Unit:</label>
                                <select id="ing-${ing.id}-unit-type" style="padding: 0.4rem; font-size: 0.85rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 4px; min-width: 100px;">
                                    ${unitTypeOptions}
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem; margin-left: auto;">
                                <label style="font-size: 0.85rem; color: var(--deep-brown); cursor: pointer;">
                                    <input type="checkbox" id="ing-${ing.id}-required" ${di?.is_required ? 'checked' : ''} style="margin-right: 0.25rem;"> Required
                                </label>
                                <label style="font-size: 0.85rem; color: var(--deep-brown); cursor: pointer;">
                                    <input type="checkbox" id="ing-${ing.id}-removable" ${di?.is_removable !== false ? 'checked' : ''} style="margin-right: 0.25rem;"> Removable
                                </label>
                                <label style="font-size: 0.85rem; color: var(--deep-brown); cursor: pointer;">
                                    <input type="checkbox" id="ing-${ing.id}-addable" ${di?.is_addable !== false ? 'checked' : ''} style="margin-right: 0.25rem;"> Addable
                                </label>
                                <label style="font-size: 0.85rem; color: var(--deep-brown); cursor: pointer;" title="If checked, ingredient uses default price. If unchecked, you can set a custom price or include in base price.">
                                    <input type="checkbox" id="ing-${ing.id}-use-default-price" ${di?.use_default_price === false ? '' : 'checked'} style="margin-right: 0.25rem;" onchange="adminUI.toggleCustomPrice('${ing.id}')"> Use Default Price
                                </label>
                            </div>
                        </div>
                        <!-- Custom Price Field (shown when Use Default Price is unchecked) -->
                        <div id="ing-${ing.id}-custom-price-container" style="display: ${di?.use_default_price === false ? 'flex' : 'none'}; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(139, 111, 71, 0.2);">
                            <label style="font-size: 0.85rem; color: var(--deep-brown); font-weight: 500;">Custom Price per ${ing.unit_type === 'shots' ? 'shot' : ing.unit_type === 'pumps' ? 'pump' : ing.unit_type}:</label>
                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                                <span style="font-size: 0.9rem; color: var(--deep-brown);">$</span>
                                <input type="number" id="ing-${ing.id}-custom-price" step="0.01" min="0" value="${di?.custom_price !== null && di?.custom_price !== undefined ? parseFloat(di.custom_price).toFixed(2) : ''}" placeholder="0.00" style="width: 80px; padding: 0.4rem; border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 4px; font-size: 0.9rem;">
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-dark); opacity: 0.7; font-style: italic;">Leave blank to include in base price (no charge)</span>
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
            // Validate ingredient ID is a valid UUID
            if (!ing.id || ing.id === 'null' || ing.id === 'undefined') {
                console.warn(`Skipping ingredient with invalid ID:`, ing);
                return;
            }
            
            const amount = parseFloat(document.getElementById(`ing-${ing.id}-amount`)?.value || 0);
            const unitType = document.getElementById(`ing-${ing.id}-unit-type`)?.value || ing.unit_type || 'parts';
            const required = document.getElementById(`ing-${ing.id}-required`)?.checked || false;
            const removable = document.getElementById(`ing-${ing.id}-removable`)?.checked !== false;
            const addable = document.getElementById(`ing-${ing.id}-addable`)?.checked !== false;
            const useDefaultPrice = document.getElementById(`ing-${ing.id}-use-default-price`)?.checked !== false;
            const customPriceValue = document.getElementById(`ing-${ing.id}-custom-price`)?.value?.trim();
            const customPrice = customPriceValue && customPriceValue !== '' ? parseFloat(customPriceValue) : null;

            if (amount > 0 || required) {
                // Ensure unit_type is null if empty or invalid, not the string "null"
                const finalUnitType = (unitType && unitType !== 'null' && unitType !== 'undefined' && unitType.trim() !== '') ? unitType : null;
                
                ingredients.push({
                    ingredient_id: ing.id,
                    default_amount: amount,
                    unit_type: finalUnitType, // Save the selected unit type (null if empty)
                    is_required: required,
                    is_removable: removable,
                    is_addable: addable,
                    use_default_price: useDefaultPrice,
                    custom_price: customPrice // Custom price (null if not set, means included in base price)
                });
            }
        });

        // Get selected size ID if size selector exists
        const sizeSelector = document.getElementById('recipe-size-selector');
        const sizeId = sizeSelector ? (sizeSelector.value || null) : null;
        
        const result = await adminManager.setDrinkIngredients(this.editingDrinkIngredients, ingredients, sizeId);
        if (result.success) {
            // Refresh recipe summary before closing
            const sizesResult = await adminManager.getProductSizes(this.editingDrinkIngredients);
            const productSizes = sizesResult.success ? sizesResult.sizes : [];
            await this.updateRecipeSummary(this.editingDrinkIngredients, productSizes);
            
            const sizeName = sizeId && sizeSelector ? sizeSelector.options[sizeSelector.selectedIndex].text : 'default';
            errorDialog.showSuccess(`Drink recipe updated successfully for ${sizeName}!`, 'Success');
            
            // Don't close modal - let user see the updated summary and continue editing if needed
            // document.querySelector('.admin-modal-overlay')?.remove();
            // this.editingDrinkIngredients = null;
            // this.selectedRecipeSizeId = null;
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

    async generateImageForCurrentProduct() {
        const productId = this.editingProduct;
        if (!productId) {
            errorDialog.show('No product selected', 'Error');
            return;
        }

        const btn = document.getElementById('generate-image-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Generating...';
        }

        try {
            const result = await adminManager.generateImageForProduct(productId);
            
            if (result.success) {
                // Update the image URL input
                const imageInput = document.getElementById('product-image-url');
                if (imageInput) {
                    imageInput.value = result.imageUrl;
                }
                errorDialog.showSuccess('Image generated successfully!', 'Success');
            } else {
                errorDialog.show(result.error || 'Failed to generate image', 'Error');
            }
        } catch (error) {
            console.error('Image generation error:', error);
            errorDialog.show(error.message || 'Failed to generate image', 'Error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Generate AI Image';
            }
        }
    }

    async generateImagesForAllDrinks() {
        if (!confirm('This will generate AI images for all drinks without images. This may take several minutes and use API credits. Continue?')) {
            return;
        }

        // Create a progress modal
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
        
        const modal = document.createElement('div');
        modal.style.cssText = 'background: var(--parchment); padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;';
        modal.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; color: var(--deep-brown);">Generating Images</h3>
            <div id="image-gen-progress" style="margin-bottom: 1rem;">
                <p style="color: var(--text-dark);">Starting...</p>
            </div>
            <button class="btn" onclick="this.closest('.admin-modal-overlay').remove()" id="close-progress-btn" style="display: none;">Close</button>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const progressDiv = document.getElementById('image-gen-progress');
        const closeBtn = document.getElementById('close-progress-btn');

        try {
            const result = await adminManager.generateImagesForAllDrinksWithoutImages({
                onProgress: (progress) => {
                    if (progressDiv) {
                        progressDiv.innerHTML = `
                            <p style="color: var(--text-dark); margin-bottom: 0.5rem;">
                                Generating image ${progress.current} of ${progress.total}...
                            </p>
                            <p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem;">
                                ${progress.product}
                            </p>
                        `;
                    }
                }
            });

            if (result.success) {
                progressDiv.innerHTML = `
                    <p style="color: var(--auburn); font-weight: 600; margin-bottom: 0.5rem;">
                        ✓ Successfully generated ${result.generated} images!
                    </p>
                    ${result.total > result.generated ? `
                        <p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem;">
                            ${result.total - result.generated} drinks already had images
                        </p>
                    ` : ''}
                `;
                closeBtn.style.display = 'block';
                
                // Refresh the menu view
                await this.renderMenuManagementView();
            } else {
                progressDiv.innerHTML = `
                    <p style="color: var(--auburn); font-weight: 600;">
                        Error: ${result.error}
                    </p>
                `;
                closeBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('Batch image generation error:', error);
            if (progressDiv) {
                progressDiv.innerHTML = `
                    <p style="color: var(--auburn); font-weight: 600;">
                        Error: ${error.message}
                    </p>
                `;
            }
            if (closeBtn) {
                closeBtn.style.display = 'block';
            }
        }
    }
}

// Global admin UI instance - explicitly assign to window to ensure it's global
try {
    window.adminUI = new AdminUI();
    // Also assign to adminUI for backward compatibility
    const adminUI = window.adminUI;
    console.log('AdminUI instance created successfully');
} catch (error) {
    console.error('Error creating AdminUI instance:', error);
    console.error('Error stack:', error.stack);
    // Create a minimal fallback object to prevent further errors
    window.adminUI = {
        init: async () => {
            const container = document.getElementById('admin-content');
            if (container) {
                container.innerHTML = `<p style="text-align: center; color: var(--auburn);">Error: Failed to initialize Admin UI. ${error.message}<br><br>Check the browser console for details.</p>`;
            }
        }
    };
    const adminUI = window.adminUI;
}

