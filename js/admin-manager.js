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

    async getUserRole(forceRefresh = false) {
        // If we have a cached role and not forcing refresh, return it
        // But always refresh if user might have changed (e.g., after login)
        if (this.userRole && !forceRefresh) {
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
            this.userRole = null; // Clear cache if no user
            return null;
        }

        // Get shop_id from config - this website is for a specific shop
        const shopId = configManager.getShopId();

        try {
            let query = client
                .from('coffee_club_accounts')
                .select('role, shop_id')
                .eq('id', user.id);
            
            // Filter by shop_id from config (hardcoded for this website)
            if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error } = await query.single();

            if (error) {
                // If account doesn't exist, user might not have signed up yet
                if (error.code === 'PGRST116') {
                    console.log('User account not found for shop', shopId, '- defaulting to customer');
                    this.userRole = 'customer';
                    return this.userRole;
                }
                throw error;
            }
            
            console.log('getUserRole: Found account for shop', shopId, '- role:', data?.role);
            this.userRole = data?.role || 'customer';
            return this.userRole;
        } catch (error) {
            console.error('Get user role error:', error);
            // Don't return null - return 'customer' as default to prevent false redirects
            this.userRole = 'customer';
            return this.userRole;
        }
    }

    // Clear cached role (useful when role might have changed)
    clearRoleCache() {
        this.userRole = null;
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            const { data, error } = await client
                .from('coffee_club_accounts')
                .select('id, email, full_name, role, balance, created_at')
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            const { data, error } = await client
                .from('account_transactions')
                .select('*')
                .eq('account_id', userId)
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            // Create transaction record
            const { data: transaction, error: transError } = await client
                .from('account_transactions')
                .insert({
                    account_id: userId,
                    shop_id: shopId,
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            throw new Error('Shop ID not configured');
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
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            const { data, error } = await client
                .from('menu_categories')
                .insert({
                    name: categoryData.name,
                    type: categoryData.type,
                    shop_id: shopId,
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

            const shopId = configManager.getShopId();
            const { data, error } = await client
                .from('menu_categories')
                .update(updateData)
                .eq('id', categoryId)
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();

        try {
            const { error } = await client
                .from('menu_categories')
                .delete()
                .eq('id', categoryId)
                .eq('shop_id', shopId);

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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            let query = client
                .from('menu_categories')
                .select('*')
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            let query = client
                .from('products')
                .select('*')
                .eq('category_id', categoryId)
                .eq('shop_id', shopId)
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

        // Verify user is authenticated
        const user = await authManager.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        console.log('=== PRODUCT CREATE DEBUG ===');
        console.log('Auth User ID (auth.uid()):', user.id);
        console.log('Auth User Email:', user.email);
        
        // Check account by ID first (what RLS policy checks)
        const { data: accountById, error: idError } = await client
            .from('coffee_club_accounts')
            .select('id, role, email')
            .eq('id', user.id)
            .maybeSingle();
        
        console.log('Account found by ID:', accountById);
        console.log('Error finding by ID:', idError);
        
        // Also check by email to see if account exists with different ID
        const { data: accountByEmail, error: emailError } = await client
            .from('coffee_club_accounts')
            .select('id, role, email')
            .eq('email', user.email)
            .maybeSingle();
        
        console.log('Account found by email:', accountByEmail);
        console.log('Error finding by email:', emailError);
        
        // Determine the issue
        if (!accountById && accountByEmail) {
            // Account exists but ID doesn't match - this is the RLS problem
            const errorMsg = `RLS Policy Failure: Your account ID in coffee_club_accounts (${accountByEmail.id}) does not match your auth.uid() (${user.id}). The RLS policy requires these to match exactly.\n\nTo fix: Update the 'id' column in coffee_club_accounts table for your account (${user.email}) to match: ${user.id}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        if (!accountById && !accountByEmail) {
            throw new Error(`Account not found: No account found in coffee_club_accounts for user ${user.email}. Please ensure your account exists.`);
        }
        
        const account = accountById || accountByEmail;
        
        // Verify staff role
        if (account.role !== 'staff') {
            throw new Error(`Unauthorized: Your role is '${account.role}', but 'staff' role is required. Please contact an administrator to update your role.`);
        }
        
        console.log('✓ User authenticated');
        console.log('✓ Account ID matches auth.uid():', account.id === user.id);
        console.log('✓ Role verified: staff');
        
        // Verify Supabase session is active
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        console.log('Current session:', sessionData?.session ? 'Active' : 'None');
        console.log('Session user ID:', sessionData?.session?.user?.id);
        console.log('Session error:', sessionError);
        
        if (!sessionData?.session) {
            throw new Error('No active session. Please log out and log back in.');
        }
        
        if (sessionData.session.user.id !== user.id) {
            console.warn('Session user ID mismatch:', sessionData.session.user.id, 'vs', user.id);
        }
        
        // Test if RLS can see the user's role by querying coffee_club_accounts
        // This simulates what the RLS policy does
        const { data: rlsTest, error: rlsTestError } = await client
            .from('coffee_club_accounts')
            .select('id, role')
            .eq('id', user.id)
            .eq('role', 'staff')
            .maybeSingle();
        
        console.log('RLS Test Query Result:', rlsTest);
        console.log('RLS Test Error:', rlsTestError);
        
        if (!rlsTest) {
            console.error('RLS Policy Test Failed: Cannot find account with matching ID and staff role');
            throw new Error('RLS Policy Test Failed: The database cannot verify your staff role. This may be a session or RLS policy issue. Try logging out and back in.');
        }
        
        console.log('=== END DEBUG ===');

        try {
            // Get category type from category_id
            let categoryType = productData.category || null;
            if (!categoryType && productData.category_id) {
                const categoryResult = await this.getAllCategories(null, true);
                const category = categoryResult.categories?.find(c => c.id === productData.category_id);
                if (category) {
                    categoryType = category.type;
                }
            }
            
            // If still no category type, default based on context or throw error
            if (!categoryType) {
                throw new Error('Category type is required. Please select a valid category.');
            }

            const shopId = configManager.getShopId();
            if (!shopId) {
                return { success: false, error: 'Shop ID not configured' };
            }

            const insertData = {
                name: productData.name,
                description: productData.description || null,
                category: categoryType, // Required NOT NULL field
                category_id: productData.category_id || null,
                shop_id: shopId,
                price: parseFloat(productData.price),
                tax_rate: parseFloat(productData.tax_rate || 0.0825),
                image_url: productData.image_url || null,
                temp: productData.temp || null, // Temperature for drinks (hot, cold, both)
                available: productData.available !== undefined ? productData.available : true
            };

            console.log('Inserting product with data:', insertData);
            
            // Ensure session is active and refresh if needed
            const { data: { session }, error: sessionRefreshError } = await client.auth.getSession();
            console.log('Session before insert:', session ? 'Active' : 'None');
            console.log('Session user ID:', session?.user?.id);
            
            if (!session) {
                throw new Error('No active session. Please log out and log back in.');
            }
            
            // Refresh session to ensure it's current
            try {
                await client.auth.refreshSession();
                console.log('Session refreshed');
            } catch (refreshError) {
                console.warn('Session refresh warning:', refreshError);
                // Continue anyway - session might still be valid
            }

            const { data, error } = await client
                .from('products')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('Database insert error:', error);
                console.error('Error code:', error.code);
                console.error('Error details:', error.details);
                console.error('Error hint:', error.hint);
                
                // Provide more helpful error message for RLS violations
                if (error.message && error.message.includes('row-level security')) {
                    // Check if it's actually an ID mismatch issue
                    const { data: accountCheck } = await client
                        .from('coffee_club_accounts')
                        .select('id, role')
                        .eq('email', user.email)
                        .maybeSingle();
                    
                    if (accountCheck && accountCheck.id !== user.id) {
                        throw new Error(`RLS Policy Error: Account ID mismatch. Your account ID (${accountCheck.id}) does not match auth.uid() (${user.id}). Update the id column in coffee_club_accounts to match: ${user.id}`);
                    }
                    
                    throw new Error(`RLS Policy Error: The database cannot verify your staff permissions. This may be due to:\n1. Your account ID doesn't match auth.uid()\n2. The RLS policy needs to be refreshed\n3. Session authentication issue\n\nTry logging out and back in, or run the fix-rls-policy.sql script in your Supabase SQL editor.`);
                }
                throw error;
            }
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

        // Verify user is authenticated
        const user = await authManager.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        console.log('=== PRODUCT UPDATE DEBUG ===');
        console.log('Product ID:', productId);
        console.log('Auth User ID (auth.uid()):', user.id);
        console.log('Auth User Email:', user.email);

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            // Refresh session to ensure it's current
            try {
                await client.auth.refreshSession();
                console.log('Session refreshed for product update');
            } catch (refreshError) {
                console.warn('Session refresh warning:', refreshError);
            }

            // Verify session is active
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (!session) {
                throw new Error('No active session. Please log out and log back in.');
            }
            console.log('Session verified for product update');

            // First, verify the product exists and we can read it
            const { data: existingProduct, error: readError } = await client
                .from('products')
                .select('id, name, category')
                .eq('id', productId)
                .maybeSingle();
            
            console.log('Existing product:', existingProduct);
            console.log('Read error:', readError);
            
            if (readError) {
                console.error('Error reading product:', readError);
                throw new Error(`Cannot read product: ${readError.message}`);
            }
            
            if (!existingProduct) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            const updateData = {
                updated_at: new Date().toISOString()
            };

            if (productData.name !== undefined) updateData.name = productData.name;
            if (productData.description !== undefined) updateData.description = productData.description;
            if (productData.category_id !== undefined) {
                updateData.category_id = productData.category_id;
                // Also update category field if category_id changed
                if (productData.category_id) {
                    const categoryResult = await this.getAllCategories(null, true);
                    const category = categoryResult.categories?.find(c => c.id === productData.category_id);
                    if (category) {
                        updateData.category = category.type;
                    }
                }
            }
            if (productData.category !== undefined) updateData.category = productData.category; // Explicit category override
            if (productData.price !== undefined) updateData.price = parseFloat(productData.price);
            if (productData.tax_rate !== undefined) updateData.tax_rate = parseFloat(productData.tax_rate);
            if (productData.image_url !== undefined) updateData.image_url = productData.image_url;
            if (productData.temp !== undefined) updateData.temp = productData.temp || null; // Temperature for drinks
            if (productData.available !== undefined) updateData.available = productData.available;

            console.log('Update data:', updateData);
            console.log('Current session user:', session?.user?.id);

            const shopId = configManager.getShopId();
            const { data, error } = await client
                .from('products')
                .update(updateData)
                .eq('id', productId)
                .eq('shop_id', shopId)
                .select()
                .maybeSingle();

            console.log('Update result - data:', data);
            console.log('Update result - error:', error);
            console.log('=== END UPDATE DEBUG ===');

            if (error) {
                console.error('Database update error:', error);
                console.error('Error code:', error.code);
                console.error('Error details:', error.details);
                console.error('Error hint:', error.hint);
                
                // Provide more helpful error message for RLS violations
                if (error.message && error.message.includes('row-level security')) {
                    throw new Error(`RLS Policy Error: Cannot update product. The database cannot verify your staff permissions. This may be due to:\n1. Your account ID doesn't match auth.uid()\n2. The RLS policy needs to be refreshed\n3. Session authentication issue\n\nTry logging out and back in, or run the fix-rls-policy.sql script in your Supabase SQL editor.`);
                }
                throw error;
            }
            
            if (!data) {
                throw new Error('Product update completed but no data returned. This may indicate an RLS policy issue.');
            }
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

        const shopId = configManager.getShopId();

        try {
            const { error } = await client
                .from('products')
                .delete()
                .eq('id', productId)
                .eq('shop_id', shopId);

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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            let query = client
                .from('products')
                .select(`
                    *,
                    menu_category:menu_categories(*)
                `)
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            const { data, error } = await client
                .from('ingredients')
                .insert({
                    name: ingredientData.name,
                    category: ingredientData.category,
                    unit_type: ingredientData.unit_type,
                    unit_cost: parseFloat(ingredientData.unit_cost || 0),
                    shop_id: shopId,
                    available: ingredientData.available !== undefined ? ingredientData.available : true
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, ingredient: data };
        } catch (error) {
            console.error('Create ingredient error:', error);
            
            // Convert database errors to user-friendly messages
            let errorMessage = error.message;
            
            if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('ingredients_name_category_key')) {
                errorMessage = `An ingredient with the name "${ingredientData.name}" already exists in the "${ingredientData.category}" category. Please use a different name or category.`;
            }
            
            return { success: false, error: errorMessage };
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

            const shopId = configManager.getShopId();
            const { data, error } = await client
                .from('ingredients')
                .update(updateData)
                .eq('id', ingredientId)
                .eq('shop_id', shopId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, ingredient: data };
        } catch (error) {
            console.error('Update ingredient error:', error);
            
            // Convert database errors to user-friendly messages
            let errorMessage = error.message;
            
            if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('ingredients_name_category_key')) {
                errorMessage = `An ingredient with the name "${ingredientData.name}" already exists in the "${ingredientData.category}" category. Please use a different name or category.`;
            }
            
            return { success: false, error: errorMessage };
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

        const shopId = configManager.getShopId();

        try {
            const { error } = await client
                .from('ingredients')
                .delete()
                .eq('id', ingredientId)
                .eq('shop_id', shopId);

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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            let query = client
                .from('ingredients')
                .select('*')
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();
        if (!shopId) {
            return { success: false, error: 'Shop ID not configured' };
        }

        try {
            const { data, error } = await client
                .from('drink_ingredients')
                .select(`
                    id,
                    product_id,
                    ingredient_id,
                    default_amount,
                    unit_type,
                    is_required,
                    is_removable,
                    is_addable,
                    use_default_price,
                    ingredient:ingredients(*)
                `)
                .eq('product_id', productId)
                .eq('shop_id', shopId);

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

        // Verify user is authenticated
        const user = await authManager.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        console.log('=== DRINK INGREDIENTS INSERT DEBUG ===');
        console.log('Auth User ID (auth.uid()):', user.id);
        console.log('Auth User Email:', user.email);
        
        // Check account by ID first (what RLS policy checks)
        const { data: accountById, error: idError } = await client
            .from('coffee_club_accounts')
            .select('id, role, email')
            .eq('id', user.id)
            .maybeSingle();
        
        console.log('Account found by ID:', accountById);
        console.log('Error finding by ID:', idError);
        
        const account = accountById;
        
        if (!account) {
            throw new Error(`Account not found: No account found in coffee_club_accounts for user ${user.email}. Please ensure your account exists.`);
        }
        
        // Verify staff role
        if (account.role !== 'staff') {
            throw new Error(`Unauthorized: Your role is '${account.role}', but 'staff' role is required.`);
        }
        
        console.log('✓ User authenticated');
        console.log('✓ Account ID matches auth.uid():', account.id === user.id);
        console.log('✓ Role verified: staff');
        console.log('=== END DEBUG ===');

        if (!(await this.isStaff())) {
            throw new Error('Unauthorized: Staff access required');
        }

        try {
            // Refresh session to ensure it's current
            try {
                await client.auth.refreshSession();
                console.log('Session refreshed for drink ingredients insert');
            } catch (refreshError) {
                console.warn('Session refresh warning:', refreshError);
                // Continue anyway - session might still be valid
            }

            // Verify session is active
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (!session) {
                throw new Error('No active session. Please log out and log back in.');
            }
            console.log('Session verified for drink ingredients update');

            // Get existing ingredients to determine what to update vs insert vs delete
            const { data: existingIngredients, error: fetchError } = await client
                .from('drink_ingredients')
                .select('ingredient_id, default_amount, unit_type, is_required, is_removable, is_addable, use_default_price')
                .eq('product_id', productId);

            if (fetchError) {
                console.error('Error fetching existing ingredients:', fetchError);
                throw fetchError;
            }

            const existingIngredientMap = new Map();
            existingIngredients?.forEach(ei => {
                existingIngredientMap.set(ei.ingredient_id, ei);
            });

            // Remove duplicates from input - keep only the first occurrence of each ingredient_id
            const seenIngredientIds = new Set();
            const uniqueIngredients = ingredients?.filter(ing => {
                if (seenIngredientIds.has(ing.ingredient_id)) {
                    console.warn(`Duplicate ingredient_id ${ing.ingredient_id} removed`);
                    return false;
                }
                seenIngredientIds.add(ing.ingredient_id);
                return true;
            }) || [];

            const newIngredientIds = new Set(uniqueIngredients.map(ing => ing.ingredient_id));
            const existingIngredientIds = new Set(existingIngredientMap.keys());

            // Delete ingredients that are no longer in the recipe
            const ingredientsToDelete = Array.from(existingIngredientIds).filter(id => !newIngredientIds.has(id));
            if (ingredientsToDelete.length > 0) {
                const { error: deleteError } = await client
                    .from('drink_ingredients')
                    .delete()
                    .eq('product_id', productId)
                    .in('ingredient_id', ingredientsToDelete);

                if (deleteError) {
                    console.error('Delete drink ingredients error:', deleteError);
                    throw deleteError;
                }
            }

            // Process each ingredient: update if exists, insert if new
            const updates = [];
            const inserts = [];

            const shopId = configManager.getShopId();
            if (!shopId) {
                return { success: false, error: 'Shop ID not configured' };
            }

            for (const ing of uniqueIngredients) {
                // Validate UUIDs before proceeding
                if (!ing.ingredient_id || ing.ingredient_id === 'null' || ing.ingredient_id === 'undefined') {
                    console.error('Invalid ingredient_id:', ing.ingredient_id);
                    throw new Error(`Invalid ingredient_id: ${ing.ingredient_id}. Cannot save recipe ingredient.`);
                }
                
                if (!productId || productId === 'null' || productId === 'undefined') {
                    console.error('Invalid product_id:', productId);
                    throw new Error(`Invalid product_id: ${productId}. Cannot save recipe ingredients.`);
                }
                
                if (!shopId || shopId === 'null' || shopId === 'undefined') {
                    console.error('Invalid shop_id:', shopId);
                    throw new Error(`Invalid shop_id: ${shopId}. Cannot save recipe ingredients.`);
                }
                
                const ingredientData = {
                    product_id: productId,
                    shop_id: shopId,
                    ingredient_id: ing.ingredient_id,
                    default_amount: parseFloat(ing.default_amount || 0),
                    unit_type: (ing.unit_type && ing.unit_type !== 'null' && ing.unit_type !== 'undefined') ? ing.unit_type : null,  // Save the selected unit type for this recipe
                    is_required: ing.is_required || false,
                    is_removable: ing.is_removable !== undefined ? ing.is_removable : true,
                    is_addable: ing.is_addable !== undefined ? ing.is_addable : true,
                    use_default_price: ing.use_default_price !== undefined ? ing.use_default_price : true
                };

                if (existingIngredientMap.has(ing.ingredient_id)) {
                    // Update existing ingredient
                    updates.push(
                        client
                            .from('drink_ingredients')
                            .update({
                                default_amount: ingredientData.default_amount,
                                unit_type: ingredientData.unit_type,
                                is_required: ingredientData.is_required,
                                is_removable: ingredientData.is_removable,
                                is_addable: ingredientData.is_addable,
                                use_default_price: ingredientData.use_default_price
                            })
                            .eq('product_id', productId)
                            .eq('ingredient_id', ing.ingredient_id)
                    );
                } else {
                    // Insert new ingredient
                    inserts.push(ingredientData);
                }
            }

            // Execute updates
            if (updates.length > 0) {
                const updateResults = await Promise.all(updates);
                const updateErrors = updateResults.filter(r => r.error).map(r => r.error);
                if (updateErrors.length > 0) {
                    console.error('Error updating ingredients:', updateErrors);
                    throw updateErrors[0];
                }
            }

            // Execute inserts
            if (inserts.length > 0) {
                console.log('Inserting new drink ingredients:', inserts);
                const { data: insertedData, error: insertError } = await client
                    .from('drink_ingredients')
                    .insert(inserts)
                    .select();

                if (insertError) {
                    console.error('Drink ingredients insert error:', insertError);
                    console.error('Error code:', insertError.code);
                    console.error('Error details:', insertError.details);
                    console.error('Error hint:', insertError.hint);
                    
                    if (insertError.message && insertError.message.includes('row-level security')) {
                        throw new Error(`RLS Policy Error: Cannot save drink ingredients. The database cannot verify your staff permissions.`);
                    }
                    
                    throw insertError;
                }
            }

            // Fetch all ingredients to return
            const { data: allIngredients, error: fetchAllError } = await client
                .from('drink_ingredients')
                .select()
                .eq('product_id', productId);

            if (fetchAllError) {
                console.error('Error fetching all ingredients:', fetchAllError);
                // Don't throw - we've already updated/inserted successfully
            }

            return { success: true, drinkIngredients: allIngredients || [] };
        } catch (error) {
            console.error('Set drink ingredients error:', error);
            return { success: false, error: error.message };
        }
    }

    // Product Size Management
    async getProductSizes(productId) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            const shopId = configManager.getShopId();
            if (!shopId) {
                return { success: false, error: 'Shop ID not configured' };
            }

            const { data, error } = await client
                .from('product_sizes')
                .select('*')
                .eq('product_id', productId)
                .eq('shop_id', shopId)
                .order('display_order', { ascending: true })
                .order('size_name', { ascending: true });

            if (error) throw error;
            return { success: true, sizes: data || [] };
        } catch (error) {
            console.error('Get product sizes error:', error);
            return { success: false, error: error.message };
        }
    }

    async setProductSizes(productId, sizes) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isStaff())) {
            return { success: false, error: 'Unauthorized: Staff access required' };
        }

        try {
            const shopId = configManager.getShopId();
            if (!shopId) {
                return { success: false, error: 'Shop ID not configured' };
            }

            // Verify session is active
            const { data: { session }, error: sessionError } = await client.auth.getSession();
            if (!session) {
                throw new Error('No active session. Please log out and log back in.');
            }

            // Get existing sizes to determine what to update vs insert vs delete
            const { data: existingSizes, error: fetchError } = await client
                .from('product_sizes')
                .select('id, size_name')
                .eq('product_id', productId)
                .eq('shop_id', shopId);

            if (fetchError) {
                console.error('Error fetching existing sizes:', fetchError);
                throw fetchError;
            }

            const existingSizeMap = new Map();
            existingSizes?.forEach(es => {
                existingSizeMap.set(es.size_name, es);
            });

            // Remove duplicates from input - keep only the first occurrence of each size_name
            const seenSizeNames = new Set();
            const uniqueSizes = sizes?.filter(size => {
                if (seenSizeNames.has(size.size_name)) {
                    console.warn(`Duplicate size_name ${size.size_name} removed`);
                    return false;
                }
                seenSizeNames.add(size.size_name);
                return true;
            }) || [];

            const newSizeNames = new Set(uniqueSizes.map(s => s.size_name));
            const existingSizeNames = new Set(existingSizeMap.keys());

            // Delete sizes that are no longer in the list
            const sizesToDelete = Array.from(existingSizeNames).filter(name => !newSizeNames.has(name));
            if (sizesToDelete.length > 0) {
                const { error: deleteError } = await client
                    .from('product_sizes')
                    .delete()
                    .eq('product_id', productId)
                    .eq('shop_id', shopId)
                    .in('size_name', sizesToDelete);

                if (deleteError) {
                    console.error('Delete product sizes error:', deleteError);
                    throw deleteError;
                }
            }

            // Process each size: update if exists, insert if new
            const updates = [];
            const inserts = [];

            for (const size of uniqueSizes) {
                const sizeData = {
                    product_id: productId,
                    shop_id: shopId,
                    size_name: size.size_name,
                    size_oz: parseFloat(size.size_oz || 0),
                    price: parseFloat(size.price || 0),
                    display_order: parseInt(size.display_order || 0),
                    available: size.available !== undefined ? size.available : true
                };

                if (existingSizeMap.has(size.size_name)) {
                    // Update existing size
                    updates.push(
                        client
                            .from('product_sizes')
                            .update({
                                size_oz: sizeData.size_oz,
                                price: sizeData.price,
                                display_order: sizeData.display_order,
                                available: sizeData.available
                            })
                            .eq('product_id', productId)
                            .eq('size_name', size.size_name)
                            .eq('shop_id', shopId)
                    );
                } else {
                    // Insert new size
                    inserts.push(sizeData);
                }
            }

            // Execute updates
            if (updates.length > 0) {
                const updateResults = await Promise.all(updates);
                const updateErrors = updateResults.filter(r => r.error).map(r => r.error);
                if (updateErrors.length > 0) {
                    console.error('Error updating sizes:', updateErrors);
                    throw updateErrors[0];
                }
            }

            // Execute inserts
            if (inserts.length > 0) {
                console.log('Inserting new product sizes:', inserts);
                const { data: insertedData, error: insertError } = await client
                    .from('product_sizes')
                    .insert(inserts)
                    .select();

                if (insertError) {
                    console.error('Product sizes insert error:', insertError);
                    console.error('Error code:', insertError.code);
                    console.error('Error details:', insertError.details);
                    console.error('Error hint:', insertError.hint);
                    
                    if (insertError.message && insertError.message.includes('row-level security')) {
                        throw new Error(`RLS Policy Error: Cannot save product sizes. The database cannot verify your staff permissions.`);
                    }
                    
                    throw insertError;
                }
            }

            // Fetch all sizes to return
            const { data: allSizes, error: fetchAllError } = await client
                .from('product_sizes')
                .select()
                .eq('product_id', productId)
                .eq('shop_id', shopId)
                .order('display_order', { ascending: true });

            if (fetchAllError) {
                console.error('Error fetching all sizes:', fetchAllError);
                // Don't throw - we've already updated/inserted successfully
            }

            return { success: true, sizes: allSizes || [] };
        } catch (error) {
            console.error('Set product sizes error:', error);
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
            const shopId = configManager.getShopId();
            let query = client
                .from('unit_types')
                .select('*')
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });
            
            if (shopId) {
                query = query.eq('shop_id', shopId);
            }
            
            const { data, error } = await query;

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
            const shopId = configManager.getShopId();
            
            // Get the max display_order to add new item at the end
            let maxOrderQuery = client
                .from('unit_types')
                .select('display_order')
                .order('display_order', { ascending: false })
                .limit(1);
            
            if (shopId) {
                maxOrderQuery = maxOrderQuery.eq('shop_id', shopId);
            }
            
            const { data: maxOrderData } = await maxOrderQuery.single();

            const maxOrder = maxOrderData?.display_order || 0;

            const { data, error } = await client
                .from('unit_types')
                .insert({
                    name: unitTypeData.name.toLowerCase().trim(),
                    display_name: unitTypeData.display_name || unitTypeData.name,
                    abbreviation: unitTypeData.abbreviation || unitTypeData.name.toLowerCase().trim(),
                    display_order: maxOrder + 1,
                    shop_id: shopId
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

        const shopId = configManager.getShopId();

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
                .eq('shop_id', shopId)
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

        const shopId = configManager.getShopId();

        try {
            // First, get the unit type name to check if it's in use
            const { data: unitType, error: fetchError } = await client
                .from('unit_types')
                .select('name')
                .eq('id', unitTypeId)
                .eq('shop_id', shopId)
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
                .eq('shop_id', shopId)
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
                .eq('id', unitTypeId)
                .eq('shop_id', shopId);

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
                
                const iconSvg = this.getSocialIcon(platform.platform, platform.url);
                link.innerHTML = iconSvg;
                container.appendChild(link);
            });
        });
    }

    getSocialIcon(platformName, url = '') {
        const name = platformName.toLowerCase();
        const urlLower = url.toLowerCase();
        // Check for TikTok by platform name or URL
        if (name.includes('tiktok') || name.includes('tik-tok') || name === 'tiktok' || name === 'tik tok' || urlLower.includes('tiktok.com') || urlLower.includes('tiktok')) {
            // TikTok icon - musical note shape (official TikTok logo)
            console.log('TikTok icon selected for:', platformName, 'URL:', url);
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>`;
        }
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
        }
        // Generic social icon
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
    }

    // Image generation functions
    async generateImageForProduct(productId, options = {}) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        // Get the product
        const { data: product, error: productError } = await client
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return { success: false, error: 'Product not found' };
        }

        // Check if OpenAI is configured
        if (typeof imageGenerator === 'undefined' || !imageGenerator.isConfigured()) {
            // Try to get API key from config
            const apiKey = configManager?.config?.openai?.apiKey || 
                          window.COFFEE_CLUB_CONFIG?.openai?.apiKey;
            if (apiKey) {
                imageGenerator.initialize(apiKey);
            } else {
                return { 
                    success: false, 
                    error: 'OpenAI API key not configured. Please add your API key to config.local.js or config.public.js' 
                };
            }
        }

        try {
            // Generate the image
            const result = await imageGenerator.generateImage(product, options);
            
            // Update the product with the image URL
            const { error: updateError } = await client
                .from('products')
                .update({ image_url: result.url })
                .eq('id', productId);

            if (updateError) {
                return { success: false, error: `Failed to save image URL: ${updateError.message}` };
            }

            return {
                success: true,
                imageUrl: result.url,
                revisedPrompt: result.revisedPrompt,
                productId: productId
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async generateImagesForAllDrinksWithoutImages(options = {}) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        // Get all drinks without images
        const { data: drinks, error } = await client
            .from('products')
            .select('*')
            .eq('category', 'drink')
            .eq('available', true)
            .is('image_url', null);

        if (error) {
            return { success: false, error: error.message };
        }

        if (!drinks || drinks.length === 0) {
            return { success: true, message: 'All drinks already have images', generated: 0 };
        }

        // Check if OpenAI is configured
        if (typeof imageGenerator === 'undefined' || !imageGenerator.isConfigured()) {
            const apiKey = configManager?.config?.openai?.apiKey || 
                          window.COFFEE_CLUB_CONFIG?.openai?.apiKey;
            if (apiKey) {
                imageGenerator.initialize(apiKey);
            } else {
                return { 
                    success: false, 
                    error: 'OpenAI API key not configured. Please add your API key to config.local.js or config.public.js' 
                };
            }
        }

        // Generate images with progress callback
        const results = await imageGenerator.generateImagesForProducts(drinks, {
            ...options,
            onProgress: options.onProgress || (() => {})
        });

        // Update products with image URLs
        const updates = [];
        for (const result of results) {
            if (result.success && result.imageUrl) {
                const { error: updateError } = await client
                    .from('products')
                    .update({ image_url: result.imageUrl })
                    .eq('id', result.productId);

                if (!updateError) {
                    updates.push(result);
                }
            }
        }

        return {
            success: true,
            total: drinks.length,
            generated: updates.length,
            results: results
        };
    }
}

// Global admin manager instance
const adminManager = new AdminManager();

