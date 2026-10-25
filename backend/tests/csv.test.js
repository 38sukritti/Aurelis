import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDatabase, stopTestDatabase, registerUser, authHeader } from './testSetup.js';

// Rows in the shape js/csv.js produces after parsing a CSV file.
const csvRows = [
    { importRef: 'TXN001', date: '2026-08-01', amount: 350, category: 'Food', merchant: 'Starbucks Coffee', description: 'Starbucks Coffee', paymentMethod: 'Debit Card' },
    { importRef: 'TXN002', date: '2026-08-02', amount: 420, category: 'Food', merchant: 'Local Diner Lunch', description: 'Local Diner Lunch', paymentMethod: 'UPI' },
    { importRef: 'TXN003', date: '2026-08-07', amount: 1800, category: 'Shopping', merchant: 'Zara, "Formal" Shirt', description: 'Zara Formal Shirt', paymentMethod: 'Credit Card' }
];

describe('CSV import and export', () => {
    let app;
    let alice;
    let bob;

    before(async () => {
        app = await startTestDatabase();
        alice = await registerUser(app);
        bob = await registerUser(app);
    });

    after(stopTestDatabase);

    function importFor(user, transactions) {
        return request(app).post('/api/transactions/import').set(authHeader(user.token)).send({ transactions });
    }

    it('imports valid rows and assigns them to the logged-in user', async () => {
        const rowsClaimingBob = csvRows.map((row) => ({ ...row, userId: bob.user.id }));
        const response = await importFor(alice, rowsClaimingBob);

        assert.equal(response.status, 201);
        assert.equal(response.body.data.importedCount, 3);
        assert.ok(response.body.data.transactions.every((tx) => tx.userId === alice.user.id && tx.source === 'csv'));
    });

    it('skips rows that were already imported when the same file is imported again', async () => {
        const response = await importFor(alice, csvRows);

        assert.equal(response.status, 200);
        assert.equal(response.body.data.importedCount, 0);
        assert.equal(response.body.data.duplicateCount, 3);

        const list = await request(app).get('/api/transactions').set(authHeader(alice.token));
        assert.equal(list.body.count, 3);
    });

    it('dedupes rows without IDs on re-import but keeps repeated rows within one file', async () => {
        const noIds = [
            { date: '2026-09-01', amount: 120, category: 'Food', merchant: 'Bobs Bakery' },
            { date: '2026-09-01', amount: 120, category: 'Food', merchant: 'Bobs Bakery' }
        ];

        const first = await importFor(bob, noIds);
        assert.equal(first.body.data.importedCount, 2);

        const second = await importFor(bob, noIds);
        assert.equal(second.body.data.importedCount, 0);
        assert.equal(second.body.data.duplicateCount, 2);
    });

    it('imports the valid rows and reports the invalid ones', async () => {
        const response = await importFor(alice, [
            { importRef: 'NEW-1', date: '2026-08-20', amount: 99, category: 'Food' },
            { importRef: 'BAD-1', date: 'yesterday', amount: 99, category: 'Food' },
            { importRef: 'BAD-2', date: '2026-08-21', amount: -4, category: 'Food' }
        ]);

        assert.equal(response.status, 201);
        assert.equal(response.body.data.importedCount, 1);
        assert.equal(response.body.data.invalidCount, 2);
        assert.deepEqual(response.body.data.errors.map((error) => error.row), [2, 3]);
    });

    it('rejects an import where every row is invalid, or the body is malformed', async () => {
        const allBad = await importFor(alice, [{ amount: 'abc' }, 'not an object']);
        assert.equal(allBad.status, 400);

        const notArray = await request(app).post('/api/transactions/import').set(authHeader(alice.token)).send({ transactions: 'oops' });
        assert.equal(notArray.status, 400);

        const brokenJson = await request(app)
            .post('/api/transactions/import')
            .set(authHeader(alice.token))
            .set('Content-Type', 'application/json')
            .send('{"transactions": [');
        assert.equal(brokenJson.status, 400);
    });

    it('exports only the logged-in user\'s transactions as CSV', async () => {
        const response = await request(app).get('/api/transactions/export').set(authHeader(alice.token));

        assert.equal(response.status, 200);
        assert.match(response.headers['content-type'], /text\/csv/);

        const lines = response.text.trim().split('\n');
        assert.equal(lines[0], 'date,merchant,category,amount,paymentMethod,recurring,notes');
        assert.equal(lines.length, 1 + 4);
        assert.ok(response.text.includes('"Zara, ""Formal"" Shirt"'));
        assert.ok(!response.text.includes('Bobs Bakery'), 'Bob\'s rows must not appear in Alice\'s export');
    });
});
