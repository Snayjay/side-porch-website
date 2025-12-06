// Secure Secrets Dialog
// Collects API keys securely without exposing them in code

class SecretsDialog {
    constructor() {
        this.dialog = null;
        this.isOpen = false;
    }

    show() {
        if (this.isOpen) return;
        this.isOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'secrets-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        const dialog = document.createElement('div');
        dialog.className = 'secrets-dialog';
        dialog.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s ease;
        `;

        // Load existing values (masked)
        const existingConfig = this.loadExistingConfig();
        const supabaseUrl = existingConfig.supabase?.url || 'https://crtcxdsaqjzskbraobjv.supabase.co';
        const hasSupabaseKey = !!existingConfig.supabase?.anonKey;
        const hasStripeKey = !!existingConfig.stripe?.publishableKey;

        dialog.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: var(--deep-brown);">🔐 API Configuration</h2>
                    <button class="secrets-dialog-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;" onclick="secretsDialog.close()">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                <p style="margin-bottom: 1.5rem; color: var(--text-dark);">
                    Enter your API keys securely. These are stored locally in your browser and never exposed in code.
                </p>
                <form id="secrets-form" onsubmit="secretsDialog.save(event)">
                    <div class="form-group">
                        <label for="supabase-url">Supabase Project URL</label>
                        <input type="text" id="supabase-url" placeholder="https://your-project.supabase.co" 
                               value="${supabaseUrl}" required>
                        <small style="color: var(--text-dark); opacity: 0.7; display: block; margin-top: 0.5rem;">
                            Found in Supabase Dashboard → Settings → API
                        </small>
                    </div>
                    <div class="form-group">
                        <label for="supabase-key">Supabase Anon Key</label>
                        <input type="password" id="supabase-key" placeholder="${hasSupabaseKey ? '•••••••••••••••• (configured)' : 'Enter Supabase anonymous key'}" required>
                        ${hasSupabaseKey ? '<small style="color: var(--auburn); display: block; margin-top: 0.5rem;">⚠️ Leave blank to keep existing key</small>' : ''}
                        <small style="color: var(--text-dark); opacity: 0.7; display: block; margin-top: 0.5rem;">
                            Found in Supabase Dashboard → Settings → API (anon/public key)
                        </small>
                    </div>
                    <div class="form-group">
                        <label for="stripe-key">Stripe Publishable Key</label>
                        <input type="password" id="stripe-key" placeholder="${hasStripeKey ? '•••••••••••••••• (configured)' : 'Enter Stripe publishable key'}" required>
                        ${hasStripeKey ? '<small style="color: var(--auburn); display: block; margin-top: 0.5rem;">⚠️ Leave blank to keep existing key</small>' : ''}
                        <small style="color: var(--text-dark); opacity: 0.7; display: block; margin-top: 0.5rem;">
                            Found in Stripe Dashboard → Developers → API keys
                        </small>
                    </div>
                    <div id="secrets-error" style="color: var(--auburn); margin-bottom: 1rem; display: none;"></div>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="secretsDialog.close()">Cancel</button>
                        <button type="submit" class="btn">Save Configuration</button>
                    </div>
                </form>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this.dialog = overlay;

        // Focus first input
        setTimeout(() => {
            const firstInput = dialog.querySelector('#supabase-url');
            if (firstInput) firstInput.focus();
        }, 100);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }

    loadExistingConfig() {
        try {
            const stored = localStorage.getItem('coffeeClubConfig');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading existing config:', e);
        }
        return {};
    }

    async save(event) {
        event.preventDefault();
        const errorDiv = document.getElementById('secrets-error');
        errorDiv.style.display = 'none';

        const supabaseUrl = document.getElementById('supabase-url').value.trim();
        const supabaseKey = document.getElementById('supabase-key').value.trim();
        const stripeKey = document.getElementById('stripe-key').value.trim();

        // Load existing config to preserve keys if fields are left blank
        const existingConfig = this.loadExistingConfig();

        if (!supabaseUrl) {
            this.showError('Supabase Project URL is required');
            return;
        }

        // Only update keys if new values are provided
        const finalConfig = {
            supabase: {
                url: supabaseUrl,
                anonKey: supabaseKey || existingConfig.supabase?.anonKey || null
            },
            stripe: {
                publishableKey: stripeKey || existingConfig.stripe?.publishableKey || null
            }
        };

        if (!finalConfig.supabase.anonKey) {
            this.showError('Supabase Anon Key is required');
            return;
        }

        if (!finalConfig.stripe.publishableKey) {
            this.showError('Stripe Publishable Key is required');
            return;
        }

        // Update config manager
        configManager.config = finalConfig;
        
        // Save to database (master record) and localStorage (backup)
        const saveResult = await configManager.saveToDatabase();
        
        if (saveResult.success) {
            // Show success message
            this.showSuccess();
            
            // Close dialog
            setTimeout(() => {
                this.close();
                // Reload page to initialize with new config
                window.location.reload();
            }, 1500);
        } else {
            // If database save failed, at least save to localStorage
            try {
                localStorage.setItem('coffeeClubConfig', JSON.stringify(finalConfig));
                this.showSuccess();
                setTimeout(() => {
                    this.close();
                    window.location.reload();
                }, 1500);
            } catch (e) {
                this.showError('Error saving configuration: ' + e.message);
            }
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('secrets-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    showSuccess() {
        const form = document.getElementById('secrets-form');
        form.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✓</div>
                <h3 style="color: var(--auburn); margin-bottom: 1rem;">Configuration Saved!</h3>
                <p style="color: var(--text-dark);">Your API keys have been securely stored. Reloading...</p>
            </div>
        `;
    }

    close() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
            this.isOpen = false;
        }
    }
}

// Global instance
const secretsDialog = new SecretsDialog();

