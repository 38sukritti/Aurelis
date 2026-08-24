/* =============================================================================
   COMMIT NO. 18
   COMMIT BY: Harshita
   COMMIT MESSAGE: feat(ui): dynamic table rendering, toast notification system, badge helpers and modal controls
   ============================================================================= */

'use strict';

const UIModule = {
    /**
     * Formats a numeric value into a currency string (default INR / ₹)
     */
    formatCurrency: function(amount) {
        if (window.Utils && typeof window.Utils.formatCurrency === 'function') {
            return window.Utils.formatCurrency(amount);
        }
        if (typeof amount !== 'number' || isNaN(amount)) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Generates an HTML badge string for anomaly severity levels
     */
    getSeverityBadge: function(severity) {
        const s = (severity || 'normal').toLowerCase();
        let cls = 'badge-normal';
        let label = 'Normal';

        if (s === 'critical') {
            cls = 'badge-critical';
            label = 'Critical';
        } else if (s === 'high') {
            cls = 'badge-high';
            label = 'High';
        } else if (s === 'moderate' || s === 'medium') {
            cls = 'badge-moderate';
            label = 'Moderate';
        }

        return `<span class="badge ${cls}">${label}</span>`;
    },

    /**
     * Displays a toast notification on screen
     */
    showToast: function(message, type = 'info', duration = 3500) {
        if (window.Utils && typeof window.Utils.showToast === 'function') {
            window.Utils.showToast(message, type, duration);
            return;
        }

        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Opens a centered modal with custom title and HTML body
     */
    openModal: function(title, bodyHtml) {
        let overlay = document.getElementById('global-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal" role="dialog" aria-modal="true">
                    <div class="modal-header">
                        <h3 class="modal-title" id="global-modal-title"></h3>
                        <button class="close-btn" id="global-modal-close" aria-label="Close modal">&times;</button>
                    </div>
                    <div class="modal-body" id="global-modal-body"></div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Close on backdrop click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    UIModule.closeModal();
                }
            });

            // Close on X button click
            const closeBtn = overlay.querySelector('#global-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => UIModule.closeModal());
            }

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    UIModule.closeModal();
                }
            });
        }

        const titleEl = document.getElementById('global-modal-title');
        const bodyEl = document.getElementById('global-modal-body');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = bodyHtml;

        overlay.classList.add('active');
    },

    /**
     * Closes the active modal
     */
    closeModal: function() {
        const overlay = document.getElementById('global-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            const bodyEl = document.getElementById('global-modal-body');
            if (bodyEl) bodyEl.innerHTML = '';
        }
    },

    /**
     * Opens a right slide-over drawer inspector
     */
    openDrawer: function(title, bodyHtml) {
        let overlay = document.getElementById('global-drawer-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-drawer-overlay';
            overlay.className = 'drawer-overlay';
            overlay.innerHTML = `
                <div class="drawer" role="dialog" aria-modal="true">
                    <div class="drawer-header">
                        <h3 class="drawer-title" id="global-drawer-title"></h3>
                        <button class="close-btn" id="global-drawer-close" aria-label="Close drawer">&times;</button>
                    </div>
                    <div class="drawer-body" id="global-drawer-body"></div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    UIModule.closeDrawer();
                }
            });

            const closeBtn = overlay.querySelector('#global-drawer-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => UIModule.closeDrawer());
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('active')) {
                    UIModule.closeDrawer();
                }
            });
        }

        const titleEl = document.getElementById('global-drawer-title');
        const bodyEl = document.getElementById('global-drawer-body');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = bodyHtml;

        overlay.classList.add('active');
    },

    /**
     * Closes the drawer inspector
     */
    closeDrawer: function() {
        const overlay = document.getElementById('global-drawer-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            const bodyEl = document.getElementById('global-drawer-body');
            if (bodyEl) bodyEl.innerHTML = '';
        }
    }
};

window.UIModule = UIModule;
window.UI = UIModule;
