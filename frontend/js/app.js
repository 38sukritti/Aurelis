/* =============================================================================
   AURELIS -- Financial Intelligence & Statistical Anomaly Detector
   Collaborative Development: Sukritti Singla -- Harshita Malhotra -- Simran Kapoor
   ============================================================================= */

'use strict';

const App = {
    currentUser: null,

    init: async function() {
        // Check auth first
        const user = window.StorageModule.getCurrentUser();
        if (!user) {
            window.location.replace('login.html');
            return;
        }
        this.currentUser = user;

        this.updateCurrentDate();
        this.bindEvents();

        // Wait for the user's data before the splash screen is removed and
        // the router renders, so the views never show half-loaded numbers.
        const startedAt = Date.now();
        const dataLoaded = await this.initializeData();
        const remainingSplashTime = Math.max(0, 700 - (Date.now() - startedAt));

        // Hide splash screen after initialization
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            const appContainer = document.getElementById('app-container');
            
            if (splash) splash.style.opacity = '0';
            if (appContainer) appContainer.classList.remove('hidden');
            
            setTimeout(() => {
                if (splash && splash.parentNode) splash.remove();
                // Initialize Router after DOM is visible
                if (window.AppRouter) window.AppRouter.init();
                if (dataLoaded) this.offerLegacyImport();
            }, 400);
        }, remainingSplashTime);
    },

    initializeData: async function() {
        try {
            this.currentUser = await window.StorageModule.loadUserData();
            return true;
        } catch (error) {
            // A 401 already redirected to the login page. Anything else
            // (server down, no network) is shown instead of failing silently.
            if (error.status !== 401) {
                console.error('Could not load data from the API:', error);
                window.UIModule.showToast(`${error.message} Your data could not be loaded.`, 'error');
            }
            return false;
        }
    },

    // One-time offer to copy transactions saved by the old localStorage
    // version of AURELIS into this account. The browser copy is kept.
    offerLegacyImport: async function() {
        const email = this.currentUser && this.currentUser.email;
        if (!email || email === 'demo@aurelis.io') return;

        const legacyRows = window.StorageModule.findLegacyTransactions(email);
        if (legacyRows.length === 0) return;

        const message = `We found ${legacyRows.length} transaction(s) saved in this browser by the previous version of AURELIS. Import them into your account?`;
        if (!confirm(message)) {
            // Don't ask again on every page load.
            window.StorageModule.markLegacyImportDone(email);
            return;
        }

        try {
            const summary = await window.StorageModule.importLegacyTransactions(email);
            window.UIModule.showToast(`Imported ${summary.importedCount} saved transaction(s).`, 'success');
            if (window.AppRouter) window.AppRouter.handleRoute();
        } catch (error) {
            window.UIModule.showToast(`Import failed: ${error.message}`, 'error');
        }
    },

    updateCurrentDate: function() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const now = new Date();
            dateElement.textContent = now.toLocaleDateString('en-GB', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        }
    },

    bindEvents: function() {
        // Listen for global hash changes to update active nav state
        window.addEventListener('hashchange', this.updateActiveNav.bind(this));
    },

    updateActiveNav: function() {
        const hash = window.location.hash || '#/dashboard';
        const navItems = document.querySelectorAll('.nav-item[data-route]');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === hash) {
                item.classList.add('active');
            }
        });
    }
};

// Boot the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
