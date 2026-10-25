import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { parseDate, parseTransactionInput } from '../utils/transactionInput.js';
import { buildDemoTransactions } from '../utils/demoTransactions.js';

const MAX_IMPORT_ROWS = 5000;
const MAX_PAGE_SIZE = 500;
const MAX_REPORTED_ERRORS = 20;

// Every lookup includes the logged-in user's ID, so a transaction that
// belongs to someone else behaves exactly like one that doesn't exist.
function findOwnedTransaction(transactionId, userId) {
    if (!mongoose.isValidObjectId(transactionId)) return null;
    return Transaction.findOne({ _id: transactionId, userId });
}

function sendNotFound(res) {
    res.status(404).json({ success: false, message: 'Transaction not found.' });
}

function sendValidationErrors(res, errors) {
    res.status(400).json({ success: false, message: errors[0], errors });
}

// GET /api/transactions
// Optional filters: ?category=Food&from=2026-08-01&to=2026-08-31
// Optional paging:  ?page=1&limit=50
// Without `limit` the full history is returned, because the anomaly
// engine in the browser needs every transaction to build its baselines.
export async function listTransactions(req, res) {
    const filter = { userId: req.user._id };
    const { category, from, to } = req.query;

    if (typeof category === 'string' && category.trim()) {
        filter.category = category.trim();
    }

    if (from !== undefined || to !== undefined) {
        const fromDate = from !== undefined ? parseDate(from) : null;
        const toDate = to !== undefined ? parseDate(to) : null;

        if ((from !== undefined && !fromDate) || (to !== undefined && !toDate)) {
            return sendValidationErrors(res, ['from and to must be dates in YYYY-MM-DD format.']);
        }

        filter.date = {};
        if (fromDate) filter.date.$gte = fromDate;
        if (toDate) filter.date.$lte = toDate;
    }

    const query = Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    if (req.query.limit === undefined) {
        const transactions = await query;
        return res.json({ success: true, count: transactions.length, data: transactions });
    }

    const limit = Number(req.query.limit);
    const page = req.query.page === undefined ? 1 : Number(req.query.page);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE || !Number.isInteger(page) || page < 1) {
        return sendValidationErrors(res, [`page must be 1 or more and limit must be between 1 and ${MAX_PAGE_SIZE}.`]);
    }

    const [transactions, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Transaction.countDocuments(filter)
    ]);

    res.json({
        success: true,
        count: transactions.length,
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
}

// GET /api/transactions/:id
export async function getTransaction(req, res) {
    const transaction = await findOwnedTransaction(req.params.id, req.user._id);
    if (!transaction) return sendNotFound(res);

    res.json({ success: true, data: transaction });
}

// POST /api/transactions
export async function createTransaction(req, res) {
    const { values, errors } = parseTransactionInput(req.body);
    if (errors.length > 0) return sendValidationErrors(res, errors);

    const transaction = await Transaction.create({ ...values, userId: req.user._id, source: 'manual' });

    res.status(201).json({ success: true, message: 'Transaction created.', data: transaction });
}

// PUT /api/transactions/:id
// Accepts any subset of the transaction fields.
export async function updateTransaction(req, res) {
    const { values, errors } = parseTransactionInput(req.body, { partial: true });
    if (errors.length > 0) return sendValidationErrors(res, errors);

    const transaction = await findOwnedTransaction(req.params.id, req.user._id);
    if (!transaction) return sendNotFound(res);

    transaction.set(values);
    await transaction.save();

    res.json({ success: true, message: 'Transaction updated.', data: transaction });
}

// DELETE /api/transactions/:id
export async function deleteTransaction(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return sendNotFound(res);

    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return sendNotFound(res);

    res.json({ success: true, message: 'Transaction deleted.', data: { id: deleted.id } });
}

// DELETE /api/transactions
// Used by "Clear All My Transactions" on the Settings page.
export async function deleteAllTransactions(req, res) {
    const result = await Transaction.deleteMany({ userId: req.user._id });

    res.json({ success: true, message: 'All your transactions have been cleared.', data: { deletedCount: result.deletedCount } });
}

// Rows without their own ID (e.g. a CSV with no Transaction_ID column)
// get a reference built from their contents. The counter keeps genuinely
// repeated rows in one file, like two identical coffees on the same day.
function buildRowReference(values, seenCounts) {
    const merchant = (values.merchant || values.description || '').toLowerCase();
    const base = `${values.date.toISOString().slice(0, 10)}|${values.amount}|${values.category.toLowerCase()}|${merchant}`;
    const occurrence = (seenCounts.get(base) || 0) + 1;
    seenCounts.set(base, occurrence);
    return `row:${base}#${occurrence}`;
}

// POST /api/transactions/import
// Body: { "transactions": [ ...rows ], "source": "csv" | "legacy" }
// The browser parses the CSV file with the existing js/csv.js and sends the
// rows here; every row is validated again on the server. Importing the same
// file twice does not create duplicates (see importRef in the model).
export async function importTransactions(req, res) {
    const rows = req.body?.transactions;
    const source = req.body?.source === 'legacy' ? 'legacy' : 'csv';

    if (!Array.isArray(rows) || rows.length === 0) {
        return sendValidationErrors(res, ['Send a non-empty "transactions" array.']);
    }
    if (rows.length > MAX_IMPORT_ROWS) {
        return sendValidationErrors(res, [`You can import at most ${MAX_IMPORT_ROWS} transactions at a time.`]);
    }

    const rowErrors = [];
    const readyToInsert = [];
    const referencesInFile = new Set();
    const seenCounts = new Map();
    let duplicateCount = 0;

    rows.forEach((row, index) => {
        const { values, errors } = parseTransactionInput(row);
        if (errors.length > 0) {
            rowErrors.push({ row: index + 1, errors });
            return;
        }

        const ownReference = typeof row.importRef === 'string' ? row.importRef.trim().slice(0, 200) : '';
        const importRef = ownReference || buildRowReference(values, seenCounts);

        if (referencesInFile.has(importRef)) {
            duplicateCount++;
            return;
        }
        referencesInFile.add(importRef);

        // Ownership always comes from the token, never from the file.
        readyToInsert.push({ ...values, userId: req.user._id, source, importRef });
    });

    if (readyToInsert.length === 0 && duplicateCount === 0) {
        return res.status(400).json({
            success: false,
            message: 'None of the rows could be imported.',
            errors: rowErrors.slice(0, MAX_REPORTED_ERRORS)
        });
    }

    const alreadyImported = new Set(await Transaction.distinct('importRef', {
        userId: req.user._id,
        importRef: { $in: [...referencesInFile] }
    }));

    const newRows = readyToInsert.filter((row) => !alreadyImported.has(row.importRef));
    duplicateCount += readyToInsert.length - newRows.length;

    const inserted = newRows.length > 0 ? await Transaction.insertMany(newRows) : [];

    res.status(inserted.length > 0 ? 201 : 200).json({
        success: true,
        message: `Imported ${inserted.length} transaction(s).`,
        data: {
            importedCount: inserted.length,
            duplicateCount,
            invalidCount: rowErrors.length,
            errors: rowErrors.slice(0, MAX_REPORTED_ERRORS),
            transactions: inserted
        }
    });
}

// POST /api/transactions/demo
// Loads the demo dataset into the logged-in account. Previous demo rows are
// replaced; transactions the user added or imported are left alone.
export async function loadDemoTransactions(req, res) {
    await Transaction.deleteMany({ userId: req.user._id, source: 'demo' });
    const inserted = await Transaction.insertMany(buildDemoTransactions(req.user._id));

    res.status(201).json({ success: true, message: 'Sample dataset loaded.', count: inserted.length, data: inserted });
}

function toCsvCell(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// GET /api/transactions/export
// Same columns as the "Export CSV" button, so the file can be re-imported.
export async function exportTransactions(req, res) {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 });

    const header = ['date', 'merchant', 'category', 'amount', 'paymentMethod', 'recurring', 'notes'];
    const lines = transactions.map((tx) => {
        const row = tx.toJSON();
        return [
            row.date,
            row.merchant || row.description,
            row.category,
            row.amount,
            row.paymentMethod,
            row.recurring ? 'true' : 'false',
            row.notes || row.description
        ].map(toCsvCell).join(',');
    });

    const fileName = `aurelis_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send([header.join(','), ...lines].join('\n'));
}
