/* =============================================================================
   COMMIT NO. 11
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(csv): intelligent CSV parsing, flexible column mapping and batch transaction import
   ============================================================================= */

'use strict';

/**
 * Intelligent CSV text parser supporting various column header formats and dates
 */
const parseCSVText = (csvText, userId) => {
    if (!csvText || !csvText.trim()) {
        return { valid: [], invalidCount: 0, errors: ['CSV content is empty.'] };
    }

    const lines = csvText.trim().split(/\r\n|\r|\n/);
    const errors = [];

    if (lines.length < 2) {
        return { valid: [], invalidCount: 0, errors: ['CSV must have a header row and at least one transaction row.'] };
    }

    // Split CSV line respecting quotes
    const splitCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' || char === "'") {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        return result;
    };

    // Parse header row and create flexible mapping
    const rawHeaders = splitCSVLine(lines[0]);
    const headers = rawHeaders.map(h => h.toLowerCase().trim());

    // Map common aliases
    const findHeaderIndex = (aliases) => {
        for (const alias of aliases) {
            const idx = headers.findIndex(h => h === alias || h.replace(/[^a-z0-9]/g, '') === alias.replace(/[^a-z0-9]/g, ''));
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const dateIdx = findHeaderIndex(['date', 'transaction_date', 'tx_date', 'timestamp', 'datetime', 'time']);
    const amountIdx = findHeaderIndex(['amount', 'amt', 'cost', 'price', 'total', 'value', 'transaction_amount']);
    const categoryIdx = findHeaderIndex(['category', 'cat', 'spending_category', 'category_name', 'type']);
    const merchantIdx = findHeaderIndex(['merchant', 'merchant_name', 'description', 'desc', 'details', 'name', 'location', 'customer_id']);
    const idIdx = findHeaderIndex(['transaction_id', 'tx_id', 'id', 'txn_id', 'reference']);
    const paymentMethodIdx = findHeaderIndex(['payment_method', 'paymentmethod', 'method', 'payment_type', 'mode']);
    const recurringIdx = findHeaderIndex(['recurring', 'is_recurring', 'isrecurring']);
    const isAnomalyIdx = findHeaderIndex(['is_anomaly', 'isanomaly', 'anomaly', 'outlier']);
    const anomalyTypeIdx = findHeaderIndex(['anomaly_type', 'anomalytype', 'notes', 'reason']);

    if (dateIdx === -1 || amountIdx === -1) {
        return { 
            valid: [], 
            invalidCount: 0, 
            errors: ['Missing essential CSV columns. Please include at least "Date" and "Amount" columns.'] 
        };
    }

    const valid = [];
    let invalidCount = 0;
    const now = Date.now();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = splitCSVLine(line);
        if (cols.length < 2) {
            invalidCount++;
            continue;
        }

        // Parse date
        const rawDate = cols[dateIdx] || '';
        let dateStr = '';
        let timestamp = now;

        // Try standard ISO or replace space with T
        let parsedDate = new Date(rawDate.replace(' ', 'T'));
        if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(rawDate);
        }

        if (!isNaN(parsedDate.getTime())) {
            dateStr = parsedDate.toISOString().split('T')[0];
            timestamp = parsedDate.getTime();
        } else {
            // Fallback for YYYY-MM-DD or DD/MM/YYYY
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].split(' ')[0].padStart(2, '0')}`;
                } else if (parts[2].length === 4) {
                    dateStr = `${parts[2].split(' ')[0]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                const testD = new Date(dateStr);
                if (!isNaN(testD.getTime())) timestamp = testD.getTime();
            }
        }

        if (!dateStr) {
            dateStr = new Date().toISOString().split('T')[0];
        }

        // Parse amount
        const rawAmount = (cols[amountIdx] || '').replace(/[$,₹€£]/g, '').trim();
        const amount = parseFloat(rawAmount);

        if (isNaN(amount) || amount <= 0) {
            invalidCount++;
            errors.push(`Row ${i + 1}: invalid or zero amount "${cols[amountIdx]}".`);
            continue;
        }

        // Category
        let category = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx].trim() : 'Other';
        if (!category) category = 'Other';

        // Merchant / Description
        let merchant = merchantIdx !== -1 && cols[merchantIdx] ? cols[merchantIdx].trim() : '';
        if (!merchant) {
            merchant = `${category} Purchase`;
        }

        // Payment Method
        let paymentMethod = paymentMethodIdx !== -1 && cols[paymentMethodIdx] ? cols[paymentMethodIdx].trim() : 'Credit Card';

        // Recurring
        let recurring = false;
        if (recurringIdx !== -1) {
            const recVal = (cols[recurringIdx] || '').toLowerCase();
            recurring = recVal === 'true' || recVal === '1' || recVal === 'yes';
        }

        // Custom Transaction ID
        const customId = idIdx !== -1 && cols[idIdx] ? cols[idIdx].trim() : `TXN-${Date.now()}-${i}`;

        // Anomaly properties if present in CSV
        const isAnom = isAnomalyIdx !== -1 ? (cols[isAnomalyIdx] === '1' || cols[isAnomalyIdx].toLowerCase() === 'true') : false;
        const notes = anomalyTypeIdx !== -1 && cols[anomalyTypeIdx] ? cols[anomalyTypeIdx].trim() : '';

        valid.push({
            id: customId,
            userId: userId,
            amount: amount,
            category: category,
            merchant: merchant,
            description: merchant,
            paymentMethod: paymentMethod,
            recurring: recurring,
            date: dateStr,
            timestamp: timestamp,
            isAnomaly: isAnom,
            notes: notes
        });
    }

    return { valid, invalidCount, errors };
};

const handleFileImport = (e, userId, onSuccess) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            const csvText = event.target.result;
            const { valid, invalidCount, errors } = parseCSVText(csvText, userId);

            if (valid.length === 0) {
                window.Utils.showToast(errors[0] || 'No valid transactions found in CSV.', 'danger');
                return;
            }

            // Save transactions to user storage
            const currentTxs = window.StorageModule.getTransactionsForUser(userId) || [];
            const all = window.StorageModule.getAllTransactions();
            const otherUserTxs = all.filter(tx => tx.userId !== userId);
            
            window.StorageModule.saveAllTransactions([...valid, ...currentTxs, ...otherUserTxs]);

            let msg = `Successfully imported ${valid.length} transaction${valid.length > 1 ? 's' : ''}!`;
            if (invalidCount > 0) {
                msg += ` (${invalidCount} invalid rows skipped)`;
            }
            window.Utils.showToast(msg, 'success');

            if (typeof onSuccess === 'function') {
                onSuccess(valid);
            }
        } catch (err) {
            console.error(err);
            window.Utils.showToast('Failed to parse CSV file: ' + err.message, 'danger');
        }
    };

    reader.onerror = () => {
        window.Utils.showToast('Error reading file. Please try again.', 'danger');
    };

    reader.readAsText(file);
};

const downloadSampleCSV = () => {
    const sampleRows = [
        'Transaction_ID,Date,Amount,Category,Merchant,Payment_Method',
        'TXN001,2026-08-01,350,Food,Starbucks Coffee,Debit Card',
        'TXN002,2026-08-02,420,Food,Local Diner Lunch,UPI',
        'TXN003,2026-08-03,390,Food,Bistro Cafe,Credit Card',
        'TXN004,2026-08-04,180,Travel,Metro Smartcard Recharge,Debit Card',
        'TXN005,2026-08-05,220,Travel,Uber Ride,UPI',
        'TXN006,2026-08-06,190,Travel,City Cab,Debit Card',
        'TXN007,2026-08-07,1800,Shopping,Zara Formal Shirt,Credit Card',
        'TXN008,2026-08-08,2100,Shopping,Nike Running Shoes,Credit Card',
        'TXN009,2026-08-09,1450,Utilities,Airtel Broadband,Net Banking',
        'TXN010,2026-08-10,2200,Utilities,Electricity Bill,UPI',
        'TXN011,2026-08-11,499,Subscriptions,Spotify Family Plan,Credit Card',
        'TXN012,2026-08-12,649,Subscriptions,Netflix Premium,Credit Card',
        'TXN013,2026-08-13,600,Entertainment,PVR Cinema Tickets,UPI',
        'TXN014,2026-08-14,6800,Food,Luxury Hotel Dinner (Outlier),Credit Card',
        'TXN015,2026-08-15,38500,Shopping,High-End Electronics (Outlier),Credit Card'
    ];

    const blob = new Blob([sampleRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'aurelis_sample_transactions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.Utils.showToast('Sample CSV downloaded! Import it to test anomaly detection.', 'info');
};

const CSVModule = {
    parseCSVText,
    handleFileImport,
    downloadSampleCSV
};

window.CSVModule = CSVModule;
