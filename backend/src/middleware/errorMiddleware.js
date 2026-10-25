const DATABASE_ERROR_NAMES = [
    'MongoNetworkError',
    'MongoNotConnectedError',
    'MongoServerSelectionError',
    'MongoTopologyClosedError'
];

export function notFound(req, res) {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express 5 forwards errors thrown in async controllers here, so the
// controllers don't need their own try/catch blocks.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    // Mongoose schema validation, e.g. an amount below the minimum.
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map((fieldError) => fieldError.message);
        return res.status(400).json({ success: false, message: errors[0], errors });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid value for ${error.path}.` });
    }

    // Unique index violation (duplicate email, duplicate import row, ...).
    if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'A record with the same unique value already exists.' });
    }

    if (DATABASE_ERROR_NAMES.includes(error.name)) {
        console.error('Database error:', error.message);
        return res.status(503).json({ success: false, message: 'The database is currently unavailable. Please try again shortly.' });
    }

    // Client errors raised by Express itself (bad JSON, body too large) or by
    // our CORS check. `expose` means the message is safe to show.
    if (error.status >= 400 && error.status < 500 && error.expose) {
        const message = error.type === 'entity.parse.failed' ? 'Request body is not valid JSON.' : error.message;
        return res.status(error.status).json({ success: false, message });
    }

    console.error(error);

    const body = { success: false, message: 'Something went wrong on the server. Please try again.' };
    if (process.env.NODE_ENV === 'development') {
        body.details = error.message;
    }
    res.status(500).json(body);
}
