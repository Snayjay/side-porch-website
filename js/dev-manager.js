// Dev Manager Module
// Handles module state management and social platform configuration

class DevManager {
    constructor() {
        this.moduleStates = {};
        this.socialPlatforms = [];
        this.developerEmail = 'jeffrey.loehr@gmail.com'; // Hardcoded developer email
    }

    // Check if current user is developer
    async isDeveloper() {
        const user = await authManager.getCurrentUser();
        if (!user || !user.email) {
            console.log('Dev check: No user or email found', { user });
            return false;
        }
        const isDev = user.email.toLowerCase() === this.developerEmail.toLowerCase();
        console.log('Dev check:', { userEmail: user.email, developerEmail: this.developerEmail, isDev });
        return isDev;
    }

    // Get module state from database
    async getModuleState(moduleName) {
        const client = getSupabaseClient();
        if (!client) {
            // Default to enabled if Supabase not configured
            return true;
        }

        try {
            const configKey = `module_${moduleName}_enabled`;
            
            // Check cache first
            if (this.moduleStates[configKey] !== undefined) {
                return this.moduleStates[configKey];
            }

            const { data, error } = await client
                .from('site_config')
                .select('config_value')
                .eq('config_key', configKey)
                .single();

            if (error) {
                // If not found, default to enabled
                if (error.code === 'PGRST116') {
                    this.moduleStates[configKey] = true;
                    return true;
                }
                console.warn(`Error getting module state for ${moduleName}:`, error.message);
                return true; // Default to enabled
            }

            const enabled = data?.config_value === 'true' || data?.config_value === true;
            this.moduleStates[configKey] = enabled;
            return enabled;
        } catch (e) {
            console.warn(`Error getting module state for ${moduleName}:`, e.message);
            return true; // Default to enabled
        }
    }

    // Set module state in database
    async setModuleState(moduleName, enabled) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isDeveloper())) {
            return { success: false, error: 'Unauthorized: Developer access required' };
        }

        try {
            const configKey = `module_${moduleName}_enabled`;
            const configValue = enabled ? 'true' : 'false';

            const { error } = await client
                .from('site_config')
                .upsert({
                    config_key: configKey,
                    config_value: configValue,
                    description: `Enable/disable ${moduleName} module`,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_key'
                });

            if (error) throw error;

            // Update cache
            this.moduleStates[configKey] = enabled;
            return { success: true };
        } catch (error) {
            console.error(`Error setting module state for ${moduleName}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Get all module states
    async getAllModuleStates() {
        const modules = ['coffee_club', 'menu', 'about', 'contact'];
        const states = {};
        
        for (const module of modules) {
            states[module] = await this.getModuleState(module);
        }
        
        return states;
    }

    // Get social platforms from database
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
                    // Not found, return empty array
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
                this.socialPlatforms = Array.isArray(platforms) ? platforms : [];
                return this.socialPlatforms;
            } catch (e) {
                console.warn('Error parsing social platforms:', e.message);
                return [];
            }
        } catch (e) {
            console.warn('Error getting social platforms:', e.message);
            return [];
        }
    }

    // Set social platforms in database
    async setSocialPlatforms(platforms) {
        const client = getSupabaseClient();
        if (!client) {
            return { success: false, error: 'Supabase not configured' };
        }

        if (!(await this.isDeveloper())) {
            return { success: false, error: 'Unauthorized: Developer access required' };
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
                    description: 'Social media platform configurations',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'config_key'
                });

            if (error) throw error;

            this.socialPlatforms = cleanedPlatforms;
            return { success: true };
        } catch (error) {
            console.error('Error setting social platforms:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if module is accessible, redirect if not
    async checkModuleAccess(moduleName) {
        const enabled = await this.getModuleState(moduleName);
        if (!enabled) {
            // Redirect to home page
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // Clear cache (useful after updates)
    clearCache() {
        this.moduleStates = {};
        this.socialPlatforms = [];
    }

    // Update navigation visibility based on module states
    async updateNavigationVisibility() {
        try {
            const states = await this.getAllModuleStates();
            
            // Update Coffee Club link
            const coffeeClubLinks = document.querySelectorAll('a[href="coffee-club.html"]');
            coffeeClubLinks.forEach(link => {
                const listItem = link.closest('li');
                if (listItem) {
                    listItem.style.display = states.coffee_club ? '' : 'none';
                }
            });

            // Update Menu link
            const menuLinks = document.querySelectorAll('a[href="menu.html"]');
            menuLinks.forEach(link => {
                const listItem = link.closest('li');
                if (listItem) {
                    listItem.style.display = states.menu ? '' : 'none';
                }
            });

            // Update About link
            const aboutLinks = document.querySelectorAll('a[href="about.html"]');
            aboutLinks.forEach(link => {
                const listItem = link.closest('li');
                if (listItem) {
                    listItem.style.display = states.about ? '' : 'none';
                }
            });

            // Update Contact link
            const contactLinks = document.querySelectorAll('a[href="contact.html"]');
            contactLinks.forEach(link => {
                const listItem = link.closest('li');
                if (listItem) {
                    listItem.style.display = states.contact ? '' : 'none';
                }
            });
        } catch (error) {
            // If database queries fail, default to showing all links
            console.warn('Error updating navigation visibility, showing all links:', error);
            document.querySelectorAll('.nav-links li').forEach(li => {
                if (!li.classList.contains('admin-nav-link') && !li.classList.contains('dev-nav-link')) {
                    li.style.display = '';
                }
            });
        }
    }

    // Update footer social links
    async updateFooterSocialLinks() {
        const platforms = await this.getSocialPlatforms();
        const enabledPlatforms = platforms.filter(p => p.enabled && p.url);
        
        const socialLinksContainers = document.querySelectorAll('.social-links');
        
        socialLinksContainers.forEach(container => {
            container.innerHTML = '';
            
            enabledPlatforms.forEach(platform => {
                const link = document.createElement('a');
                link.href = platform.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.setAttribute('aria-label', platform.platform);
                
                // Use appropriate icon based on platform name
                const iconSvg = this.getSocialIcon(platform.platform);
                link.innerHTML = iconSvg;
                
                container.appendChild(link);
            });
        });
    }

    // Get social icon SVG based on platform name
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
        } else if (name.includes('twitter') || name.includes('x')) {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>`;
        } else {
            // Generic social icon
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>`;
        }
    }
}

// Global dev manager instance
const devManager = new DevManager();

