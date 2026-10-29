import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { requireDatabase } from './middleware/databaseMiddleware.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { isDatabaseConnected } from './config/db.js';

// The HTML/CSS/JS frontend lives in the frontend directory.
const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');
const FRONTEND_PAGES = ['index.html', 'login.html', 'dashboard.html', 'app.html', 'anomalies.html'];

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function getAllowedOrigins() {
    return (process.env.CLIENT_URL || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);
}

// Browsers may only call the API from the origins in CLIENT_URL. During
// development we also allow localhost (e.g. VS Code Live Server) and pages
// opened straight from disk, which send the origin "null".
function isOriginAllowed(origin, req) {
    if (!origin) return true; // Postman, curl and same-origin GET requests

    // The page was served by this same server (see serveFrontend below).
    if (new URL(origin).host === req.get('host')) return true;

    if (getAllowedOrigins().includes(origin)) return true;

    if (process.env.NODE_ENV !== 'production') {
        return origin === 'null' || LOCALHOST_ORIGIN.test(origin);
    }
    return false;
}

function corsOptions(req, callback) {
    const origin = req.get('origin');

    let allowed = false;
    try {
        allowed = isOriginAllowed(origin, req);
    } catch {
        allowed = false; // a malformed Origin header
    }

    if (!allowed) {
        const error = new Error('This origin is not allowed to use the AURELIS API.');
        error.status = 403;
        error.expose = true;
        return callback(error);
    }
    callback(null, { origin: true });
}

// Serves only the frontend pages and their css/js folders, never the
// backend folder (which contains .env).
function serveFrontend(app) {
    app.use('/css', express.static(path.join(FRONTEND_ROOT, 'css')));
    app.use('/js', express.static(path.join(FRONTEND_ROOT, 'js')));

    app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_ROOT, 'index.html')));
    for (const page of FRONTEND_PAGES) {
        app.get(`/${page}`, (req, res) => res.sendFile(path.join(FRONTEND_ROOT, page)));
    }
}

export function createApp() {
    const app = express();

    app.disable('x-powered-by');
    // Render (and most hosts) sit behind a proxy.
    app.set('trust proxy', 1);

    app.use(cors(corsOptions));
    app.use(express.json({ limit: '2mb' }));

    // Reports 503 when MongoDB is down so uptime checks notice it.
    app.get('/api/health', (req, res) => {
        const databaseConnected = isDatabaseConnected();
        res.status(databaseConnected ? 200 : 503).json({
            status: databaseConnected ? 'ok' : 'error',
            database: databaseConnected ? 'connected' : 'disconnected',
            uptimeSeconds: Math.round(process.uptime())
        });
    });

    app.use('/api', requireDatabase);
    app.use('/api/auth', authRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api', notFound);

    if (process.env.SERVE_FRONTEND !== 'false') {
        serveFrontend(app);
    }

    app.use(errorHandler);

    return app;
}
