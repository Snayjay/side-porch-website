// Dev UI Components
// Handles rendering and interaction for developer panel interface

class DevUI {
    constructor() {
        this.moduleStates = {};
        this.isSaving = false;
    }

    async init() {
        try {
            console.log('Dev UI: Starting initialization...');
            
            // Wait a moment for Supabase to restore session from storage
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Wait for user to be authenticated - try multiple times if needed
            let user = await authManager.getCurrentUser();
            console.log('Dev UI: User (first attempt):', user ? user.email : 'null');
            
            // If no user, wait a bit more and try again (session might still be restoring)
            if (!user) {
                console.log('Dev UI: No user on first attempt, waiting for session restore...');
                await new Promise(resolve => setTimeout(resolve, 500));
                user = await authManager.getCurrentUser();
                console.log('Dev UI: User (second attempt):', user ? user.email : 'null');
            }
            
            if (!user) {
                console.log('Dev UI: No user found after waiting, redirecting to index.html');
                // Not logged in, redirect to home
                window.location.href = 'index.html';
                return;
            }

            // Check if user is developer
            const isDev = await devManager.isDeveloper();
            console.log('Dev UI: Is developer?', isDev, 'User email:', user.email);
            
            if (!isDev) {
                console.error('Dev UI: User is not a developer!');
                console.error('Dev UI: User email:', user.email);
                console.error('Dev UI: Developer email:', devManager.developerEmail);
                console.error('Dev UI: Match?', user.email?.toLowerCase() === devManager.developerEmail?.toLowerCase());
                
                // Show error message instead of immediately redirecting
                const container = document.getElementById('dev-content');
                if (container) {
                    container.innerHTML = `
                        <div style="padding: 2rem; text-align: center;">
                            <h3 style="color: var(--auburn); margin-bottom: 1rem;">Access Denied</h3>
                            <p style="color: var(--text-dark); margin-bottom: 1rem;">
                                You do not have developer access.
                            </p>
                            <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                Your email: <strong>${user.email || 'unknown'}</strong>
                            </p>
                            <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 0.5rem; font-size: 0.9rem;">
                                Developer email: <strong>${devManager.developerEmail || 'unknown'}</strong>
                            </p>
                            <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 1.5rem; font-size: 0.9rem;">
                                Developer access is restricted to authorized personnel only. Check the browser console for details.
                            </p>
                            <div style="display: flex; gap: 1rem; justify-content: center;">
                                <button class="btn" onclick="location.reload()">Reload Page</button>
                                <button class="btn btn-secondary" onclick="window.location.href='index.html'">Go to Home</button>
                            </div>
                        </div>
                    `;
                }
                // Don't redirect automatically - let user see the message and decide
                return;
            }

            console.log('Dev UI: User is developer, rendering panel...');
            await this.renderPanel();
        } catch (error) {
            console.error('Dev UI initialization error:', error);
            const container = document.getElementById('dev-content');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <h3 style="color: var(--auburn); margin-bottom: 1rem;">Error Loading Dev Panel</h3>
                        <p style="color: var(--text-dark); margin-bottom: 1rem;">${error.message || 'An unexpected error occurred'}</p>
                        <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 1rem; font-size: 0.9rem;">Check the browser console for details.</p>
                        <button class="btn" onclick="location.reload()">Reload Page</button>
                    </div>
                `;
            }
        }
    }

    async renderPanel() {
        const container = document.getElementById('dev-content');
        if (!container) return;

        // Load current states
        this.moduleStates = await devManager.getAllModuleStates();

        container.innerHTML = `
            <div id="dev-message" class="dev-message"></div>
            
            <div class="dev-section">
                <h3>Module Management</h3>
                <p style="color: var(--text-dark); opacity: 0.7; margin-bottom: 1.5rem;">
                    Enable or disable modules to control what features are available on the website.
                </p>
                <div id="module-toggles" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
                    ${this.renderModuleToggles()}
                </div>
            </div>

        `;
    }

    renderModuleToggles() {
        const modules = [
            {
                key: 'coffee_club',
                name: 'Coffee Club',
                description: 'Online ordering system with prepaid accounts'
            },
            {
                key: 'menu',
                name: 'Menu',
                description: 'Menu page displaying products and prices'
            },
            {
                key: 'about',
                name: 'About',
                description: 'About page with business information'
            },
            {
                key: 'contact',
                name: 'Contact',
                description: 'Contact page with location and hours'
            }
        ];

        return modules.map(module => `
            <div class="module-toggle-item">
                <label for="module-${module.key}">
                    <span>${module.name}</span>
                    <label class="toggle-switch" onclick="event.stopPropagation()">
                        <input type="checkbox" 
                               id="module-${module.key}" 
                               ${this.moduleStates[module.key] ? 'checked' : ''}
                               onchange="devUI.updateModuleState('${module.key}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </label>
                <div class="module-description">${module.description}</div>
            </div>
        `).join('');
    }

    async updateModuleState(moduleKey, enabled) {
        this.moduleStates[moduleKey] = enabled;
        
        // Auto-save immediately
        try {
            const result = await devManager.setModuleState(moduleKey, enabled);
            if (result.success) {
                // Show brief success indicator
                this.showMessage('Module updated', 'success');
                // Update navigation visibility
                await devManager.updateNavigationVisibility();
            } else {
                this.showMessage(`Error: ${result.error}`, 'error');
                // Revert the toggle
                const checkbox = document.getElementById(`module-${moduleKey}`);
                if (checkbox) {
                    checkbox.checked = !enabled;
                    this.moduleStates[moduleKey] = !enabled;
                }
            }
        } catch (error) {
            this.showMessage(`Error saving: ${error.message}`, 'error');
            // Revert the toggle
            const checkbox = document.getElementById(`module-${moduleKey}`);
            if (checkbox) {
                checkbox.checked = !enabled;
                this.moduleStates[moduleKey] = !enabled;
            }
        }
    }

    showMessage(text, type = 'success') {
        const messageDiv = document.getElementById('dev-message');
        if (messageDiv) {
            messageDiv.className = `dev-message ${type} show`;
            messageDiv.textContent = text;
            
            // Hide message after 2 seconds
            setTimeout(() => {
                messageDiv.className = 'dev-message';
            }, 2000);
        }
    }

    async saveChanges() {
        if (this.isSaving) return;

        this.isSaving = true;
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const messageDiv = document.getElementById('dev-message');
        messageDiv.className = 'dev-message';
        messageDiv.textContent = '';

        try {
            // Save module states
            const modulePromises = Object.keys(this.moduleStates).map(key =>
                devManager.setModuleState(key, this.moduleStates[key])
            );
            const moduleResults = await Promise.all(modulePromises);
            const moduleErrors = moduleResults.filter(r => !r.success);

            // Save social platforms
            const socialResult = await devManager.setSocialPlatforms(this.socialPlatforms);

            if (moduleErrors.length > 0 || !socialResult.success) {
                throw new Error(moduleErrors.length > 0 
                    ? `Error saving modules: ${moduleErrors[0].error}`
                    : socialResult.error || 'Error saving social platforms');
            }

            // Clear cache to force reload
            devManager.clearCache();

            // Show success message
            messageDiv.className = 'dev-message success show';
            messageDiv.textContent = 'Changes saved successfully!';

            // Reload navigation and footer
            await devManager.updateNavigationVisibility();
            await devManager.updateFooterSocialLinks();

            // Hide message after 3 seconds
            setTimeout(() => {
                messageDiv.className = 'dev-message';
            }, 3000);

        } catch (error) {
            messageDiv.className = 'dev-message error show';
            messageDiv.textContent = error.message || 'Error saving changes';
        } finally {
            this.isSaving = false;
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    async resetToDefaults() {
        if (!confirm('Reset all modules to enabled and clear social platforms? This cannot be undone.')) {
            return;
        }

        // Reset module states to enabled
        this.moduleStates = {
            coffee_club: true,
            menu: true,
            about: true,
            contact: true
        };

        // Clear social platforms
        this.socialPlatforms = [];

        // Save changes
        await this.saveChanges();
    }

    async updateDevLinkVisibility() {
        const isDev = await devManager.isDeveloper();
        document.querySelectorAll('.dev-nav-link').forEach(link => {
            link.style.display = isDev ? '' : 'none';
        });
    }
}

// Global dev UI instance
const devUI = new DevUI();

