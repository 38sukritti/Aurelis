import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { EMAIL_PATTERN } from '../models/User.js';
import Settings from '../models/Settings.js';
import Transaction from '../models/Transaction.js';
import { buildDemoTransactions } from '../utils/demoTransactions.js';

const PASSWORD_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6; // matches the check on the registration form
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything past 72 bytes

const DEMO_EMAIL = 'demo@aurelis.io';
const DEMO_NAME = 'Alex Vance';

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function createToken(user) {
    return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
}

function sendSession(res, statusCode, user, message) {
    res.status(statusCode).json({
        success: true,
        message,
        data: { token: createToken(user), user }
    });
}

// POST /api/auth/register
export async function register(req, res) {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const errors = [];
    if (!name) errors.push('Full name is required.');
    if (!EMAIL_PATTERN.test(email)) errors.push('Enter a valid email address.');
    if (password.length < MIN_PASSWORD_LENGTH) errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password.length > MAX_PASSWORD_LENGTH) errors.push(`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors[0], errors });
    }

    // The demo account is shared, so nobody may claim its email address.
    if (email === DEMO_EMAIL || await User.exists({ email })) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });
    await Settings.create({ userId: user._id });

    sendSession(res, 201, user, 'Account created successfully.');
}

// POST /api/auth/login
export async function login(req, res) {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Same message for both cases so the API doesn't reveal which emails exist.
    if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    sendSession(res, 200, user, `Welcome back, ${user.name}!`);
}

// POST /api/auth/demo
// Signs in to a shared demo account for presentations. The account gets a
// random password that is never shown, so it can only be used this way.
export async function demoLogin(req, res) {
    if (process.env.ENABLE_DEMO_LOGIN === 'false') {
        return res.status(403).json({ success: false, message: 'Demo login is disabled on this server.' });
    }

    let user = await User.findOne({ email: DEMO_EMAIL });

    if (!user) {
        const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), PASSWORD_SALT_ROUNDS);
        user = await User.create({ name: DEMO_NAME, email: DEMO_EMAIL, passwordHash });
        await Settings.create({ userId: user._id });
    }

    // Only seed when the demo account is empty, so logging in repeatedly
    // doesn't keep adding transactions.
    const hasTransactions = await Transaction.exists({ userId: user._id });
    if (!hasTransactions) {
        await Transaction.insertMany(buildDemoTransactions(user._id));
    }

    sendSession(res, 200, user, 'Logged in as Demo User!');
}

// GET /api/auth/me
export async function getCurrentUser(req, res) {
    res.json({ success: true, data: { user: req.user } });
}
