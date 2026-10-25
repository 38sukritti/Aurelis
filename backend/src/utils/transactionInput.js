// Turns request data into clean transaction fields.
//
// Only the fields listed here are ever copied from the request, so a
// client cannot set things like `userId` or `source` by sending them.

const TEXT_FIELDS = {
    category: 50,
    merchant: 120,
    description: 200,
    paymentMethod: 40,
    notes: 300
};

const MAX_AMOUNT = 1000000000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

// Accepts "2026-08-14" (and longer ISO strings starting with a date) and
// stores it as midnight UTC, which is what the frontend has always used.
export function parseDate(value) {
    if (typeof value !== 'string') return null;

    const match = value.trim().match(DATE_PATTERN);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    // new Date() rolls "2026-02-31" over to March, so check it round-trips.
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) {
        return null;
    }

    if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2100) return null;

    return date;
}

function isMissing(value) {
    return value === undefined || value === null || value === '';
}

// With `partial: true` (used for updates) only the fields that were sent
// are validated; otherwise amount and date are required.
export function parseTransactionInput(input, { partial = false } = {}) {
    const values = {};
    const errors = [];

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { values, errors: ['Transaction data must be a JSON object.'] };
    }

    if (!partial || input.amount !== undefined) {
        const amount = Number(input.amount);

        if (isMissing(input.amount) || typeof input.amount === 'boolean' || !Number.isFinite(amount)) {
            errors.push('Amount must be a number.');
        } else if (amount <= 0) {
            errors.push('Amount must be greater than zero.');
        } else if (amount > MAX_AMOUNT) {
            errors.push('Amount is too large.');
        } else {
            values.amount = Math.round(amount * 100) / 100;
        }
    }

    if (!partial || input.date !== undefined) {
        const date = parseDate(input.date);

        if (!date) {
            errors.push('Date must be a valid date in YYYY-MM-DD format.');
        } else {
            values.date = date;
        }
    }

    for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
        const value = input[field];
        if (value === undefined || value === null) continue;

        if (typeof value !== 'string') {
            errors.push(`${field} must be text.`);
        } else if (value.trim().length > maxLength) {
            errors.push(`${field} must be ${maxLength} characters or fewer.`);
        } else {
            values[field] = value.trim();
        }
    }

    // Same fallback the frontend uses for transactions without a category.
    if (!values.category && (!partial || input.category !== undefined)) {
        values.category = 'Other';
    }

    if (input.recurring !== undefined) {
        if (typeof input.recurring !== 'boolean') {
            errors.push('recurring must be true or false.');
        } else {
            values.recurring = input.recurring;
        }
    }

    return { values, errors };
}
