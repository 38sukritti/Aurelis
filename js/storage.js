/* =============================================================================
   COMMIT NO. 02
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(storage): implement LocalStorage schema, user session and transaction persistence
   ============================================================================= */

'use strict';

const STORAGE_KEYS = {
    TRANSACTIONS: 'aurelis_transactions',
    SETTINGS:     'aurelis_settings',
    USERS:        'aurelis_users',
    CURRENT_USER: 'currentUser'
};

const DEFAULT_SETTINGS = {
    zScoreThreshold: 3.0
};

// Seed demo user credentials
const DEMO_USER = {
    id: 'demo@aurelis.io',
    name: 'Alex Vance',
    email: 'demo@aurelis.io',
    password: 'password123'
};

const StorageModule = {

    // ── User Management ───────────────────────────────────────────────────────
    
    getUsers: function() {
        const data = localStorage.getItem(STORAGE_KEYS.USERS);
        let users = data ? JSON.parse(data) : [];
        // Ensure demo user exists
        if (!users.find(u => u.email === DEMO_USER.email)) {
            users.push(DEMO_USER);
            this.saveUsers(users);
        }
        return users;
    },

    saveUsers: function(users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    },

    saveUser: function(user) {
        const users = this.getUsers();
        const existingIdx = users.findIndex(u => u.email === user.email);
        if (existingIdx >= 0) {
            users[existingIdx] = user;
        } else {
            users.push(user);
        }
        this.saveUsers(users);
    },

    findUserByEmail: function(email) {
        const users = this.getUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    },

    // ── Session Management ───────────────────────────────────────────────────

    getCurrentUser: function() {
        const data = localStorage.getItem('currentUser') || localStorage.getItem('aurelis_current_user');
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object' && parsed.email) {
                // Ensure id field is populated
                if (!parsed.id) parsed.id = parsed.email;
                // Keep keys synced
                localStorage.setItem('currentUser', JSON.stringify(parsed));
                localStorage.setItem('aurelis_current_user', JSON.stringify(parsed));
                return parsed;
            }
            return null;
        } catch (e) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('aurelis_current_user');
            return null;
        }
    },

    setCurrentUser: function(user) {
        if (!user) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('aurelis_current_user');
        } else {
            const payload = {
                id: user.id || user.email,
                name: user.name,
                email: user.email
            };
            localStorage.setItem('currentUser', JSON.stringify(payload));
            localStorage.setItem('aurelis_current_user', JSON.stringify(payload));
        }
    },

    clearSession: function() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('aurelis_current_user');
    },

    // ── Transaction Management ────────────────────────────────────────────────

    getAllTransactions: function() {
        const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    },

    saveAllTransactions: function(transactions) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    getTransactionsForUser: function(userId) {
        const all = this.getAllTransactions();
        if (!userId) return all;
        return all.filter(tx => tx.userId === userId);
    },

    getTransactionById: function(txId) {
        const all = this.getAllTransactions();
        return all.find(tx => tx.id === txId) || null;
    },

    addTransactionForUser: function(transaction) {
        const all = this.getAllTransactions();
        const currentUser = this.getCurrentUser();
        if (!transaction.userId && currentUser) {
            transaction.userId = currentUser.email;
        }
        all.unshift(transaction);
        this.saveAllTransactions(all);
    },

    updateTransaction: function(updatedTx) {
        const all = this.getAllTransactions();
        const index = all.findIndex(tx => tx.id === updatedTx.id);
        if (index !== -1) {
            all[index] = { ...all[index], ...updatedTx };
            this.saveAllTransactions(all);
            return true;
        }
        return false;
    },

    deleteTransaction: function(txId) {
        const all = this.getAllTransactions();
        const filtered = all.filter(tx => tx.id !== txId);
        this.saveAllTransactions(filtered);
    },

    clearUserTransactions: function(userId) {
        const all = this.getAllTransactions();
        const filtered = all.filter(tx => tx.userId !== userId);
        this.saveAllTransactions(filtered);
    },

    // ── Settings Management ──────────────────────────────────────────────────

    getSettings: function() {
        const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    },

    saveSettings: function(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },

    updateSetting: function(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
    },

    // ── Demo Seed Data & Initial JSON Loading ─────────────────────────────────

    loadInitialDataset: async function(userId = DEMO_USER.email) {
        try {
            const response = await fetch('data/transactions.json');
            if (response.ok) {
                const initialTxns = await response.json();
                const userTxns = initialTxns.map(tx => ({
                    ...tx,
                    userId: userId,
                    timestamp: tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now())
                }));
                const all = this.getAllTransactions();
                const remaining = all.filter(tx => tx.userId !== userId);
                this.saveAllTransactions([...userTxns, ...remaining]);
                return userTxns;
            }
        } catch (e) {
            console.warn('Initial JSON load fallback to procedural seed', e);
        }
        return this.seedDemoDataForUser(userId);
    },

    seedDemoDataForUser: function(userId) {
        const categories = [
            { cat: 'Food', mean: 235, std: 25, count: 12 },
            { cat: 'Transport', mean: 140, std: 15, count: 8 },
            { cat: 'Shopping', mean: 850, std: 60, count: 7 },
            { cat: 'Bills', mean: 1240, std: 85, count: 5 },
            { cat: 'Entertainment', mean: 375, std: 20, count: 5 },
            { cat: 'Subscriptions', mean: 499, std: 5, count: 4 },
            { cat: 'Travel', mean: 485, std: 30, count: 6 },
            { cat: 'Healthcare', mean: 320, std: 25, count: 4 }
        ];

        const seeded = [];
        const now = Date.now();
        let idCounter = 1;

        categories.forEach(profile => {
            for (let i = 0; i < profile.count; i++) {
                const daysAgo = Math.floor(Math.random() * 30) + 1;
                const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
                
                // Normal variation
                const u1 = Math.random() || 0.5, u2 = Math.random() || 0.5;
                const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                let amount = Math.max(50, Math.round(profile.mean + z0 * profile.std));

                seeded.push({
                    id: `TXN-${Date.now()}-${idCounter++}`,
                    userId: userId,
                    amount: amount,
                    category: profile.cat,
                    description: `${profile.cat} Routine Transaction`,
                    date: d.toISOString().split('T')[0],
                    timestamp: d.getTime()
                });
            }
        });

        // Add 3 intentional statistical anomalies
        const d1 = new Date(now - 2 * 24 * 60 * 60 * 1000);
        seeded.push({
            id: `TXN-${Date.now()}-ANOM-1`,
            userId: userId,
            amount: 1850, // Mean is 235, Std is 25 -> Z > 60!
            category: 'Food',
            description: 'Luxury Restaurant Dinner (Outlier)',
            date: d1.toISOString().split('T')[0],
            timestamp: d1.getTime()
        });

        const d2 = new Date(now - 5 * 24 * 60 * 60 * 1000);
        seeded.push({
            id: `TXN-${Date.now()}-ANOM-2`,
            userId: userId,
            amount: 4500, // Mean is 850, Std is 60 -> Z > 60!
            category: 'Shopping',
            description: 'Designer Electronics Purchase (Outlier)',
            date: d2.toISOString().split('T')[0],
            timestamp: d2.getTime()
        });

        const d3 = new Date(now - 8 * 24 * 60 * 60 * 1000);
        seeded.push({
            id: `TXN-${Date.now()}-ANOM-3`,
            userId: userId,
            amount: 2100, // Mean is 485, Std is 30 -> Z > 50!
            category: 'Travel',
            description: 'Flight Booking (Outlier)',
            date: d3.toISOString().split('T')[0],
            timestamp: d3.getTime()
        });

        // Save to LocalStorage
        const all = this.getAllTransactions();
        const remaining = all.filter(tx => tx.userId !== userId);
        this.saveAllTransactions([...seeded, ...remaining]);
        return seeded;
    },

    // ── Backwards-compatible aliases ─────────────────────────────────────────

    getTransactions: function() {
        const user = this.getCurrentUser();
        if (user) return this.getTransactionsForUser(user.email);
        return this.getAllTransactions();
    },

    saveTransactions: function(transactions) {
        this.saveAllTransactions(transactions);
    },

    isFirstLaunch: function() {
        return this.getAllTransactions().length === 0;
    }
};

window.StorageModule = StorageModule;
window.STORAGE_KEYS = STORAGE_KEYS;
