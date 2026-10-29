import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

dotenv.config({ quiet: true });

// 5050 rather than 5000: on macOS, port 5000 is taken by AirPlay Receiver.
const DEFAULT_PORT = 5050;
const MIN_PRODUCTION_SECRET_LENGTH = 32;

function checkEnvironment() {
    const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
    }

    if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < MIN_PRODUCTION_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production.`);
    }
}

async function startServer() {
    try {
        checkEnvironment();
        await connectDatabase(process.env.MONGODB_URI);
    } catch (error) {
        // Never start listening without a database: every request would fail.
        console.error(`Server not started: ${error.message}`);
        process.exit(1);
    }

    mongoose.connection.on('disconnected', () => console.error('MongoDB disconnected.'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));

    const port = Number(process.env.PORT) || DEFAULT_PORT;
    const server = createApp().listen(port, () => {
        console.log(`AURELIS API ready on http://localhost:${port} (${process.env.NODE_ENV || 'development'})`);
    });

    server.on('error', (error) => {
        console.error(`Could not start the HTTP server: ${error.message}`);
        process.exit(1);
    });

    const shutDown = async (signal) => {
        console.log(`${signal} received, shutting down.`);
        server.close();
        await disconnectDatabase();
        process.exit(0);
    };
    process.on('SIGINT', shutDown);
    process.on('SIGTERM', shutDown);
}

startServer();
