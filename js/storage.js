/* =============================================================================
   COMMIT NO. 02
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(storage): implement LocalStorage schema, user session and transaction persistence
   -----------------------------------------------------------------------------
   Phase 2: data now lives in MongoDB behind the AURELIS REST API.

   The rest of the app reads data synchronously (router, charts, analytics),
   so this module keeps an in-memory copy of the user's transactions and
   settings. loadUserData() fills it from the API once when the app starts.
   Every write goes to the API first and only updates the copy after the
   server has confirmed the save, so the UI never shows unsaved data.
   ============================================================================= */

'use strict';

const STORAGE_KEYS = {
    // Phase 1 keys, still read once for the one-time migration.
    TRANSACTIONS: 'aurelis_transactions',
    SETTINGS:     'aurelis_settings',
    USERS:        'aurelis_users',
    // Only the public profile (id, name, email) is kept in the browser, so the
    // pages can greet the user before the API responds. Never a password.
    CURRENT_USER: 'currentUser',
    LEGACY_IMPORT_DONE: 'aurelis_legacy_import_done'
};

const DEFAULT_SETTINGS = {
    zScoreThreshold: 3.0
};

let cachedTransactions = [];
let cachedSettings = { ...DEFAULT_SETTINGS };

// Newest first, the same order the API returns.
const sortNewestFirst = (transactions) => {
    return transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

const StorageModule = {

    // ── Session Management ───────────────────────────────────────────────────

    getCurrentUser: function() {
        if (!window.ApiClient.getToken()) return null;

        const data = localStorage.getItem('currentUser') || localStorage.getItem('aurelis_current_user');
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            return (parsed && typeof parsed === 'object' && parsed.email) ? parsed : null;
        } catch (e) {
            this.clearSession();
            return null;
        }
    },

    setCurrentUser: function(user) {
        if (!user) {
            this.clearSession();
            return;
        }
        const payload = { id: user.id, name: user.name, email: user.email };
        // Both keys are written because the inline scripts in the HTML pages read either one.
        localStorage.setItem('currentUser', JSON.stringify(payload));
        localStorage.setItem('aurelis_current_user', JSON.stringify(payload));
    },

    clearSession: function() {
        window.ApiClient.setToken(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('aurelis_current_user');
        cachedTransactions = [];
        cachedSettings = { ...DEFAULT_SETTINGS };
    },

    startSession: function(sessionData) {
        window.ApiClient.setToken(sessionData.token);
        this.setCurrentUser(sessionData.user);
        return sessionData.user;
    },

    // ── Authentication (backend) ─────────────────────────────────────────────

    login: async function(email, password) {
        const response = await window.ApiClient.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        return this.startSession(response.data);
    },

    register: async function(name, email, password) {
        const response = await window.ApiClient.request('/auth/register', {
            method: 'POST',
            body: { name, email, password }
        });
        return this.startSession(response.data);
    },

    demoLogin: async function() {
        const response = await window.ApiClient.request('/auth/demo', { method: 'POST' });
        return this.startSession(response.data);
    },

    // Requests that need a logged-in user. An expired or invalid token sends
    // the user back to the login page instead of showing an empty dashboard.
    authorizedRequest: async function(path, options) {
        try {
            return await window.ApiClient.request(path, options);
        } catch (error) {
            if (error.status === 401) {
                this.clearSession();
                window.location.replace('login.html');
            }
            throw error;
        }
    },

    // Loads the user's profile, transactions and settings from the API.
    // Must finish before the router renders anything.
    loadUserData: async function() {
        const [meResponse, transactionsResponse, settingsResponse] = await Promise.all([
            this.authorizedRequest('/auth/me'),
            this.authorizedRequest('/transactions'),
            this.authorizedRequest('/settings')
        ]);

        this.setCurrentUser(meResponse.data.user);
        cachedTransactions = transactionsResponse.data;
        cachedSettings = { ...DEFAULT_SETTINGS, ...settingsResponse.data };
        return meResponse.data.user;
    },

    // ── Transaction Management ────────────────────────────────────────────────
    // Reads come from the in-memory copy. The userId arguments are kept so
    // existing callers don't change; the server already scopes everything
    // to the logged-in user.

    getAllTransactions: function() {
        return cachedTransactions.slice();
    },

    getTransactionsForUser: function(userId) {
        return this.getAllTransactions();
    },

    getTransactionById: function(txId) {
        return cachedTransactions.find(tx => tx.id === txId) || null;
    },

    addTransactionForUser: async function(transaction) {
        const response = await this.authorizedRequest('/transactions', {
            method: 'POST',
            body: transaction
        });
        cachedTransactions = sortNewestFirst([response.data, ...cachedTransactions]);
        return response.data;
    },

    updateTransaction: async function(updatedTx) {
        const { id, userId, timestamp, ...fields } = updatedTx;
        const response = await this.authorizedRequest(`/transactions/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: fields
        });
        cachedTransactions = sortNewestFirst(cachedTransactions.map(tx => tx.id === id ? response.data : tx));
        return response.data;
    },

    deleteTransaction: async function(txId) {
        await this.authorizedRequest(`/transactions/${encodeURIComponent(txId)}`, { method: 'DELETE' });
        cachedTransactions = cachedTransactions.filter(tx => tx.id !== txId);
    },

    clearUserTransactions: async function(userId) {
        await this.authorizedRequest('/transactions', { method: 'DELETE' });
        cachedTransactions = [];
    },

    // Sends parsed CSV rows to the server, which validates every row and
    // skips rows that were already imported. Resolves with the import summary.
    importTransactions: async function(transactions, source = 'csv') {
        const response = await this.authorizedRequest('/transactions/import', {
            method: 'POST',
            body: { transactions, source }
        });
        const summary = response.data;
        cachedTransactions = sortNewestFirst([...summary.transactions, ...cachedTransactions]);
        return summary;
    },

    // Replaces the user's previous demo rows with a fresh sample dataset.
    loadDemoData: async function() {
        await this.authorizedRequest('/transactions/demo', { method: 'POST' });
        const response = await this.authorizedRequest('/transactions');
        cachedTransactions = response.data;
        return cachedTransactions;
    },

    // ── Settings Management ──────────────────────────────────────────────────

    getSettings: function() {
        return { ...cachedSettings };
    },

    saveSettings: async function(settings) {
        const response = await this.authorizedRequest('/settings', {
            method: 'PUT',
            body: { zScoreThreshold: settings.zScoreThreshold }
        });
        cachedSettings = { ...DEFAULT_SETTINGS, ...response.data };
        return this.getSettings();
    },

    updateSetting: async function(key, value) {
        return this.saveSettings({ ...cachedSettings, [key]: value });
    },

    // ── One-time migration of Phase 1 browser data ───────────────────────────
    // Phase 1 stored transactions in this browser, tagged with the user's
    // email. The old data is never deleted, so it stays as a backup.

    // Old rows for this email that haven't been offered for import yet.
    findLegacyTransactions: function(email) {
        const doneFor = (localStorage.getItem(STORAGE_KEYS.LEGACY_IMPORT_DONE) || '').split(',');
        if (!email || doneFor.includes(email)) return [];
        return this.readLegacyTransactions(email);
    },

    readLegacyTransactions: function(email) {
        try {
            const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
            return Array.isArray(all) ? all.filter(tx => tx && tx.userId === email) : [];
        } catch (e) {
            console.warn('Old browser transactions could not be read:', e);
            return [];
        }
    },

    // Can also be run by hand from the browser console:
    //   StorageModule.importLegacyTransactions('you@example.com')
    importLegacyTransactions: async function(email) {
        const rows = this.readLegacyTransactions(email).map(tx => ({
            // The old ID makes a retried migration skip rows that already made it.
            importRef: tx.id ? `legacy:${tx.id}` : undefined,
            amount: tx.amount,
            category: tx.category,
            merchant: tx.merchant,
            description: tx.description,
            date: tx.date || (tx.timestamp ? new Date(tx.timestamp).toISOString().split('T')[0] : undefined),
            paymentMethod: tx.paymentMethod,
            recurring: typeof tx.recurring === 'boolean' ? tx.recurring : undefined,
            notes: tx.notes
        }));

        const summary = await this.importTransactions(rows, 'legacy');
        this.markLegacyImportDone(email);
        return summary;
    },

    markLegacyImportDone: function(email) {
        const doneFor = (localStorage.getItem(STORAGE_KEYS.LEGACY_IMPORT_DONE) || '').split(',').filter(Boolean);
        if (!doneFor.includes(email)) doneFor.push(email);
        localStorage.setItem(STORAGE_KEYS.LEGACY_IMPORT_DONE, doneFor.join(','));
    },

    // ── Backwards-compatible aliases ─────────────────────────────────────────

    getTransactions: function() {
        return this.getAllTransactions();
    },

    isFirstLaunch: function() {
        return cachedTransactions.length === 0;
    }
};

window.StorageModule = StorageModule;
window.STORAGE_KEYS = STORAGE_KEYS;
