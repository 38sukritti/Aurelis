import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import { startTestDatabase, stopTestDatabase, registerUser, authHeader } from './testSetup.js';

describe('Authentication', () => {
    let app;

    before(async () => {
        app = await startTestDatabase();
    });

    after(stopTestDatabase);

    it('registers a user and never returns or stores the plain password', async () => {
        const { response, email } = await registerUser(app, { email: '  New.User@Example.com ' });

        assert.equal(response.status, 201);
        assert.ok(response.body.data.token);
        assert.equal(response.body.data.user.email, 'new.user@example.com');
        assert.equal(response.body.data.user.passwordHash, undefined);
        assert.equal(response.body.data.user.password, undefined);

        const saved = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
        assert.notEqual(saved.passwordHash, 'secret123');
        assert.match(saved.passwordHash, /^\$2[aby]\$/);
    });

    it('rejects a duplicate email with 409, ignoring case', async () => {
        await registerUser(app, { email: 'dupe@example.com' });
        const { response } = await registerUser(app, { email: 'DUPE@example.com' });

        assert.equal(response.status, 409);
        assert.equal(response.body.success, false);
    });

    it('rejects invalid registration data with 400', async () => {
        const { response } = await registerUser(app, { name: '', email: 'not-an-email', password: '123' });

        assert.equal(response.status, 400);
        assert.equal(response.body.errors.length, 3);
    });

    it('logs in with the correct password', async () => {
        await registerUser(app, { email: 'login@example.com' });
        const response = await request(app).post('/api/auth/login').send({ email: 'Login@Example.com', password: 'secret123' });

        assert.equal(response.status, 200);
        assert.ok(response.body.data.token);
        assert.equal(response.body.data.user.email, 'login@example.com');
    });

    it('rejects a wrong password with 401', async () => {
        await registerUser(app, { email: 'wrongpass@example.com' });
        const response = await request(app).post('/api/auth/login').send({ email: 'wrongpass@example.com', password: 'nope-nope' });

        assert.equal(response.status, 401);
        assert.equal(response.body.data, undefined);
    });

    it('returns the current user for a valid token', async () => {
        const { token, email } = await registerUser(app);
        const response = await request(app).get('/api/auth/me').set(authHeader(token));

        assert.equal(response.status, 200);
        assert.equal(response.body.data.user.email, email);
    });

    it('rejects requests without a token', async () => {
        const response = await request(app).get('/api/auth/me');
        assert.equal(response.status, 401);
    });

    it('rejects a token signed with a different secret', async () => {
        const forged = jwt.sign({ sub: '64b7f9f1f1f1f1f1f1f1f1f1' }, 'some-other-secret');
        const response = await request(app).get('/api/auth/me').set(authHeader(forged));
        assert.equal(response.status, 401);
    });

    it('rejects an expired token', async () => {
        const { user } = await registerUser(app);
        const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: -10 });
        const response = await request(app).get('/api/auth/me').set(authHeader(expired));

        assert.equal(response.status, 401);
        assert.match(response.body.message, /expired/);
    });

    it('demo login seeds sample data once and does not allow registering the demo email', async () => {
        const first = await request(app).post('/api/auth/demo');
        assert.equal(first.status, 200);

        const token = first.body.data.token;
        const afterFirst = await request(app).get('/api/transactions').set(authHeader(token));
        assert.ok(afterFirst.body.count > 0);

        await request(app).post('/api/auth/demo');
        const afterSecond = await request(app).get('/api/transactions').set(authHeader(token));
        assert.equal(afterSecond.body.count, afterFirst.body.count);

        const { response } = await registerUser(app, { email: 'demo@aurelis.io' });
        assert.equal(response.status, 409);
    });
});
