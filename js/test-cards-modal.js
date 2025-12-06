// Test Cards Modal Component
// Displays Stripe test card information in a popup modal

class TestCardsModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
    }

    show() {
        if (this.isOpen) {
            this.close();
        }
        this.isOpen = true;

        const overlay = document.createElement('div');
        overlay.className = 'test-cards-modal-overlay';
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
            z-index: 10002;
            backdrop-filter: blur(3px);
            animation: fadeIn 0.2s ease;
            padding: 1rem;
            overflow-y: auto;
        `;

        const modal = document.createElement('div');
        modal.className = 'test-cards-modal';
        modal.style.cssText = `
            background: var(--parchment);
            border-radius: 15px;
            padding: 0;
            max-width: 900px;
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
                    <h2 style="margin: 0; color: var(--deep-brown); display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">💳</span>
                        <span>Stripe Test Cards Reference</span>
                    </h2>
                    <button class="test-cards-modal-close" style="background: none; border: none; font-size: 2rem; color: var(--text-dark); cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;" onclick="testCardsModal.close()">&times;</button>
                </div>
            </div>
            <div style="padding: 1.5rem; overflow-y: auto; flex: 1;">
                <div style="background: rgba(160, 82, 45, 0.1); border-left: 4px solid var(--auburn); padding: 1rem; margin-bottom: 1.5rem; border-radius: 6px;">
                    <p style="margin: 0; color: var(--text-dark); font-size: 0.9rem;">
                        <strong>⚠️ Test Mode Only:</strong> These cards only work with Stripe test mode (keys starting with <code style="background: rgba(139, 111, 71, 0.2); padding: 0.2rem 0.4rem; border-radius: 4px;">pk_test_</code>). Never use real credit card information in test mode. All transactions are simulated and no real charges occur.
                    </p>
                </div>
                ${this.getTestCardsHTML()}
                <div style="background: rgba(160, 82, 45, 0.1); border-left: 4px solid var(--auburn); padding: 1rem; margin-top: 1.5rem; border-radius: 6px;">
                    <p style="margin: 0; color: var(--text-dark); font-size: 0.9rem;">
                        <strong>💡 Tip:</strong> Click on any individual field to copy just that value, or use the "Copy All" button to copy all card details at once. For expiry, CVC, and ZIP, you can use any valid format - Stripe will accept them in test mode.
                    </p>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.modal = overlay;

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

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    getTestCardsHTML() {
        const testCards = [
            {
                name: '✅ Success',
                number: '4242424242424242',
                displayNumber: '4242 4242 4242 4242',
                description: 'Use this card to simulate a successful payment.'
            },
            {
                name: '❌ Decline (Generic)',
                number: '4000000000000002',
                displayNumber: '4000 0000 0000 0002',
                description: 'Use this card to simulate a declined payment.'
            },
            {
                name: '💳 Insufficient Funds',
                number: '4000000000009995',
                displayNumber: '4000 0000 0000 9995',
                description: 'Use this card to simulate insufficient funds.'
            },
            {
                name: '🔍 Lost Card',
                number: '4000000000009987',
                displayNumber: '4000 0000 0000 9987',
                description: 'Use this card to simulate a lost card error.'
            },
            {
                name: '🚨 Stolen Card',
                number: '4000000000009979',
                displayNumber: '4000 0000 0000 9979',
                description: 'Use this card to simulate a stolen card error.'
            },
            {
                name: '🔐 Requires Authentication (3D Secure)',
                number: '4000002500003155',
                displayNumber: '4000 0025 0000 3155',
                description: 'Use this card to test 3D Secure authentication flow.'
            },
            {
                name: '⚠️ Processing Error',
                number: '4000000000000119',
                displayNumber: '4000 0000 0000 0119',
                description: 'Use this card to simulate a processing error.'
            }
        ];

        return testCards.map(card => `
            <div class="test-card-item" style="background: var(--cream); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px; border-left: 4px solid var(--accent-orange); box-shadow: 0 4px 12px rgba(92, 64, 51, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--deep-brown); margin: 0;">${card.name}</h3>
                    <button class="copy-all-btn" onclick="testCardsModal.copyCardInfo('${card.number}', '12/34', '123', '12345', '${card.name}')" style="background: var(--accent-orange); border: none; color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; transition: all 0.3s ease;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        Copy All
                    </button>
                </div>
                <p style="color: var(--text-dark); margin-bottom: 1rem; font-size: 0.95rem;">${card.description}</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="detail-item" style="background: white; padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-bottom: 0.25rem;">Card Number</div>
                        <div class="detail-value" onclick="testCardsModal.copyText('${card.number}', this)" style="font-size: 1rem; font-weight: 600; color: var(--deep-brown); font-family: 'Courier New', monospace; cursor: pointer; transition: color 0.2s ease;">${card.displayNumber}</div>
                    </div>
                    <div class="detail-item" style="background: white; padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-bottom: 0.25rem;">Expiry</div>
                        <div class="detail-value" onclick="testCardsModal.copyText('12/34', this)" style="font-size: 1rem; font-weight: 600; color: var(--deep-brown); font-family: 'Courier New', monospace; cursor: pointer; transition: color 0.2s ease;">12/34</div>
                    </div>
                    <div class="detail-item" style="background: white; padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-bottom: 0.25rem;">CVC</div>
                        <div class="detail-value" onclick="testCardsModal.copyText('123', this)" style="font-size: 1rem; font-weight: 600; color: var(--deep-brown); font-family: 'Courier New', monospace; cursor: pointer; transition: color 0.2s ease;">123</div>
                    </div>
                    <div class="detail-item" style="background: white; padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(139, 111, 71, 0.2);">
                        <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.7; margin-bottom: 0.25rem;">ZIP</div>
                        <div class="detail-value" onclick="testCardsModal.copyText('12345', this)" style="font-size: 1rem; font-weight: 600; color: var(--deep-brown); font-family: 'Courier New', monospace; cursor: pointer; transition: color 0.2s ease;">12345</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    copyText(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = element.textContent;
            element.textContent = 'Copied!';
            element.style.color = '#28a745';
            setTimeout(() => {
                element.textContent = originalText;
                element.style.color = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        });
    }

    copyCardInfo(cardNumber, expiry, cvc, zip, cardName) {
        const cardInfo = `Card Number: ${cardNumber}\nExpiry: ${expiry}\nCVC: ${cvc}\nZIP: ${zip}`;
        navigator.clipboard.writeText(cardInfo).then(() => {
            const buttons = this.modal.querySelectorAll('.copy-all-btn');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes(cardName)) {
                    btn.style.background = '#28a745';
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
                    setTimeout(() => {
                        btn.style.background = '';
                        btn.innerHTML = originalHTML;
                    }, 2000);
                }
            });
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
        });
    }

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
            this.isOpen = false;
            document.body.style.overflow = '';
        }
    }
}

// Global instance
const testCardsModal = new TestCardsModal();

// Add CSS styles if not already present
if (!document.getElementById('test-cards-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'test-cards-modal-styles';
    style.textContent = `
        .test-cards-modal-close:hover {
            color: var(--auburn) !important;
        }
        .copy-all-btn:hover {
            background: var(--burnt-orange) !important;
            transform: translateY(-2px);
        }
        .detail-value:hover {
            color: var(--auburn) !important;
        }
    `;
    document.head.appendChild(style);
}

