/* =============================================================================
   COMMIT NO. 08
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(data): seed realistic transaction categories, baseline profiles, and synthetic generator
   ============================================================================= */

const DataModule = {
    CATEGORIES: [
        'Food', 'Transport', 'Shopping', 'Subscriptions', 
        'Entertainment', 'Utilities', 'Healthcare', 'Travel', 'Education', 'Other'
    ],
    
    // Normal spending ranges roughly (mean, std dev) for demo purposes
    CATEGORY_PROFILES: {
        'Food': { mean: 1200, std: 400, freq: 15 }, // Frequent, low/med variance
        'Transport': { mean: 500, std: 150, freq: 20 },
        'Shopping': { mean: 3000, std: 1500, freq: 5 }, // Less frequent, high variance
        'Subscriptions': { mean: 800, std: 50, freq: 4 }, // Very low variance
        'Entertainment': { mean: 1500, std: 600, freq: 3 },
        'Utilities': { mean: 2500, std: 200, freq: 2 },
        'Healthcare': { mean: 1000, std: 800, freq: 1 },
        'Travel': { mean: 8000, std: 3000, freq: 1 },
        'Education': { mean: 5000, std: 500, freq: 1 },
        'Other': { mean: 1000, std: 500, freq: 5 }
    },

    generateDemoData: function() {
        const transactions = [];
        const now = new Date();
        const totalTransactions = 100; // ~100 transactions
        
        let idCounter = 1;

        // Generate normal transactions
        for (let i = 0; i < totalTransactions - 4; i++) {
            // Pick a random category weighted by freq
            const catKeys = Object.keys(this.CATEGORY_PROFILES);
            const category = catKeys[Math.floor(Math.random() * catKeys.length)];
            const profile = this.CATEGORY_PROFILES[category];
            
            // Box-Muller transform for normal distribution
            let u1 = Math.random(), u2 = Math.random();
            let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            let amount = Math.abs(Math.round(profile.mean + z0 * profile.std));
            if (amount < 50) amount = 50 + Math.floor(Math.random() * 100); // minimum amount
            
            // Random date in last 90 days
            let daysAgo = Math.floor(Math.random() * 90);
            let txDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            
            transactions.push({
                id: `TXN-${idCounter++}-${Date.now().toString().slice(-4)}`,
                date: txDate.toISOString().split('T')[0],
                timestamp: txDate.getTime(),
                merchant: this._getRandomMerchant(category),
                category: category,
                amount: amount,
                paymentMethod: Math.random() > 0.5 ? 'Credit Card' : 'UPI',
                recurring: category === 'Subscriptions' || category === 'Utilities',
                notes: 'Generated normal'
            });
        }

        // Generate intentional anomalies to ensure Z-score algorithm picks them up
        // 1. Unusually high shopping
        transactions.push({
            id: `TXN-${idCounter++}-ANOM1`,
            date: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 2 days ago
            timestamp: now.getTime() - (2 * 24 * 60 * 60 * 1000),
            merchant: 'Apple Store',
            category: 'Shopping',
            amount: 145000, // Very high
            paymentMethod: 'Credit Card',
            recurring: false,
            notes: 'Anomaly: High Shopping'
        });

        // 2. Unusually high restaurant (Food)
        transactions.push({
            id: `TXN-${idCounter++}-ANOM2`,
            date: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            timestamp: now.getTime() - (5 * 24 * 60 * 60 * 1000),
            merchant: 'Taj Hotel Dining',
            category: 'Food',
            amount: 18500, 
            paymentMethod: 'Credit Card',
            recurring: false,
            notes: 'Anomaly: High Food'
        });

        // 3. Unusual subscription frequency (same merchant multiple times)
        transactions.push({
            id: `TXN-${idCounter++}-ANOM3`,
            date: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            timestamp: now.getTime() - (1 * 24 * 60 * 60 * 1000),
            merchant: 'AWS Cloud',
            category: 'Subscriptions',
            amount: 12000, 
            paymentMethod: 'Credit Card',
            recurring: true,
            notes: 'Anomaly: Subscription drift'
        });

        // 4. Unusual travel
        transactions.push({
            id: `TXN-${idCounter++}-ANOM4`,
            date: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            timestamp: now.getTime() - (10 * 24 * 60 * 60 * 1000),
            merchant: 'Emirates',
            category: 'Travel',
            amount: 85000, 
            paymentMethod: 'Credit Card',
            recurring: false,
            notes: 'Anomaly: High Travel'
        });

        // Sort by timestamp descending
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        return transactions;
    },

    _getRandomMerchant: function(category) {
        const merchants = {
            'Food': ['Swiggy', 'Zomato', 'Starbucks', 'McDonalds', 'Local Cafe'],
            'Transport': ['Uber', 'Ola', 'Metro', 'Indian Oil', 'Shell'],
            'Shopping': ['Amazon', 'Flipkart', 'Myntra', 'Zara', 'H&M'],
            'Subscriptions': ['Netflix', 'Spotify', 'Prime', 'Hotstar'],
            'Entertainment': ['BookMyShow', 'PVR', 'Gaming', 'Pub'],
            'Utilities': ['Bescom', 'Airtel', 'Jio', 'Water Bill'],
            'Healthcare': ['Apollo', 'PharmEasy', '1mg', 'Clinic'],
            'Travel': ['MakeMyTrip', 'Indigo', 'IRCTC', 'Airbnb'],
            'Education': ['Coursera', 'Udemy', 'College Fee'],
            'Other': ['Misc Store', 'Hardware', 'Donation']
        };
        const list = merchants[category] || merchants['Other'];
        return list[Math.floor(Math.random() * list.length)];
    },

    parseCSV: function(csvText, userId) {
        if (window.CSVModule && typeof window.CSVModule.parseCSVText === 'function') {
            const user = userId || (window.StorageModule.getCurrentUser() ? window.StorageModule.getCurrentUser().email : 'demo@aurelis.io');
            const res = window.CSVModule.parseCSVText(csvText, user);
            return { success: res.valid.length > 0, valid: res.valid, invalidCount: res.invalidCount, errors: res.errors };
        }

        const user = userId || (window.StorageModule.getCurrentUser() ? window.StorageModule.getCurrentUser().email : 'demo@aurelis.io');
        const lines = csvText.trim().split(/\r\n|\n/);
        if (lines.length < 2) return { success: false, valid: [], invalidCount: 0, error: 'Empty or invalid CSV' };

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const validTransactions = [];
        let invalidCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (row.length < 2) {
                invalidCount++;
                continue;
            }

            const tx = { 
                id: `TXN-IMP-${Date.now()}-${i}`,
                userId: user
            };
            let isValid = true;

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const value = row[j] || '';

                if (header.includes('date') || header === 'time' || header === 'datetime') {
                    const parsedD = new Date(value.replace(' ', 'T'));
                    const validD = !isNaN(parsedD.getTime()) ? parsedD : new Date(value);
                    if (isNaN(validD.getTime())) {
                        tx.date = new Date().toISOString().split('T')[0];
                        tx.timestamp = Date.now();
                    } else {
                        tx.date = validD.toISOString().split('T')[0];
                        tx.timestamp = validD.getTime();
                    }
                } else if (header.includes('amount') || header === 'cost' || header === 'price') {
                    const amt = parseFloat(value.replace(/[$,₹€£]/g, ''));
                    if (isNaN(amt) || amt <= 0) isValid = false;
                    tx.amount = amt;
                } else if (header.includes('recurring')) {
                    tx.recurring = value.toLowerCase() === 'true' || value === '1';
                } else if (header.includes('category')) {
                    tx.category = value || 'Other';
                } else if (header.includes('merchant') || header.includes('description') || header === 'details' || header === 'location') {
                    tx.merchant = value;
                    tx.description = value;
                } else if (header.includes('method')) {
                    tx.paymentMethod = value;
                }
            }

            if (!tx.merchant) tx.merchant = `${tx.category || 'Expense'} Purchase`;
            if (!tx.category) tx.category = 'Other';
            if (!tx.paymentMethod) tx.paymentMethod = 'Credit Card';

            if (isValid && tx.amount) {
                validTransactions.push(tx);
            } else {
                invalidCount++;
            }
        }

        return { success: validTransactions.length > 0, valid: validTransactions, invalidCount };
    }
};

window.DataModule = DataModule;
