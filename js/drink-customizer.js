// Drink Customization Component
// Handles the customization dialog for drinks

class DrinkCustomizer {
    constructor() {
        this.ingredients = [];
        this.drinkIngredients = {}; // Map of product_id to default ingredients
        this.productSizes = []; // Store sizes for current product
        this.selectedSize = null; // Currently selected size
        this.loadIngredients();
    }

    async loadIngredients() {
        const client = getSupabaseClient();
        if (!client) {
            // Use mock ingredients if Supabase not configured
            this.ingredients = this.getMockIngredients();
            return;
        }

        const shopId = configManager.getShopId();
        if (!shopId) {
            console.warn('Shop ID not configured - using mock ingredients');
            this.ingredients = this.getMockIngredients();
            return;
        }

        try {
            const { data, error } = await client
                .from('ingredients')
                .select('*')
                .eq('available', true)
                .eq('shop_id', shopId)
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            this.ingredients = data || this.getMockIngredients();
        } catch (error) {
            console.error('Load ingredients error:', error);
            this.ingredients = this.getMockIngredients();
        }
    }

    getMockIngredients() {
        return [
            { id: '1', name: 'Espresso Shot', category: 'espresso', unit_type: 'shots', unit_cost: 0.75 },
            { id: '2', name: 'Vanilla Syrup', category: 'syrup', unit_type: 'pumps', unit_cost: 0.25 },
            { id: '3', name: 'Caramel Syrup', category: 'syrup', unit_type: 'pumps', unit_cost: 0.25 },
            { id: '4', name: 'Hazelnut Syrup', category: 'syrup', unit_type: 'pumps', unit_cost: 0.25 },
            { id: '5', name: 'Maple Syrup', category: 'syrup', unit_type: 'pumps', unit_cost: 0.30 },
            { id: '6', name: 'Pumpkin Spice Syrup', category: 'syrup', unit_type: 'pumps', unit_cost: 0.30 },
            { id: '7', name: 'Steamed Milk', category: 'liquid', unit_type: 'oz', unit_cost: 0.10 },
            { id: '8', name: 'Oat Milk', category: 'liquid', unit_type: 'oz', unit_cost: 0.12 },
            { id: '9', name: 'Almond Milk', category: 'liquid', unit_type: 'oz', unit_cost: 0.12 },
            { id: '10', name: 'Sugar', category: 'sweetener', unit_type: 'tsp', unit_cost: 0.00 },
            { id: '11', name: 'Stevia', category: 'sweetener', unit_type: 'packets', unit_cost: 0.00 },
            { id: '12', name: 'Whipped Cream', category: 'topping', unit_type: 'count', unit_cost: 0.50 },
            { id: '13', name: 'Toasted Pecans', category: 'topping', unit_type: 'count', unit_cost: 0.50 }
        ];
    }

    async loadDrinkIngredients(productId) {
        const client = getSupabaseClient();
        if (!client) {
            // Return empty for now - can add mock data later
            return {};
        }

        try {
            const { data, error } = await client
                .from('drink_ingredients')
                .select(`
                    *,
                    ingredient:ingredients(*)
                `)
                .eq('product_id', productId);

            if (error) throw error;
            
            console.log(`Loaded ${(data || []).length} drink ingredients for product ${productId}:`, data);
            
            const ingredientsMap = {};
            (data || []).forEach(di => {
                ingredientsMap[di.ingredient_id] = {
                    defaultAmount: parseFloat(di.default_amount),
                    // Use recipe's unit_type if set, otherwise fall back to ingredient's default
                    unitType: di.unit_type || di.ingredient?.unit_type,
                    isRequired: di.is_required,
                    isRemovable: di.is_removable,
                    isAddable: di.is_addable,
                    useDefaultPrice: di.use_default_price !== undefined ? di.use_default_price : true, // Default to true for backward compatibility
                    ingredient: di.ingredient
                };
            });
            
            console.log('Drink ingredients map:', ingredientsMap);
            return ingredientsMap;
        } catch (error) {
            console.error('Load drink ingredients error:', error);
            return {};
        }
    }

    async loadProductSizes(productId) {
        const client = getSupabaseClient();
        if (!client) {
            return [];
        }

        try {
            const shopId = configManager.getShopId();
            if (!shopId) {
                return [];
            }

            const { data, error } = await client
                .from('product_sizes')
                .select('*')
                .eq('product_id', productId)
                .eq('shop_id', shopId)
                .eq('available', true)
                .order('display_order', { ascending: true })
                .order('size_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Load product sizes error:', error);
            return [];
        }
    }

    showCustomizationDialog(product, onConfirm) {
        this.currentProduct = product;
        this.onConfirmCallback = onConfirm;
        this.customizations = {}; // Map of ingredient_id to amount
        this.basePrice = parseFloat(product.price);

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'customization-modal-overlay';
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
            z-index: 10003;
            backdrop-filter: blur(3px);
            animation: fadeIn 0.2s ease;
            padding: 1rem;
            overflow-y: auto;
        `;

        const modal = document.createElement('div');
        modal.className = 'customization-modal';
        modal.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideDown 0.3s ease;
            border: 2px solid var(--accent-orange);
            display: flex;
            flex-direction: column;
        `;

        modal.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2); flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: var(--deep-brown);">Customize ${product.name}</h2>
                    <button class="customization-modal-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;" onclick="this.closest('.customization-modal-overlay').remove()">&times;</button>
                </div>
                <p style="margin: 0.5rem 0 0 0; color: var(--text-dark); opacity: 0.8; font-size: 0.9rem;">${product.description || ''}</p>
            </div>
            <div id="customization-size-selector" style="padding: 0 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); flex-shrink: 0; display: none;">
                <!-- Size selector will be rendered here -->
            </div>
            <div id="customization-content" style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                <p style="text-align: center; color: var(--text-dark); opacity: 0.7;">Loading ingredients...</p>
            </div>
            <div style="padding: 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: var(--deep-brown);">
                        Total: $<span id="customization-total">${this.basePrice.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.25rem;">
                        Base: $<span id="customization-base-price">${this.basePrice.toFixed(2)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.customization-modal-overlay').remove()">Cancel</button>
                    <button class="btn" id="add-customized-btn" onclick="drinkCustomizer.confirmCustomization()">Add to Cart</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.modal = overlay;

        // Load ingredients, sizes, and drink recipe, then render
        // Reload ingredients to ensure we have fresh data with the correct shop_id
        this.loadIngredients().then(() => {
            console.log('Loaded ingredients:', this.ingredients.length);
            return Promise.all([
                this.loadDrinkIngredients(product.id),
                this.loadProductSizes(product.id)
            ]);
        }).then(([drinkIngredients, sizes]) => {
            console.log('Setting drinkIngredients:', drinkIngredients);
            console.log('Setting productSizes:', sizes);
            this.drinkIngredients = drinkIngredients;
            this.productSizes = sizes || [];
            this.selectedSize = null; // Reset selected size
            
            // Ensure product has size fields (in case they weren't loaded)
            if (this.currentProduct.has_sizes === undefined) {
                this.currentProduct.has_sizes = this.productSizes.length > 0;
            }
            
            this.renderCustomizationContent();
        });

        // Use event delegation for quantity buttons
        const content = modal.querySelector('#customization-content');
        if (content) {
            content.addEventListener('click', (e) => {
                const button = e.target.closest('.qty-btn');
                if (button) {
                    e.preventDefault();
                    e.stopPropagation();
                    const ingredientId = button.dataset.ingredientId;
                    const delta = parseInt(button.dataset.delta) || 0;
                    if (ingredientId && delta !== 0) {
                        console.log(`Adjusting ingredient ${ingredientId} by ${delta}`);
                        this.adjustIngredient(ingredientId, delta);
                    }
                }
            });
        }

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        document.body.style.overflow = 'hidden';
    }

    renderCustomizationContent() {
        const content = this.modal.querySelector('#customization-content');
        if (!content) return;

        // Render size selector first (if product has sizes)
        this.renderSizeSelector();

        // Only initialize customizations if they haven't been initialized yet
        // This preserves user changes when re-rendering
        const isFirstRender = Object.keys(this.customizations).length === 0;
        
        if (isFirstRender) {
            // Initialize customizations with default amounts from recipe
            // First, initialize all recipe ingredients with their default amounts (including 0)
            Object.keys(this.drinkIngredients).forEach(ingredientId => {
                const drinkIng = this.drinkIngredients[ingredientId];
                if (drinkIng) {
                    // Initialize with default amount (could be 0)
                    this.customizations[ingredientId] = drinkIng.defaultAmount || 0;
                }
            });
            
            // Then initialize other ingredients (not in recipe) to 0
            this.ingredients.forEach(ingredient => {
                if (!(ingredient.id in this.customizations)) {
                    this.customizations[ingredient.id] = 0;
                }
            });
        }

        let html = '';

        // Render recipe section (original ingredients)
        html += this.renderRecipeSection();

        // Add visual separator
        html += `<div style="margin: 2rem 0; border-top: 2px solid rgba(139, 111, 71, 0.3);"></div>`;

        // Render additional ingredients section
        html += this.renderAdditionalIngredientsSection();

        content.innerHTML = html;
        this.updateTotal();
    }

    renderRecipeSection() {
        // This section shows ALL ingredients currently in this customized order (qty > 0)
        // This includes: original recipe ingredients AND any additional ingredients added by user
        console.log('renderRecipeSection - drinkIngredients:', this.drinkIngredients);
        console.log('renderRecipeSection - available ingredients:', this.ingredients.length);
        
        const recipeIngredients = [];
        
        // First, add original recipe ingredients with qty > 0
        Object.keys(this.drinkIngredients).forEach(ingredientId => {
            const drinkIng = this.drinkIngredients[ingredientId];
            console.log(`Processing ingredient ${ingredientId}:`, drinkIng);
            if (drinkIng && drinkIng.defaultAmount > 0) {
                const currentAmount = this.customizations[ingredientId] || 0;
                // Only show if current amount > 0 (if decreased to 0, remove from display)
                if (currentAmount > 0) {
                    // Use the joined ingredient data if available, otherwise find it in this.ingredients
                    const ingredient = drinkIng.ingredient || this.ingredients.find(i => i.id === ingredientId);
                    console.log(`Found ingredient for ${ingredientId}:`, ingredient);
                    if (ingredient) {
                        recipeIngredients.push({
                            ...ingredient,
                            drinkIng: drinkIng,
                            isAddedIngredient: false
                        });
                    } else {
                        console.warn(`Ingredient ${ingredientId} not found in available ingredients or joined data`);
                    }
                }
            }
        });

        // Then, add any additional ingredients that have qty > 0 (user added them)
        this.ingredients.forEach(ingredient => {
            const drinkIng = this.drinkIngredients[ingredient.id];
            // Skip if it's already in the original recipe (already processed above)
            if (drinkIng && drinkIng.defaultAmount > 0) return;
            
            const currentAmount = this.customizations[ingredient.id] || 0;
            if (currentAmount > 0) {
                recipeIngredients.push({
                    ...ingredient,
                    drinkIng: drinkIng || null,
                    isAddedIngredient: true
                });
            }
        });

        console.log('Recipe ingredients to render:', recipeIngredients.length, recipeIngredients);

        if (recipeIngredients.length === 0) {
            return '<div style="margin-bottom: 2rem;"><h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.1rem;">🧾 Your Custom Recipe</h3><p style="color: var(--text-dark); opacity: 0.7; font-style: italic;">No ingredients in this order yet. Add some below!</p></div>';
        }

        // Group recipe ingredients by category - build categories dynamically from actual ingredient data
        const categories = {};
        
        recipeIngredients.forEach(ingredient => {
            const catKey = ingredient.category || 'other';
            if (!categories[catKey]) {
                categories[catKey] = {
                    name: this.getCategoryDisplayName(catKey),
                    ingredients: []
                };
            }
            categories[catKey].ingredients.push(ingredient);
        });
        
        // Sort ingredients within each category alphabetically
        Object.values(categories).forEach(category => {
            category.ingredients.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        });

        // Sort categories in a logical order
        const sortedCategories = this.sortCategories(categories);

        let html = '<div style="margin-bottom: 2rem;">';
        html += '<h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">🧾 Your Custom Recipe</h3>';
        html += '<p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem;">All ingredients in your customized drink:</p>';

        sortedCategories.forEach(category => {
            if (category.ingredients.length === 0) return;

            html += `<div style="margin-bottom: 1.5rem;">`;
            html += `<h4 style="color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">${category.name}</h4>`;

            category.ingredients.forEach(ingredient => {
                const drinkIng = ingredient.drinkIng || this.drinkIngredients[ingredient.id];
                const currentAmount = this.customizations[ingredient.id] || 0;
                // Use recipe's unit type if available, otherwise fall back to ingredient's default
                const effectiveUnitType = drinkIng?.unitType || ingredient.unit_type;
                const unitLabel = this.getUnitLabel(effectiveUnitType);
                // Only calculate cost if useDefaultPrice is true
                // Check explicitly for false - if null/undefined, default to true for backward compatibility
                const useDefaultPrice = drinkIng?.useDefaultPrice === false ? false : true;
                const cost = useDefaultPrice ? (parseFloat(ingredient.unit_cost || 0) * currentAmount) : 0;
                const isAdded = ingredient.isAddedIngredient;
                
                // Allow decreasing any ingredient if it has a quantity > 0
                const canDecrease = currentAmount > 0;
                
                // Show a badge for added ingredients
                const addedBadge = isAdded ? '<span style="background: var(--accent-orange); color: white; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 10px; margin-left: 0.5rem;">ADDED</span>' : '';

                html += `
                    <div class="customization-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: ${isAdded ? 'linear-gradient(135deg, var(--parchment) 0%, rgba(255, 165, 0, 0.1) 100%)' : 'var(--parchment)'}; border-radius: 8px; margin-bottom: 0.5rem; border: 2px solid ${isAdded ? 'var(--accent-orange)' : 'rgba(139, 111, 71, 0.3)'};">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">
                                ${ingredient.name}${addedBadge}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">
                                ${unitLabel}${useDefaultPrice ? ` • $${ingredient.unit_cost.toFixed(2)}/${this.getUnitAbbreviation(effectiveUnitType)}` : ''}
                                ${useDefaultPrice && cost > 0 ? ` • $${cost.toFixed(2)}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${canDecrease ? `
                                <button type="button" class="qty-btn" data-ingredient-id="${ingredient.id}" data-delta="-1" style="background: var(--cream); border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: var(--deep-brown); transition: all 0.3s ease;">-</button>
                            ` : '<div style="width: 30px;"></div>'}
                            <div style="min-width: 80px; text-align: center; font-weight: 600; color: var(--deep-brown);">
                                <span style="font-size: 1.1rem;">${currentAmount}</span>
                                <span style="font-size: 0.85rem; opacity: 0.7; margin-left: 0.25rem;">${this.getUnitDisplay(effectiveUnitType, currentAmount)}</span>
                            </div>
                            <button type="button" class="qty-btn" data-ingredient-id="${ingredient.id}" data-delta="1" style="background: var(--accent-orange); border: 2px solid var(--accent-orange); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: white; transition: all 0.3s ease;">+</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += '</div>';
        return html;
    }

    renderAdditionalIngredientsSection() {
        // Get ingredients that are NOT currently in the recipe (qty == 0)
        // This includes: ingredients not in original recipe, AND original recipe items reduced to 0
        const additionalIngredients = this.ingredients.filter(ingredient => {
            const drinkIng = this.drinkIngredients[ingredient.id];
            const currentAmount = this.customizations[ingredient.id] || 0;
            
            // Show in this section if:
            // 1. Not in original recipe and quantity is 0, OR
            // 2. Was in original recipe but has been reduced to 0
            if (currentAmount > 0) {
                // If qty > 0, it's in the recipe section, not here
                return false;
            }
            
            // Show it here if qty is 0
            return true;
        });

        if (additionalIngredients.length === 0) {
            return '<div style="margin-bottom: 2rem;"><h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">🛒 Add Ingredients</h3><p style="color: var(--text-dark); opacity: 0.7; font-style: italic;">All available ingredients have been added to your recipe!</p></div>';
        }

        // Group additional ingredients by category - build categories dynamically from actual ingredient data
        const categories = {};
        
        additionalIngredients.forEach(ingredient => {
            const catKey = ingredient.category || 'other';
            if (!categories[catKey]) {
                categories[catKey] = {
                    name: this.getCategoryDisplayName(catKey),
                    ingredients: []
                };
            }
            categories[catKey].ingredients.push(ingredient);
        });
        
        // Sort ingredients within each category alphabetically
        Object.values(categories).forEach(category => {
            category.ingredients.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        });

        // Sort categories in a logical order
        const sortedCategories = this.sortCategories(categories);

        let html = '<div style="margin-bottom: 2rem;">';
        html += '<h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">🛒 Add Ingredients</h3>';
        html += '<p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem;">Tap + to add ingredients to your custom recipe:</p>';

        sortedCategories.forEach(category => {
            if (category.ingredients.length === 0) return;

            html += `<div style="margin-bottom: 1.5rem;">`;
            html += `<h4 style="color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">${category.name}</h4>`;

            category.ingredients.forEach(ingredient => {
                const drinkIng = this.drinkIngredients[ingredient.id];
                // Use recipe's unit type if available, otherwise fall back to ingredient's default
                const effectiveUnitType = drinkIng?.unitType || ingredient.unit_type;
                const unitLabel = this.getUnitLabel(effectiveUnitType);
                const wasInRecipe = drinkIng && drinkIng.defaultAmount > 0;
                
                // Show a subtle indicator if this was removed from original recipe
                const removedIndicator = wasInRecipe ? '<span style="background: rgba(139, 111, 71, 0.2); color: var(--deep-brown); font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 10px; margin-left: 0.5rem;">REMOVED</span>' : '';

                html += `
                    <div class="customization-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--cream); border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(139, 111, 71, 0.2); ${wasInRecipe ? 'opacity: 0.7;' : ''}">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">
                                ${ingredient.name}${removedIndicator}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">
                                ${unitLabel} • $${ingredient.unit_cost.toFixed(2)}/${this.getUnitAbbreviation(effectiveUnitType)}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <button type="button" class="qty-btn" data-ingredient-id="${ingredient.id}" data-delta="1" style="background: var(--accent-orange); border: 2px solid var(--accent-orange); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: white; transition: all 0.3s ease;">+</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        });

        html += '</div>';
        return html;
    }

    adjustIngredient(ingredientId, delta) {
        // Find ingredient in available ingredients or in drinkIngredients (for recipe ingredients)
        let ingredient = this.ingredients.find(i => i.id === ingredientId);
        if (!ingredient) {
            // Try to get from drinkIngredients joined data
            const drinkIng = this.drinkIngredients[ingredientId];
            if (drinkIng && drinkIng.ingredient) {
                ingredient = drinkIng.ingredient;
            }
        }
        if (!ingredient) {
            console.warn(`Ingredient ${ingredientId} not found`);
            return;
        }

        const currentAmount = this.customizations[ingredientId] || 0;
        const newAmount = Math.max(0, currentAmount + delta);

        console.log(`Ingredient ${ingredientId}: ${currentAmount} -> ${newAmount}`);

        // Update the customization amount
        // If newAmount is 0, the ingredient will be removed from the displayed recipe
        // but the original recipe (drinkIngredients) is never changed
        this.customizations[ingredientId] = newAmount;
        
        // Re-render to update the UI and move ingredients between sections as needed
        this.renderCustomizationContent();
    }

    renderSizeSelector() {
        const sizeSelector = this.modal.querySelector('#customization-size-selector');
        if (!sizeSelector) return;

        // Check if product has sizes - check both has_sizes flag and actual sizes array
        const hasSizesFlag = this.currentProduct.has_sizes === true;
        const hasSizes = (hasSizesFlag || this.productSizes.length > 0) && this.productSizes.length > 0;
        const fixedSizeOz = this.currentProduct.fixed_size_oz;

        if (hasSizes) {
            // Show size selector
            sizeSelector.style.display = 'block';
            
            let html = '<div style="padding: 1rem 0;">';
            html += '<h3 style="color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1.1rem; font-weight: 600;">Select Size</h3>';
            html += '<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">';
            
            this.productSizes.forEach((size, index) => {
                const isSelected = this.selectedSize && this.selectedSize.size_name === size.size_name;
                html += `
                    <button type="button" 
                            class="size-option-btn" 
                            data-size-name="${size.size_name}"
                            data-size-price="${size.price}"
                            onclick="drinkCustomizer.selectSize('${size.size_name}', ${size.price})"
                            style="
                                flex: 1;
                                min-width: 120px;
                                padding: 0.75rem;
                                background: ${isSelected ? 'var(--accent-orange)' : 'var(--cream)'};
                                color: ${isSelected ? 'white' : 'var(--deep-brown)'};
                                border: 2px solid ${isSelected ? 'var(--accent-orange)' : 'rgba(139, 111, 71, 0.3)'};
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: ${isSelected ? '600' : '500'};
                                transition: all 0.3s ease;
                            ">
                        <div style="font-size: 1rem; margin-bottom: 0.25rem;">${size.size_name}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">${size.size_oz} oz</div>
                        <div style="font-size: 0.9rem; margin-top: 0.25rem;">$${parseFloat(size.price).toFixed(2)}</div>
                    </button>
                `;
            });
            
            html += '</div></div>';
            sizeSelector.innerHTML = html;
            
            // Select first size by default if none selected
            if (!this.selectedSize && this.productSizes.length > 0) {
                this.selectSize(this.productSizes[0].size_name, this.productSizes[0].price);
            }
        } else if (fixedSizeOz) {
            // Show fixed size display
            sizeSelector.style.display = 'block';
            sizeSelector.innerHTML = `
                <div style="padding: 1rem 0;">
                    <div style="font-size: 0.9rem; color: var(--text-dark); opacity: 0.8;">
                        Size: <strong>${fixedSizeOz} oz</strong>
                    </div>
                </div>
            `;
        } else {
            // Hide size selector
            sizeSelector.style.display = 'none';
        }
    }

    selectSize(sizeName, sizePrice) {
        const size = this.productSizes.find(s => s.size_name === sizeName);
        if (!size) return;
        
        this.selectedSize = size;
        this.basePrice = parseFloat(sizePrice);
        
        // Update UI
        this.renderSizeSelector();
        this.updateTotal();
    }

    updateTotal() {
        let total = this.basePrice || parseFloat(this.currentProduct.price || 0);

        this.ingredients.forEach(ingredient => {
            const amount = this.customizations[ingredient.id] || 0;
            const drinkIng = this.drinkIngredients[ingredient.id];
            
            // Only calculate cost if useDefaultPrice is true
            // Check explicitly for false - if null/undefined, default to true for backward compatibility
            const useDefaultPrice = drinkIng?.useDefaultPrice === false ? false : true;
            
            if (!useDefaultPrice) {
                // Ingredient is included in base price, don't charge per unit
                return;
            }
            
            if (drinkIng) {
                // Calculate cost difference from default
                const defaultAmount = drinkIng.defaultAmount || 0;
                const difference = amount - defaultAmount;
                total += difference * parseFloat(ingredient.unit_cost || 0);
            } else {
                // New ingredient addition
                total += amount * parseFloat(ingredient.unit_cost || 0);
            }
        });

        const totalElement = this.modal.querySelector('#customization-total');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
        
        // Update base price display
        const basePriceElement = this.modal.querySelector('#customization-base-price');
        if (basePriceElement) {
            basePriceElement.textContent = this.basePrice.toFixed(2);
        }
    }

    getUnitLabel(unitType) {
        const labels = {
            'shots': 'Shots',
            'pumps': 'Pumps',
            'oz': 'Ounces',
            'tsp': 'Teaspoons',
            'packets': 'Packets',
            'count': 'Count'
        };
        return labels[unitType] || unitType;
    }

    getCategoryDisplayName(category) {
        // Map category keys to display names with emojis
        const categoryNames = {
            'base_drinks': '☕ Base Drinks',
            'sugars': '🍬 Sugars',
            'liquid_creamers': '🥛 Liquid Creamers',
            'toppings': '✨ Toppings',
            'add_ins': '➕ Add-ins',
            'espresso': '☕ Espresso',
            'syrup': '🍯 Syrups',
            'liquid': '🥛 Liquids',
            'milk': '🥛 Milks',
            'sweetener': '🍬 Sweeteners',
            'topping': '✨ Toppings',
            'flavor': '🌸 Flavors',
            'other': '📦 Other'
        };
        
        if (categoryNames[category]) {
            return categoryNames[category];
        }
        
        // Convert snake_case or camelCase to Title Case with emoji
        const formatted = category
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return '📋 ' + formatted;
    }

    sortCategories(categories) {
        // Define the order for known categories
        const categoryOrder = {
            'base_drinks': 1,
            'espresso': 2,
            'liquid': 3,
            'liquid_creamers': 4,
            'milk': 5,
            'sugars': 6,
            'sweetener': 7,
            'syrup': 8,
            'flavor': 9,
            'toppings': 10,
            'topping': 11,
            'add_ins': 12,
            'other': 99
        };

        // Convert categories object to array and sort
        return Object.entries(categories)
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => {
                const orderA = categoryOrder[a.key] || 50;
                const orderB = categoryOrder[b.key] || 50;
                if (orderA !== orderB) return orderA - orderB;
                // If same order, sort alphabetically by name
                return a.name.localeCompare(b.name);
            });
    }

    getUnitAbbreviation(unitType) {
        const abbrevs = {
            'shots': 'shot',
            'pumps': 'pump',
            'oz': 'oz',
            'tsp': 'tsp',
            'packets': 'packet',
            'count': '',
            'parts': 'Part'
        };
        return abbrevs[unitType] || unitType;
    }
    
    getUnitDisplay(unitType, amount) {
        const abbrev = this.getUnitAbbreviation(unitType);
        if (!abbrev) return '';
        // Handle pluralization for "Part"
        if (abbrev === 'Part' && amount !== 1) {
            return 'Parts';
        }
        // Handle pluralization for other units
        if (amount !== 1 && abbrev !== 'oz' && abbrev !== 'tsp') {
            // Add 's' for most units (shot -> shots, pump -> pumps, etc.)
            if (abbrev.endsWith('s')) {
                return abbrev;
            }
            return abbrev + 's';
        }
        return abbrev;
    }

    confirmCustomization() {
        if (this.onConfirmCallback) {
            const customizations = [];
            const recipeIngredients = []; // All ingredients in the final recipe (for order label)
            let priceAdjustment = 0;

            // First, collect all recipe ingredients (from drink_ingredients) with their final amounts
            Object.keys(this.drinkIngredients).forEach(ingredientId => {
                const drinkIng = this.drinkIngredients[ingredientId];
                const amount = this.customizations[ingredientId] || 0;
                
                // Find the ingredient details
                let ingredient = this.ingredients.find(i => i.id === ingredientId);
                if (!ingredient && drinkIng.ingredient) {
                    ingredient = drinkIng.ingredient;
                }
                
                if (ingredient && amount > 0) {
                    const defaultAmount = drinkIng.defaultAmount || 0;
                    const difference = amount - defaultAmount;
                    // Use recipe's unit type if available, otherwise fall back to ingredient's default
                    const effectiveUnitType = drinkIng.unitType || ingredient.unit_type;
                    // Only charge if useDefaultPrice is true
                    // Check explicitly for false - if null/undefined, default to true for backward compatibility
                    const useDefaultPrice = drinkIng.useDefaultPrice === false ? false : true;
                    
                    // Add to recipe ingredients list (for order label)
                    recipeIngredients.push({
                        ingredientId: ingredient.id,
                        ingredientName: ingredient.name,
                        amount: amount,
                        unitType: effectiveUnitType,
                        unitCost: useDefaultPrice ? parseFloat(ingredient.unit_cost || 0) : 0,
                        isFromRecipe: true,
                        defaultAmount: defaultAmount,
                        useDefaultPrice: useDefaultPrice
                    });
                    
                    // Calculate price adjustment if different from default (only if useDefaultPrice is true)
                    if (useDefaultPrice && difference !== 0) {
                        priceAdjustment += difference * parseFloat(ingredient.unit_cost || 0);
                    }
                }
            });

            // Then, collect all additional ingredients (not in original recipe)
            this.ingredients.forEach(ingredient => {
                const amount = this.customizations[ingredient.id] || 0;
                const drinkIng = this.drinkIngredients[ingredient.id];
                
                // Only process if not already in recipe ingredients and amount > 0
                if (!drinkIng && amount > 0) {
                    // New ingredient added (always uses default price for add-ins)
                    recipeIngredients.push({
                        ingredientId: ingredient.id,
                        ingredientName: ingredient.name,
                        amount: amount,
                        unitType: ingredient.unit_type,
                        unitCost: parseFloat(ingredient.unit_cost || 0),
                        isFromRecipe: false,
                        defaultAmount: 0,
                        useDefaultPrice: true // Add-ins always use default price
                    });
                    
                    priceAdjustment += amount * parseFloat(ingredient.unit_cost || 0);
                }
            });

            // Build customizations array for price tracking (only changes from default)
            recipeIngredients.forEach(recipeIng => {
                const difference = recipeIng.amount - (recipeIng.defaultAmount || 0);
                if (difference !== 0) {
                    customizations.push({
                        ingredientId: recipeIng.ingredientId,
                        ingredientName: recipeIng.ingredientName,
                        amount: recipeIng.amount,
                        defaultAmount: recipeIng.defaultAmount || 0,
                        difference: difference,
                        unitType: recipeIng.unitType,
                        cost: difference * recipeIng.unitCost
                    });
                }
            });

            const finalPrice = this.basePrice + priceAdjustment;

            this.onConfirmCallback({
                product: this.currentProduct,
                customizations: customizations, // Price adjustments
                recipeIngredients: recipeIngredients, // Full recipe for order label
                priceAdjustment: priceAdjustment,
                finalPrice: finalPrice,
                selectedSize: this.selectedSize ? this.selectedSize.size_name : null // Selected size name
            });

            this.modal.remove();
            document.body.style.overflow = '';
        }
    }
}

// Global instance
const drinkCustomizer = new DrinkCustomizer();

