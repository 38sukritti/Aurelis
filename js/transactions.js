/* =============================================================================
   COMMIT NO. 15
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(transactions): transaction CRUD helpers, validation and category tagging
   ============================================================================= */

'use strict';

const CATEGORIES = [
    'Food',
    'Travel',
    'Shopping',
    'Bills',
    'Entertainment',
    'Healthcare',
    'Education',
    'Transport',
    'Subscriptions',
    'Other'
];

const TransactionsModule = {
    CATEGORIES,

    getCategorySummary: function(transactions) {
        const totals = {};
        const counts = {};

        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            totals[cat] = (totals[cat] || 0) + (parseFloat(tx.amount) || 0);
            counts[cat] = (counts[cat] || 0) + 1;
        });

        return Object.keys(totals)
            .map(category => ({
                category,
                total: totals[category],
                count: counts[category]
            }))
            .sort((a, b) => b.total - a.total);
    },

    filterByCategory: function(transactions, category) {
        if (!category) return transactions;
        return transactions.filter(tx => tx.category === category);
    },

    createTransaction: function(userId, amount, category, description, dateStr) {
        const dateObj = dateStr ? new Date(dateStr) : new Date();
        return {
            id: window.Utils ? window.Utils.generateId('TXN') : `TXN-${Date.now()}`,
            userId: userId,
            amount: parseFloat(amount),
            category: category || 'Other',
            description: description || 'Expense',
            date: dateObj.toISOString().split('T')[0],
            timestamp: dateObj.getTime()
        };
    }
};

window.TransactionsModule = TransactionsModule;
