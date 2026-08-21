/* =============================================================================
   COMMIT NO. 11
   COMMIT BY: Sukritti
   COMMIT MESSAGE: feat(csv): implement CSV file parsing, validation and transaction batch import
   ============================================================================= */

'use strict';

const parseCSVText = (csvText, userId) => {
    const lines = csvText.trim().split(/\r\n|\n/);
    const errors = [];

    if (lines.length < 2) {
        return { valid: [], invalidCount: 0, errors: ['CSV must have a header row and at least one transaction row.'] };
    }

    // Parse header row
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

    // Check required columns
    const required = ['date', 'category', 'amount'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) {
        return { valid: [], invalidCount: 0, errors: [`Missing required CSV headers: ${missing.join(', ')}`] };
    }

    const valid = [];
    let invalidCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

        if (cols.length < headers.length) {
            invalidCount++;
            errors.push(`Row ${i + 1}: column count mismatch.`);
            continue;
        }

        const row = {};
        headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

        const dateObj = new Date(row['date']);
        if (isNaN(dateObj.getTime())) {
            invalidCount++;
            errors.push(`Row ${i + 1}: invalid date "${row['date']}".`);
            continue;
        }

        const amount = parseFloat(row['amount']);
        if (isNaN(amount) || amount <= 0) {
            invalidCount++;
            errors.push(`Row ${i + 1}: invalid amount "${row['amount']}".`);
            continue;
        }

        let category = row['category'] || 'Other';
        const description = row['description'] || 'CSV Import';

        valid.push({
            id: window.Utils ? window.Utils.generateId('CSV') : `CSV-${Date.now()}-${i}`,
            userId: userId,
            amount: amount,
            category: category,
            description: description,
            date: dateObj.toISOString().split('T')[0],
            timestamp: dateObj.getTime()
        });
    }

    return { valid, invalidCount, errors };
};

const handleFileImport = (e, userId, onSuccess) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
        window.Utils.showToast('Please select a valid .csv file.', 'danger');
        return;
    }

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
            const currentTxs = window.StorageModule.getAllTransactions();
            window.StorageModule.saveAllTransactions([...valid, ...currentTxs]);

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
        'date,category,amount,description',
        '2026-08-01,Food,350,Cafe Latte & Sandwich',
        '2026-08-02,Food,420,Office Lunch Box',
        '2026-08-03,Food,390,Dinner at Bistro',
        '2026-08-04,Travel,180,Metro Recharge',
        '2026-08-05,Travel,220,Cab to Client Office',
        '2026-08-06,Travel,190,Return Cab',
        '2026-08-07,Shopping,1800,Formal Shirts',
        '2026-08-08,Shopping,2100,Running Shoes',
        '2026-08-09,Bills,1450,Broadband Internet',
        '2026-08-10,Bills,2200,Electricity Bill',
        '2026-08-11,Subscriptions,499,Spotify Family Plan',
        '2026-08-12,Subscriptions,649,Netflix Premium',
        '2026-08-13,Entertainment,600,Movie Tickets',
        '2026-08-14,Food,6800,Outlier: Luxury Dinner at 5-Star Hotel',
        '2026-08-15,Shopping,38500,Outlier: High-End Electronics Purchase'
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
