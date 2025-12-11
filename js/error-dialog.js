// Error Dialog Component
// Provides consistent, formatted error messages

class ErrorDialog {
    constructor() {
        this.dialog = null;
        this.isOpen = false;
        this.onCloseCallback = null;
    }

    show(message, title = 'Error', allowHtml = false, autoCloseDelay = 0, onClose = null) {
        if (this.isOpen) {
            this.close();
        }
        this.isOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'error-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(3px);
            animation: fadeIn 0.2s ease;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'error-dialog';
        dialog.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideDown 0.3s ease;
            border: 2px solid var(--auburn);
        `;

        const messageContent = allowHtml ? message : this.escapeHtml(message);

        dialog.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--auburn); display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <span>${title}</span>
                    </h3>
                    <button class="error-dialog-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                <div style="color: var(--text-dark); margin: 0; line-height: 1.6; font-size: 1rem;">
                    ${messageContent}
                </div>
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); display: flex; justify-content: flex-end;">
                <button class="btn" id="error-dialog-ok-btn" style="min-width: 100px;">OK</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this.dialog = overlay;
        this.onCloseCallback = onClose || null;

        // Set up close button
        const closeButton = dialog.querySelector('.error-dialog-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.close(false);
            });
        }

        // Set up OK button
        const okButton = dialog.querySelector('#error-dialog-ok-btn');
        if (okButton) {
            okButton.addEventListener('click', () => {
                this.close(!!onClose);
            });
        }

        // Auto-close if delay is set
        if (autoCloseDelay > 0) {
            setTimeout(() => {
                this.close(!!onClose);
            }, autoCloseDelay);
        }

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(false);
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus the OK button
        setTimeout(() => {
            if (okButton) okButton.focus();
        }, 100);
    }

    showSuccess(message, title = 'Success') {
        if (this.isOpen) {
            this.close();
        }
        this.isOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'error-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            backdrop-filter: blur(3px);
            animation: fadeIn 0.2s ease;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'error-dialog';
        dialog.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            animation: slideDown 0.3s ease;
            border: 2px solid #4CAF50;
        `;

        dialog.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #4CAF50; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">✓</span>
                        <span>${title}</span>
                    </h3>
                    <button class="error-dialog-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;" onclick="errorDialog.close(false)">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                <p style="color: var(--text-dark); margin: 0; line-height: 1.6; font-size: 1rem;">
                    ${this.escapeHtml(message)}
                </p>
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); display: flex; justify-content: flex-end;">
                <button class="btn" onclick="errorDialog.close(false)" style="min-width: 100px;">OK</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this.dialog = overlay;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus the OK button
        setTimeout(() => {
            const okButton = dialog.querySelector('.btn');
            if (okButton) okButton.focus();
        }, 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    close(triggerCallback = false) {
        if (this.dialog) {
            const overlay = this.dialog;
            this.dialog.remove();
            this.dialog = null;
            this.isOpen = false;
            
            // Trigger callback if provided and requested
            if (triggerCallback && this.onCloseCallback) {
                this.onCloseCallback();
                this.onCloseCallback = null;
            }
        }
    }
}

// Global instance
const errorDialog = new ErrorDialog();

// Add CSS animations if not already present
if (!document.getElementById('error-dialog-styles')) {
    const style = document.createElement('style');
    style.id = 'error-dialog-styles';
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .error-dialog-close:hover {
            color: var(--auburn) !important;
        }
    `;
    document.head.appendChild(style);
}

