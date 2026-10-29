// Shared helpers for the API tests. Each test file runs against its own
// throwaway in-memory MongoDB, so no Atlas credentials are needed.
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { createApp } from '../src/app.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-only-used-by-the-test-suite';
process.env.SERVE_FRONTEND = 'false';

let mongoServer;

export async function startTestDatabase() {
    mongoServer = await MongoMemoryServer.create();
    await connectDatabase(mongoServer.getUri());
    // Make sure unique indexes exist before tests rely on them.
    await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
    return createApp();
}

export async function stopTestDatabase() {
    await disconnectDatabase();
    await mongoServer.stop();
}

// Simulates a server restart: drop the connection, reconnect to the same
// database and build a brand-new Express app.
export async function restartServer() {
    await disconnectDatabase();
    await connectDatabase(mongoServer.getUri());
    return createApp();
}

export async function registerUser(app, overrides = {}) {
    const details = {
        name: 'Test User',
        email: `user${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
        password: 'secret123',
        ...overrides
    };

    const response = await request(app).post('/api/auth/register').send(details);
    return { ...details, token: response.body.data?.token, user: response.body.data?.user, response };
}

export function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

export const sampleTransaction = {
    amount: 250,
    category: 'Food',
    merchant: 'Local Cafe',
    description: 'Local Cafe',
    date: '2026-08-14',
    paymentMethod: 'UPI',
    recurring: false,
    notes: 'Lunch'
};
