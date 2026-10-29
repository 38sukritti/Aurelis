import { isDatabaseConnected } from '../config/db.js';

// If MongoDB drops while the server is running, answer with 503 straight
// away instead of letting a request look like it worked.
export function requireDatabase(req, res, next) {
    if (!isDatabaseConnected()) {
        return res.status(503).json({
            success: false,
            message: 'The database is currently unavailable. Please try again shortly.'
        });
    }
    next();
}
