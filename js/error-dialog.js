// Error Dialog Component
// Provides consistent, formatted error messages

class ErrorDialog {
    constructor() {
        this.dialog = null;
        this.isOpen = false;
    }

    show(message, title = 'Error') {
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
            border: 2px solid var(--auburn);
        `;

        dialog.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 2px solid rgba(139, 111, 71, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--auburn); display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">⚠️</span>
                        <span>${title}</span>
                    </h3>
                    <button class="error-dialog-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;" onclick="errorDialog.close()">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                <p style="color: var(--text-dark); margin: 0; line-height: 1.6; font-size: 1rem;">
                    ${this.escapeHtml(message)}
                </p>
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); display: flex; justify-content: flex-end;">
                <button class="btn" onclick="errorDialog.close()" style="min-width: 100px;">OK</button>
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
                    <button class="error-dialog-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;" onclick="errorDialog.close()">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem;">
                <p style="color: var(--text-dark); margin: 0; line-height: 1.6; font-size: 1rem;">
                    ${this.escapeHtml(message)}
                </p>
            </div>
            <div style="padding: 1rem 1.5rem; border-top: 2px solid rgba(139, 111, 71, 0.2); display: flex; justify-content: flex-end;">
                <button class="btn" onclick="errorDialog.close()" style="min-width: 100px;">OK</button>
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

    close() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
            this.isOpen = false;
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

