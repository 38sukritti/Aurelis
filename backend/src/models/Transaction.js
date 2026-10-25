import mongoose from 'mongoose';

// Field names match what the existing frontend already reads
// (router.js, anomalyEngine.js, the CSV import/export), so the
// analytics work on API data without any changes.
const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required.'],
            min: [0.01, 'Amount must be greater than zero.'],
            max: [1000000000, 'Amount is too large.']
        },
        // Not an enum: the existing CSV import accepts any category name
        // (e.g. "Utilities" and "Bills" both appear in the sample data).
        category: {
            type: String,
            required: true,
            trim: true,
            default: 'Other',
            maxlength: [50, 'Category must be 50 characters or fewer.']
        },
        merchant: {
            type: String,
            trim: true,
            default: '',
            maxlength: [120, 'Merchant must be 120 characters or fewer.']
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: [200, 'Description must be 200 characters or fewer.']
        },
        date: {
            type: Date,
            required: [true, 'Date is required.']
        },
        paymentMethod: {
            type: String,
            trim: true,
            default: 'Credit Card',
            maxlength: [40, 'Payment method must be 40 characters or fewer.']
        },
        recurring: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String,
            trim: true,
            default: '',
            maxlength: [300, 'Notes must be 300 characters or fewer.']
        },
        // Where the record came from. "demo" rows can be replaced by the
        // demo loader without touching anything the user entered.
        source: {
            type: String,
            enum: ['manual', 'csv', 'demo', 'legacy'],
            default: 'manual'
        },
        // Identifier of an imported row, used to skip rows that were
        // already imported when the same file is uploaded again.
        importRef: {
            type: String,
            trim: true,
            maxlength: 200
        }
    },
    { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index(
    { userId: 1, importRef: 1 },
    { unique: true, partialFilterExpression: { importRef: { $type: 'string' } } }
);

// The frontend expects `id`, a `YYYY-MM-DD` date string and a numeric
// timestamp, exactly like the old localStorage records.
transactionSchema.set('toJSON', {
    transform: (doc, ret) => ({
        id: ret._id.toString(),
        userId: ret.userId.toString(),
        amount: ret.amount,
        category: ret.category,
        merchant: ret.merchant,
        description: ret.description,
        date: ret.date.toISOString().split('T')[0],
        timestamp: ret.date.getTime(),
        paymentMethod: ret.paymentMethod,
        recurring: ret.recurring,
        notes: ret.notes,
        source: ret.source,
        createdAt: ret.createdAt,
        updatedAt: ret.updatedAt
    })
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
