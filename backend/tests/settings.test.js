import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startTestDatabase, stopTestDatabase, restartServer, registerUser, authHeader } from './testSetup.js';

describe('Settings', () => {
    let app;
    let alice;
    let bob;

    before(async () => {
        app = await startTestDatabase();
        alice = await registerUser(app);
        bob = await registerUser(app);
    });

    after(stopTestDatabase);

    it('starts with the default threshold of 3.0', async () => {
        const response = await request(app).get('/api/settings').set(authHeader(alice.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.data.zScoreThreshold, 3.0);
    });

    it('updates the threshold', async () => {
        const response = await request(app).put('/api/settings').set(authHeader(alice.token)).send({ zScoreThreshold: 2.5 });

        assert.equal(response.status, 200);
        assert.equal(response.body.data.zScoreThreshold, 2.5);
    });

    it('rejects values outside 2.0 - 4.0 and non-numbers', async () => {
        for (const value of [1.9, 4.1, 'high', null, true, '']) {
            const response = await request(app).put('/api/settings').set(authHeader(alice.token)).send({ zScoreThreshold: value });
            assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(value)}`);
        }

        const current = await request(app).get('/api/settings').set(authHeader(alice.token));
        assert.equal(current.body.data.zScoreThreshold, 2.5);
    });

    it('keeps each user\'s settings separate', async () => {
        await request(app).put('/api/settings').set(authHeader(bob.token)).send({ zScoreThreshold: 4.0 });

        const aliceSettings = await request(app).get('/api/settings').set(authHeader(alice.token));
        const bobSettings = await request(app).get('/api/settings').set(authHeader(bob.token));

        assert.equal(aliceSettings.body.data.zScoreThreshold, 2.5);
        assert.equal(bobSettings.body.data.zScoreThreshold, 4.0);
    });

    it('keeps settings after a server restart', async () => {
        app = await restartServer();

        const response = await request(app).get('/api/settings').set(authHeader(alice.token));
        assert.equal(response.body.data.zScoreThreshold, 2.5);
    });

    it('requires authentication', async () => {
        const response = await request(app).put('/api/settings').send({ zScoreThreshold: 3.0 });
        assert.equal(response.status, 401);
    });
});
