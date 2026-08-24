/* =============================================================================
   COMMIT NO. 28
   COMMIT BY: Simran
   COMMIT MESSAGE: feat(app): SPA bootstrap initialization and global lifecycle event listeners
   ============================================================================= */

'use strict';

const App = {
    currentUser: null,

    init: function() {
        // Check auth first
        const user = window.StorageModule.getCurrentUser();
        if (!user) {
            window.location.replace('login.html');
            return;
        }
        this.currentUser = user;

        this.updateCurrentDate();
        this.initializeData();
        
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
            }, 400);
        }, 700);

        this.bindEvents();
    },

    initializeData: function() {
        // Ensure default settings exist
        const settings = window.StorageModule.getSettings();
        if (!settings || !settings.zScoreThreshold) {
            window.StorageModule.saveSettings({
                zScoreThreshold: 3.0,
                behavioralIntelligence: true,
                experimentalModel: true,
                showConfidenceScores: true
            });
        }

        // Only seed demo data for the dedicated demo account (demo@aurelis.io)
        if (this.currentUser && this.currentUser.email === 'demo@aurelis.io') {
            const userTxs = window.StorageModule.getTransactionsForUser(this.currentUser.email);
            if (userTxs.length === 0 && window.StorageModule.seedDemoDataForUser) {
                console.log('Seeding demo data for demo user...');
                window.StorageModule.seedDemoDataForUser(this.currentUser.email);
            }
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
