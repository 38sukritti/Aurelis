import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import {
    startTestDatabase,
    stopTestDatabase,
    restartServer,
    registerUser,
    authHeader,
    sampleTransaction
} from './testSetup.js';

describe('Transactions', () => {
    let app;
    let alice;
    let bob;

    before(async () => {
        app = await startTestDatabase();
        alice = await registerUser(app, { name: 'Alice' });
        bob = await registerUser(app, { name: 'Bob' });
    });

    after(stopTestDatabase);

    async function createFor(user, data = sampleTransaction) {
        return request(app).post('/api/transactions').set(authHeader(user.token)).send(data);
    }

    it('creates a transaction in the shape the frontend expects', async () => {
        const response = await createFor(alice);

        assert.equal(response.status, 201);
        const tx = response.body.data;
        assert.ok(tx.id);
        assert.equal(tx.amount, 250);
        assert.equal(tx.date, '2026-08-14');
        assert.equal(tx.timestamp, new Date('2026-08-14').getTime());
        assert.equal(tx.userId, alice.user.id);
        assert.equal(tx.source, 'manual');
    });

    it('ignores a userId sent in the body', async () => {
        const response = await createFor(alice, { ...sampleTransaction, userId: bob.user.id });
        assert.equal(response.body.data.userId, alice.user.id);
    });

    it('rejects invalid transaction data', async () => {
        const badRows = [
            { ...sampleTransaction, amount: -5 },
            { ...sampleTransaction, amount: 'lots' },
            { ...sampleTransaction, date: '2026-02-31' },
            { ...sampleTransaction, date: undefined },
            { ...sampleTransaction, recurring: 'yes' },
            { ...sampleTransaction, category: 'x'.repeat(51) }
        ];

        for (const row of badRows) {
            const response = await createFor(alice, row);
            assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(row)}`);
        }
    });

    it('lists only the logged-in user\'s transactions', async () => {
        await createFor(bob, { ...sampleTransaction, merchant: 'Bob Only' });

        const aliceList = await request(app).get('/api/transactions').set(authHeader(alice.token));
        assert.equal(aliceList.status, 200);
        assert.ok(aliceList.body.data.every((tx) => tx.userId === alice.user.id));

        const bobList = await request(app).get('/api/transactions').set(authHeader(bob.token));
        assert.equal(bobList.body.count, 1);
    });

    it('supports category filters and pagination', async () => {
        await createFor(alice, { ...sampleTransaction, category: 'Travel', amount: 900 });

        const travel = await request(app).get('/api/transactions?category=Travel').set(authHeader(alice.token));
        assert.ok(travel.body.data.length >= 1);
        assert.ok(travel.body.data.every((tx) => tx.category === 'Travel'));

        const firstPage = await request(app).get('/api/transactions?limit=1&page=1').set(authHeader(alice.token));
        assert.equal(firstPage.body.data.length, 1);
        assert.ok(firstPage.body.pagination.total >= 2);
    });

    it('gets, updates and deletes an owned transaction', async () => {
        const created = await createFor(alice);
        const id = created.body.data.id;

        const fetched = await request(app).get(`/api/transactions/${id}`).set(authHeader(alice.token));
        assert.equal(fetched.status, 200);
        assert.equal(fetched.body.data.id, id);

        const updated = await request(app)
            .put(`/api/transactions/${id}`)
            .set(authHeader(alice.token))
            .send({ amount: 300, category: 'Shopping' });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.data.amount, 300);
        assert.equal(updated.body.data.category, 'Shopping');
        assert.equal(updated.body.data.merchant, 'Local Cafe');

        const badUpdate = await request(app).put(`/api/transactions/${id}`).set(authHeader(alice.token)).send({ amount: 0 });
        assert.equal(badUpdate.status, 400);

        const deleted = await request(app).delete(`/api/transactions/${id}`).set(authHeader(alice.token));
        assert.equal(deleted.status, 200);

        const gone = await request(app).get(`/api/transactions/${id}`).set(authHeader(alice.token));
        assert.equal(gone.status, 404);
    });

    it('stops one user from reading, editing or deleting another user\'s transaction', async () => {
        const created = await createFor(alice);
        const id = created.body.data.id;

        const read = await request(app).get(`/api/transactions/${id}`).set(authHeader(bob.token));
        const edit = await request(app).put(`/api/transactions/${id}`).set(authHeader(bob.token)).send({ amount: 1 });
        const remove = await request(app).delete(`/api/transactions/${id}`).set(authHeader(bob.token));

        assert.equal(read.status, 404);
        assert.equal(edit.status, 404);
        assert.equal(remove.status, 404);

        const stillThere = await request(app).get(`/api/transactions/${id}`).set(authHeader(alice.token));
        assert.equal(stillThere.body.data.amount, 250);
    });

    it('returns 404 for a malformed transaction id', async () => {
        const response = await request(app).get('/api/transactions/not-a-real-id').set(authHeader(alice.token));
        assert.equal(response.status, 404);
    });

    it('requires authentication', async () => {
        const response = await request(app).get('/api/transactions');
        assert.equal(response.status, 401);
    });

    it('keeps transactions after a server restart', async () => {
        const created = await createFor(alice, { ...sampleTransaction, merchant: 'Survives Restart' });

        app = await restartServer();

        const fetched = await request(app).get(`/api/transactions/${created.body.data.id}`).set(authHeader(alice.token));
        assert.equal(fetched.status, 200);
        assert.equal(fetched.body.data.merchant, 'Survives Restart');
    });

    it('reports a failed save when the database is down instead of a success', async () => {
        await mongoose.disconnect();

        const response = await createFor(alice);
        assert.equal(response.status, 503);
        assert.equal(response.body.success, false);

        const health = await request(app).get('/api/health');
        assert.equal(health.status, 503);
        assert.equal(health.body.database, 'disconnected');

        app = await restartServer();
        const healthAfter = await request(app).get('/api/health');
        assert.equal(healthAfter.status, 200);
        assert.equal(healthAfter.body.status, 'ok');
    });

    it('clears all of a user\'s transactions without touching other users', async () => {
        const before = await request(app).get('/api/transactions').set(authHeader(bob.token));
        assert.ok(before.body.count > 0);

        const cleared = await request(app).delete('/api/transactions').set(authHeader(alice.token));
        assert.equal(cleared.status, 200);

        const aliceList = await request(app).get('/api/transactions').set(authHeader(alice.token));
        const bobList = await request(app).get('/api/transactions').set(authHeader(bob.token));
        assert.equal(aliceList.body.count, 0);
        assert.equal(bobList.body.count, before.body.count);
    });

    it('loads demo data and replaces only earlier demo rows', async () => {
        await createFor(alice, { ...sampleTransaction, merchant: 'My own row' });

        const first = await request(app).post('/api/transactions/demo').set(authHeader(alice.token));
        assert.equal(first.status, 201);
        const demoCount = first.body.count;

        await request(app).post('/api/transactions/demo').set(authHeader(alice.token));
        const list = await request(app).get('/api/transactions').set(authHeader(alice.token));

        assert.equal(list.body.count, demoCount + 1);
        assert.ok(list.body.data.some((tx) => tx.merchant === 'My own row'));
    });
});
