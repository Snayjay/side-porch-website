// Drink Customization Component
// Handles the customization dialog for drinks

class DrinkCustomizer {
    constructor() {
        this.ingredients = [];
        this.drinkIngredients = {}; // Map of product_id to default ingredients
        this.loadIngredients();
    }

    async loadIngredients() {
        const client = getSupabaseClient();
        if (!client) {
            // Use mock ingredients if Supabase not configured
            this.ingredients = this.getMockIngredients();
            return;
        }

        try {
            const { data, error } = await client
                .from('ingredients')
                .select('*')
                .eq('available', true)
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
                    isRequired: di.is_required,
                    isRemovable: di.is_removable,
                    isAddable: di.is_addable,
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
            <div id="customization-content" style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                <p style="text-align: center; color: var(--text-dark); opacity: 0.7;">Loading ingredients...</p>
            </div>
            <div style="padding: 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 1.2rem; font-weight: 600; color: var(--deep-brown);">
                        Total: $<span id="customization-total">${this.basePrice.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-top: 0.25rem;">
                        Base: $${this.basePrice.toFixed(2)}
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

        // Load drink ingredients and render
        this.loadDrinkIngredients(product.id).then(drinkIngredients => {
            console.log('Setting drinkIngredients:', drinkIngredients);
            this.drinkIngredients = drinkIngredients;
            this.renderCustomizationContent();
        });

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

        // Initialize customizations with default amounts from recipe
        // First, initialize all recipe ingredients with their default amounts
        Object.keys(this.drinkIngredients).forEach(ingredientId => {
            const drinkIng = this.drinkIngredients[ingredientId];
            if (drinkIng && drinkIng.defaultAmount > 0) {
                this.customizations[ingredientId] = drinkIng.defaultAmount;
            }
        });
        
        // Then initialize other ingredients to 0
        this.ingredients.forEach(ingredient => {
            if (!(ingredient.id in this.customizations)) {
                this.customizations[ingredient.id] = 0;
            }
        });

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
        // Get ingredients that are in the original recipe (drink_ingredients)
        // Iterate over drinkIngredients to ensure we show all recipe ingredients
        console.log('renderRecipeSection - drinkIngredients:', this.drinkIngredients);
        console.log('renderRecipeSection - available ingredients:', this.ingredients.length);
        
        const recipeIngredients = [];
        
        Object.keys(this.drinkIngredients).forEach(ingredientId => {
            const drinkIng = this.drinkIngredients[ingredientId];
            console.log(`Processing ingredient ${ingredientId}:`, drinkIng);
            if (drinkIng && drinkIng.defaultAmount > 0) {
                // Use the joined ingredient data if available, otherwise find it in this.ingredients
                const ingredient = drinkIng.ingredient || this.ingredients.find(i => i.id === ingredientId);
                console.log(`Found ingredient for ${ingredientId}:`, ingredient);
                if (ingredient) {
                    recipeIngredients.push({
                        ...ingredient,
                        drinkIng: drinkIng
                    });
                } else {
                    console.warn(`Ingredient ${ingredientId} not found in available ingredients or joined data`);
                }
            }
        });

        console.log('Recipe ingredients to render:', recipeIngredients.length, recipeIngredients);

        if (recipeIngredients.length === 0) {
            return '<div style="margin-bottom: 2rem;"><h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.1rem;">Recipe Ingredients</h3><p style="color: var(--text-dark); opacity: 0.7; font-style: italic;">No recipe ingredients configured for this drink.</p></div>';
        }

        // Group recipe ingredients by category
        const categories = {
            base_drinks: { name: '☕ Base Drinks', ingredients: [] },
            sugars: { name: '🍬 Sugars', ingredients: [] },
            liquid_creamers: { name: '🥛 Liquid Creamers', ingredients: [] },
            toppings: { name: '✨ Toppings', ingredients: [] },
            add_ins: { name: '➕ Add-ins', ingredients: [] }
        };

        recipeIngredients.forEach(ingredient => {
            const category = categories[ingredient.category] || categories.add_ins;
            category.ingredients.push(ingredient);
        });
        
        // Sort ingredients within each category alphabetically
        Object.values(categories).forEach(category => {
            category.ingredients.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        });

        let html = '<div style="margin-bottom: 2rem;">';
        html += '<h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">Recipe Ingredients</h3>';
        html += '<p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem;">Adjust the original recipe ingredients:</p>';

        Object.values(categories).forEach(category => {
            if (category.ingredients.length === 0) return;

            html += `<div style="margin-bottom: 1.5rem;">`;
            html += `<h4 style="color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">${category.name}</h4>`;

            category.ingredients.forEach(ingredient => {
                const drinkIng = ingredient.drinkIng || this.drinkIngredients[ingredient.id];
                const currentAmount = this.customizations[ingredient.id] || 0;
                const unitLabel = this.getUnitLabel(ingredient.unit_type);
                const cost = parseFloat(ingredient.unit_cost || 0) * currentAmount;
                
                // Allow decreasing any ingredient if it has a quantity > 0
                const canDecrease = currentAmount > 0;

                html += `
                    <div class="customization-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--parchment); border-radius: 8px; margin-bottom: 0.5rem; border: 2px solid rgba(139, 111, 71, 0.3);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">
                                ${ingredient.name}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">
                                ${unitLabel} • $${ingredient.unit_cost.toFixed(2)}/${this.getUnitAbbreviation(ingredient.unit_type)}
                                ${cost > 0 ? ` • $${cost.toFixed(2)}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${canDecrease ? `
                                <button class="qty-btn" onclick="drinkCustomizer.adjustIngredient('${ingredient.id}', -1)" style="background: var(--cream); border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: var(--deep-brown); transition: all 0.3s ease;">-</button>
                            ` : '<div style="width: 30px;"></div>'}
                            <div style="min-width: 80px; text-align: center; font-weight: 600; color: var(--deep-brown);">
                                <span style="font-size: 1.1rem;">${currentAmount}</span>
                                <span style="font-size: 0.85rem; opacity: 0.7; margin-left: 0.25rem;">${this.getUnitDisplay(ingredient.unit_type, currentAmount)}</span>
                            </div>
                            <button class="qty-btn" onclick="drinkCustomizer.adjustIngredient('${ingredient.id}', 1)" style="background: var(--accent-orange); border: 2px solid var(--accent-orange); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: white; transition: all 0.3s ease;">+</button>
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
        // Get ingredients that are NOT in the original recipe
        const additionalIngredients = this.ingredients.filter(ingredient => 
            !this.drinkIngredients[ingredient.id] || this.drinkIngredients[ingredient.id].defaultAmount === 0
        );

        if (additionalIngredients.length === 0) {
            return '';
        }

        // Group additional ingredients by category
        const categories = {
            base_drinks: { name: '☕ Base Drinks', ingredients: [] },
            sugars: { name: '🍬 Sugars', ingredients: [] },
            liquid_creamers: { name: '🥛 Liquid Creamers', ingredients: [] },
            toppings: { name: '✨ Toppings', ingredients: [] },
            add_ins: { name: '➕ Add-ins', ingredients: [] }
        };

        additionalIngredients.forEach(ingredient => {
            const category = categories[ingredient.category] || categories.add_ins;
            category.ingredients.push(ingredient);
        });
        
        // Sort ingredients within each category alphabetically
        Object.values(categories).forEach(category => {
            category.ingredients.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        });

        let html = '<div style="margin-bottom: 2rem;">';
        html += '<h3 style="color: var(--deep-brown); margin-bottom: 1rem; font-size: 1.2rem; font-weight: 600;">Add More Ingredients</h3>';
        html += '<p style="color: var(--text-dark); opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem;">Add additional ingredients to customize your drink:</p>';

        Object.values(categories).forEach(category => {
            if (category.ingredients.length === 0) return;

            html += `<div style="margin-bottom: 1.5rem;">`;
            html += `<h4 style="color: var(--deep-brown); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">${category.name}</h4>`;

            category.ingredients.forEach(ingredient => {
                const currentAmount = this.customizations[ingredient.id] || 0;
                const unitLabel = this.getUnitLabel(ingredient.unit_type);
                const cost = parseFloat(ingredient.unit_cost) * currentAmount;

                html += `
                    <div class="customization-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--cream); border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--deep-brown); margin-bottom: 0.25rem;">
                                ${ingredient.name}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7;">
                                ${unitLabel} • $${ingredient.unit_cost.toFixed(2)}/${this.getUnitAbbreviation(ingredient.unit_type)}
                                ${cost > 0 ? ` • $${cost.toFixed(2)}` : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            ${currentAmount > 0 ? `
                                <button class="qty-btn" onclick="drinkCustomizer.adjustIngredient('${ingredient.id}', -1)" style="background: var(--cream); border: 2px solid rgba(139, 111, 71, 0.3); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: var(--deep-brown); transition: all 0.3s ease;">-</button>
                            ` : '<div style="width: 30px;"></div>'}
                            <span style="min-width: 40px; text-align: center; font-weight: 600; color: var(--deep-brown);">${currentAmount > 0 ? currentAmount : '0'}</span>
                            <button class="qty-btn" onclick="drinkCustomizer.adjustIngredient('${ingredient.id}', 1)" style="background: var(--accent-orange); border: 2px solid var(--accent-orange); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.2rem; color: white; transition: all 0.3s ease;">+</button>
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
        if (!ingredient) return;

        const drinkIng = this.drinkIngredients[ingredientId];
        const currentAmount = this.customizations[ingredientId] || 0;
        const newAmount = Math.max(0, currentAmount + delta);

        // Handle recipe ingredients (those in drink_ingredients)
        // Allow full control - users can increase or decrease any ingredient to any amount
        // No restrictions - users can customize the recipe completely
        // The only restriction is that we can't go below 0 (handled by Math.max above)

        this.customizations[ingredientId] = newAmount;
        this.renderCustomizationContent();
    }

    updateTotal() {
        let total = this.basePrice;

        this.ingredients.forEach(ingredient => {
            const amount = this.customizations[ingredient.id] || 0;
            const drinkIng = this.drinkIngredients[ingredient.id];
            
            if (drinkIng) {
                // Calculate cost difference from default
                const defaultAmount = drinkIng.defaultAmount || 0;
                const difference = amount - defaultAmount;
                total += difference * parseFloat(ingredient.unit_cost);
            } else {
                // New ingredient addition
                total += amount * parseFloat(ingredient.unit_cost);
            }
        });

        const totalElement = this.modal.querySelector('#customization-total');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
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
                    
                    // Add to recipe ingredients list (for order label)
                    recipeIngredients.push({
                        ingredientId: ingredient.id,
                        ingredientName: ingredient.name,
                        amount: amount,
                        unitType: ingredient.unit_type,
                        unitCost: parseFloat(ingredient.unit_cost || 0),
                        isFromRecipe: true,
                        defaultAmount: defaultAmount
                    });
                    
                    // Calculate price adjustment if different from default
                    if (difference !== 0) {
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
                    // New ingredient added
                    recipeIngredients.push({
                        ingredientId: ingredient.id,
                        ingredientName: ingredient.name,
                        amount: amount,
                        unitType: ingredient.unit_type,
                        unitCost: parseFloat(ingredient.unit_cost || 0),
                        isFromRecipe: false,
                        defaultAmount: 0
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
                finalPrice: finalPrice
            });

            this.modal.remove();
            document.body.style.overflow = '';
        }
    }
}

// Global instance
const drinkCustomizer = new DrinkCustomizer();

