import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Reads the "Authorization: Bearer <token>" header, verifies the JWT and
// loads the user. Controllers only ever trust req.user for ownership,
// never a userId sent in the request.
export async function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ success: false, message: 'Please log in to continue.' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? 'Your session has expired. Please log in again.'
            : 'Invalid authentication token.';
        return res.status(401).json({ success: false, message });
    }

    if (!mongoose.isValidObjectId(payload.sub)) {
        return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
    }

    // The account might have been deleted after the token was issued.
    const user = await User.findById(payload.sub);
    if (!user) {
        return res.status(401).json({ success: false, message: 'This account no longer exists. Please log in again.' });
    }

    req.user = user;
    next();
}
