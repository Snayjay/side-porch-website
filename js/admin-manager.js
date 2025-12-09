// Admin Management Module
// Handles role checking, user management, product management, and ingredient management

class AdminManager {
    constructor() {
        this.userRole = null;
    }

    // Role checking utilities
    async isStaff() {
        const role = await this.getUserRole();
        return role === 'staff';
    }

    async isCustomer() {
        const role = await this.getUserRole();
        return role === 'customer';
    }

    async getUserRole() {
        if (this.userRole) {
            return this.userRole;
        }

        const client = getSupabaseClient();
        if (!client) {
            console.warn('Supabase client not available');
            return null;
        }

        const user = await authManager.getCurrentUser();
        if (!user) {
            console.warn('No authenticated user found');
            return null;
        }

        try {
            const { data, error } = await client
                .from('coffee_club_accounts')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) {
                // If account doesn't exist, user might not have signed up yet
                if (error.code === 'PGRST116') {
                    console.log('User account not found in coffee_club_accounts, defaulting to customer');
                    this.userRole = 'customer';
                    return this.userRole;
                }
                throw error;
            }
            
            this.userRole = data?.role || 'customer';
            return this.userRole;
        } catch (error) {
            console.error('Get user role error:', error);
            // Don't return null - return 'customer' as default to prevent false redirects
            this.userRole = 'customer';
            return this.userRole;
        }
    }

    // User role management
    async getAllUsers() {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { data, error } = await client
                .from('coffee_club_accounts')
                .select('id, email, full_name, role, balance, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, users: data || [] };
        } catch (error) {
            console.error('Get all users error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserTransactions(userId, limit = 50) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            const { data, error } = await client
                .from('account_transactions')
                .select('*')
                .eq('account_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, transactions: data || [] };
        } catch (error) {
            console.error('Get user transactions error:', error);
            return { success: false, error: error.message };
        }
    }

    async adjustUserBalance(userId, amount, description, transactionType = 'deposit') {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        // Validate transaction type
        if (!['deposit', 'purchase', 'refund'].includes(transactionType)) {
            return { success: false, error: 'Invalid transaction type' };
        }

        try {
            // Create transaction record
            const { data: transaction, error: transError } = await client
                .from('account_transactions')
                .insert({
                    account_id: userId,
                    type: transactionType,
                    amount: Math.abs(amount),
                    description: description || (transactionType === 'deposit' ? 'Staff adjustment: Added funds' : 'Staff adjustment: Removed funds')
                })
                .select()
                .single();

            if (transError) throw transError;

            // The trigger should automatically update the balance, but let's verify
            const { data: account, error: accountError } = await client
                .from('coffee_club_accounts')
                .select('balance')
                .eq('id', userId)
                .single();

            if (accountError) throw accountError;

            return { success: true, transaction, newBalance: parseFloat(account.balance) };
        } catch (error) {
            console.error('Adjust user balance error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUserRole(userId, role) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        // Normalize role to lowercase to match database constraint
        const normalizedRole = role?.toLowerCase().trim();
        
        if (!['customer', 'staff'].includes(normalizedRole)) {
            throw new Error('Invalid role. Must be "customer" or "staff"');
        }

        try {
            const { data, error } = await client
                .from('coffee_club_accounts')
                .update({ role: normalizedRole })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, user: data };
        } catch (error) {
            console.error('Update user role error:', error);
            return { success: false, error: error.message };
        }
    }

    // Category management
    async createCategory(categoryData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { data, error } = await client
                .from('menu_categories')
                .insert({
                    name: categoryData.name,
                    type: categoryData.type,
                    display_order: parseInt(categoryData.display_order || 0),
                    available: categoryData.available !== undefined ? categoryData.available : true
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, category: data };
        } catch (error) {
            console.error('Create category error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateCategory(categoryId, categoryData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };

            if (categoryData.name !== undefined) updateData.name = categoryData.name;
            if (categoryData.type !== undefined) updateData.type = categoryData.type;
            if (categoryData.display_order !== undefined) updateData.display_order = parseInt(categoryData.display_order);
            if (categoryData.available !== undefined) updateData.available = categoryData.available;

            const { data, error } = await client
                .from('menu_categories')
                .update(updateData)
                .eq('id', categoryId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, category: data };
        } catch (error) {
            console.error('Update category error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteCategory(categoryId) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { error } = await client
                .from('menu_categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete category error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllCategories(type = null, includeUnavailable = false) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            let query = client
                .from('menu_categories')
                .select('*')
                .order('type', { ascending: true })
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (type) {
                query = query.eq('type', type);
            }

            if (!includeUnavailable) {
                query = query.eq('available', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, categories: data || [] };
        } catch (error) {
            console.error('Get all categories error:', error);
            return { success: false, error: error.message };
        }
    }

    async getProductsByCategory(categoryId, includeArchived = false) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            let query = client
                .from('products')
                .select('*')
                .eq('category_id', categoryId)
                .order('name', { ascending: true });

            if (!includeArchived) {
                query = query.eq('available', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, products: data || [] };
        } catch (error) {
            console.error('Get products by category error:', error);
            return { success: false, error: error.message };
        }
    }

    // Product management
    async createProduct(productData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const insertData = {
                name: productData.name,
                description: productData.description || null,
                category_id: productData.category_id || null,
                price: parseFloat(productData.price),
                tax_rate: parseFloat(productData.tax_rate || 0.0825),
                image_url: productData.image_url || null,
                menu_section: productData.menu_section || null,
                available: productData.available !== undefined ? productData.available : true
            };

            // Keep category field for backward compatibility if provided
            if (productData.category) {
                insertData.category = productData.category;
            }

            const { data, error } = await client
                .from('products')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;
            return { success: true, product: data };
        } catch (error) {
            console.error('Create product error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProduct(productId, productData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };

            if (productData.name !== undefined) updateData.name = productData.name;
            if (productData.description !== undefined) updateData.description = productData.description;
            if (productData.category_id !== undefined) updateData.category_id = productData.category_id;
            if (productData.category !== undefined) updateData.category = productData.category; // Backward compatibility
            if (productData.price !== undefined) updateData.price = parseFloat(productData.price);
            if (productData.tax_rate !== undefined) updateData.tax_rate = parseFloat(productData.tax_rate);
            if (productData.image_url !== undefined) updateData.image_url = productData.image_url;
            if (productData.menu_section !== undefined) updateData.menu_section = productData.menu_section;
            if (productData.available !== undefined) updateData.available = productData.available;

            const { data, error } = await client
                .from('products')
                .update(updateData)
                .eq('id', productId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, product: data };
        } catch (error) {
            console.error('Update product error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProduct(productId) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { error } = await client
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete product error:', error);
            return { success: false, error: error.message };
        }
    }

    async archiveProduct(productId) {
        return this.updateProduct(productId, { available: false });
    }

    async unarchiveProduct(productId) {
        return this.updateProduct(productId, { available: true });
    }

    async getAllProducts(includeArchived = false) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            let query = client
                .from('products')
                .select(`
                    *,
                    menu_category:menu_categories(*)
                `)
                .order('category_id', { ascending: true })
                .order('name', { ascending: true });

            if (!includeArchived) {
                query = query.eq('available', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, products: data || [] };
        } catch (error) {
            console.error('Get all products error:', error);
            return { success: false, error: error.message };
        }
    }

    // Ingredient management
    async createIngredient(ingredientData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { data, error } = await client
                .from('ingredients')
                .insert({
                    name: ingredientData.name,
                    category: ingredientData.category,
                    unit_type: ingredientData.unit_type,
                    unit_cost: parseFloat(ingredientData.unit_cost || 0),
                    available: ingredientData.available !== undefined ? ingredientData.available : true
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, ingredient: data };
        } catch (error) {
            console.error('Create ingredient error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateIngredient(ingredientId, ingredientData) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };

            if (ingredientData.name !== undefined) updateData.name = ingredientData.name;
            if (ingredientData.category !== undefined) updateData.category = ingredientData.category;
            if (ingredientData.unit_type !== undefined) updateData.unit_type = ingredientData.unit_type;
            if (ingredientData.unit_cost !== undefined) updateData.unit_cost = parseFloat(ingredientData.unit_cost);
            if (ingredientData.available !== undefined) updateData.available = ingredientData.available;

            const { data, error } = await client
                .from('ingredients')
                .update(updateData)
                .eq('id', ingredientId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, ingredient: data };
        } catch (error) {
            console.error('Update ingredient error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteIngredient(ingredientId) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            const { error } = await client
                .from('ingredients')
                .delete()
                .eq('id', ingredientId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete ingredient error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllIngredients(includeUnavailable = false) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            let query = client
                .from('ingredients')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (!includeUnavailable) {
                query = query.eq('available', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, ingredients: data || [] };
        } catch (error) {
            console.error('Get all ingredients error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUnitTypeOrder(orderedUnitTypes) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            // Update each unit type's display_order
            const updates = orderedUnitTypes.map(({ id, display_order }) =>
                client
                    .from('unit_types')
                    .update({ display_order })
                    .eq('id', id)
            );

            await Promise.all(updates);
            return { success: true };
        } catch (error) {
            console.error('Update unit type order error:', error);
            return { success: false, error: error.message };
        }
    }

    // Drink-ingredient relationship management
    async getDrinkIngredients(productId) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
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
            return { success: true, drinkIngredients: data || [] };
        } catch (error) {
            console.error('Get drink ingredients error:', error);
            return { success: false, error: error.message };
        }
    }

    async setDrinkIngredients(productId, ingredients) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase not configured');
        }

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            // Delete existing drink ingredients
            const { error: deleteError } = await client
                .from('drink_ingredients')
                .delete()
                .eq('product_id', productId);

            if (deleteError) throw deleteError;

            // Insert new drink ingredients
            if (ingredients && ingredients.length > 0) {
                const drinkIngredients = ingredients.map(ing => ({
                    product_id: productId,
                    ingredient_id: ing.ingredient_id,
                    default_amount: parseFloat(ing.default_amount || 0),
                    is_required: ing.is_required || false,
                    is_removable: ing.is_removable !== undefined ? ing.is_removable : true,
                    is_addable: ing.is_addable !== undefined ? ing.is_addable : true
                }));

                const { data, error: insertError } = await client
                    .from('drink_ingredients')
                    .insert(drinkIngredients)
                    .select();

                if (insertError) throw insertError;
                return { success: true, drinkIngredients: data };
            }

            return { success: true, drinkIngredients: [] };
        } catch (error) {
            console.error('Set drink ingredients error:', error);
            return { success: false, error: error.message };
        }
    }

    // Clear cached role
    clearRoleCache() {
        this.userRole = null;
    }

    // Unit Type Management
    async getAllUnitTypes() {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            const { data, error } = await client
                .from('unit_types')
                .select('*')
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            return { success: true, unitTypes: data || [] };
        } catch (error) {
            console.error('Get all unit types error:', error);
            return { success: false, error: error.message };
        }
    }

    async createUnitType(unitTypeData) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            // Get the max display_order to add new item at the end
            const { data: maxOrderData } = await client
                .from('unit_types')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1)
                .single();

            const maxOrder = maxOrderData?.display_order || 0;

            const { data, error } = await client
                .from('unit_types')
                .insert({
                    name: unitTypeData.name.toLowerCase().trim(),
                    display_name: unitTypeData.display_name || unitTypeData.name,
                    abbreviation: unitTypeData.abbreviation || unitTypeData.name.toLowerCase().trim(),
                    display_order: maxOrder + 1
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, unitType: data };
        } catch (error) {
            console.error('Create unit type error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUnitType(unitTypeId, unitTypeData) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            const updateData = {};
            if (unitTypeData.name !== undefined) updateData.name = unitTypeData.name.toLowerCase().trim();
            if (unitTypeData.display_name !== undefined) updateData.display_name = unitTypeData.display_name;
            if (unitTypeData.abbreviation !== undefined) updateData.abbreviation = unitTypeData.abbreviation;
            // Note: display_order is now managed via updateUnitTypeOrder method

            const { data, error } = await client
                .from('unit_types')
                .update(updateData)
                .eq('id', unitTypeId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, unitType: data };
        } catch (error) {
            console.error('Update unit type error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteUnitType(unitTypeId) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            // First, get the unit type name to check if it's in use
            const { data: unitType, error: fetchError } = await client
                .from('unit_types')
                .select('name')
                .eq('id', unitTypeId)
                .single();

            if (fetchError) throw fetchError;
            if (!unitType) {
                return { success: false, error: 'Unit type not found' };
            }

            // Check if any ingredients are using this unit type
            const { data: ingredients, error: checkError } = await client
                .from('ingredients')
                .select('id, name')
                .eq('unit_type', unitType.name)
                .limit(1);

            if (checkError && checkError.code !== 'PGRST116') {
                // PGRST116 means table doesn't exist, which is fine
                throw checkError;
            }

            if (ingredients && ingredients.length > 0) {
                return { 
                    success: false, 
                    error: `Cannot delete unit type. It is currently used by ${ingredients.length} ingredient(s). Please change the unit type for all associated ingredients first.`,
                    inUse: true,
                    ingredients: ingredients.map(i => i.name)
                };
            }

            // Safe to delete
            const { error } = await client
                .from('unit_types')
                .delete()
                .eq('id', unitTypeId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete unit type error:', error);
            // Check if error is due to foreign key constraint
            if (error.message && error.message.includes('foreign key')) {
                return { 
                    success: false, 
                    error: 'Cannot delete unit type. It is currently in use by one or more ingredients. Please change the unit type for all associated ingredients first.',
                    inUse: true
                };
            }
            return { success: false, error: error.message };
        }
    }

    // Social Platform Management (for staff)
    async getSocialPlatforms() {
        const client = getSupabaseClient();
        if (!client) {
            return [];
        }

        try {
            const { data, error } = await client
                .from('site_config')
                .select('config_value')
                .eq('config_key', 'social_platforms')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return [];
                }
                console.warn('Error getting social platforms:', error.message);
                return [];
            }

            if (!data?.config_value) {
                return [];
            }

            try {
                const platforms = JSON.parse(data.config_value);
                return Array.isArray(platforms) ? platforms : [];
            } catch (e) {
                console.warn('Error parsing social platforms:', e.message);
                return [];
            }
        } catch (e) {
            console.warn('Error getting social platforms:', e.message);
            return [];
        }
    }

    async setSocialPlatforms(platforms) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        // Verify user is authenticated
        const user = await authManager.getCurrentUser();
        if (!user) {
            return { success: false, error: 'Not authenticated. Please sign in.' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            // Validate platforms array
            if (!Array.isArray(platforms)) {
                return { success: false, error: 'Platforms must be an array' };
            }

            // Clean up platforms - remove empty ones
            const cleanedPlatforms = platforms.filter(p => p.platform && p.platform.trim() !== '');

            const { error } = await client
                .from('site_config')
                .upsert({
                    config_key: 'social_platforms',
                    config_value: JSON.stringify(cleanedPlatforms),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_key'
                });

            if (error) {
                console.error('Supabase error details:', error);
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Error setting social platforms:', error);
            return { success: false, error: error.message };
        }
    }

    async updateFooterSocialLinks() {
        const platforms = await this.getSocialPlatforms();
        const enabledPlatforms = platforms.filter(p => p.enabled && p.url && p.url.trim() !== '');

        const socialLinksContainers = document.querySelectorAll('.social-links');
        socialLinksContainers.forEach(container => {
            container.innerHTML = '';
            enabledPlatforms.forEach(platform => {
                const link = document.createElement('a');
                link.href = platform.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.setAttribute('aria-label', platform.platform);
                link.style.color = 'inherit';
                
                const iconSvg = this.getSocialIcon(platform.platform);
                link.innerHTML = iconSvg;
                container.appendChild(link);
            });
        });
    }

    getSocialIcon(platformName) {
        const name = platformName.toLowerCase();
        if (name.includes('instagram')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>`;
        } else if (name.includes('facebook')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>`;
        } else if (name.includes('twitter') || name.includes('x.com')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>`;
        } else if (name.includes('tiktok')) {
            // TikTok logo - musical note shape (matching Instagram style)
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.6 5.82C15.6 5.82 14.7 5.52 14 5V2H11V15.5C11 17.43 9.43 19 7.5 19C5.57 19 4 17.43 4 15.5C4 13.57 5.57 12 7.5 12C7.9 12 8.3 12.07 8.66 12.21V8.65C8.3 8.6 7.9 8.57 7.5 8.57C3.68 8.57 0.57 11.67 0.57 15.5C0.57 19.33 3.68 22.43 7.5 22.43C11.32 22.43 14.43 19.33 14.43 15.5V10.1C16.1 11.33 18.15 12.06 20.37 12.16V8.61C18.8 8.44 17.47 7.34 16.6 5.82Z" fill="currentColor"/>
            </svg>`;
        }
        // Generic social icon
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
    }
}

// Global admin manager instance
const adminManager = new AdminManager();

