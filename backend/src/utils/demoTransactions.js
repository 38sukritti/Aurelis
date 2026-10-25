// Demo dataset for presentations. This is the same generator that used to
// live in js/storage.js (seedDemoDataForUser): normal spending per
// category plus three deliberate outliers for the z-score engine to catch.

const CATEGORY_PROFILES = [
    { category: 'Food', mean: 235, std: 25, count: 12 },
    { category: 'Transport', mean: 140, std: 15, count: 8 },
    { category: 'Shopping', mean: 850, std: 60, count: 7 },
    { category: 'Bills', mean: 1240, std: 85, count: 5 },
    { category: 'Entertainment', mean: 375, std: 20, count: 5 },
    { category: 'Subscriptions', mean: 499, std: 5, count: 4 },
    { category: 'Travel', mean: 485, std: 30, count: 6 },
    { category: 'Healthcare', mean: 320, std: 25, count: 4 }
];

const OUTLIERS = [
    { daysAgo: 2, amount: 1850, category: 'Food', description: 'Luxury Restaurant Dinner (Outlier)' },
    { daysAgo: 5, amount: 4500, category: 'Shopping', description: 'Designer Electronics Purchase (Outlier)' },
    { daysAgo: 8, amount: 2100, category: 'Travel', description: 'Flight Booking (Outlier)' }
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Dates are stored as midnight UTC, like every other transaction.
function daysBeforeToday(daysAgo) {
    const today = new Date().toISOString().split('T')[0];
    return new Date(new Date(`${today}T00:00:00.000Z`).getTime() - daysAgo * DAY_IN_MS);
}

// Box-Muller transform: a normally distributed random number.
function randomNormal() {
    const u1 = Math.random() || 0.5;
    const u2 = Math.random() || 0.5;
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export function buildDemoTransactions(userId) {
    const transactions = [];

    for (const profile of CATEGORY_PROFILES) {
        for (let i = 0; i < profile.count; i++) {
            const daysAgo = Math.floor(Math.random() * 30) + 1;

            transactions.push({
                userId,
                amount: Math.max(50, Math.round(profile.mean + randomNormal() * profile.std)),
                category: profile.category,
                description: `${profile.category} Routine Transaction`,
                date: daysBeforeToday(daysAgo),
                source: 'demo'
            });
        }
    }

    for (const outlier of OUTLIERS) {
        transactions.push({
            userId,
            amount: outlier.amount,
            category: outlier.category,
            description: outlier.description,
            date: daysBeforeToday(outlier.daysAgo),
            source: 'demo'
        });
    }

    return transactions;
}
