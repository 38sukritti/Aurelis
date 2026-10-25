import Settings, { MIN_THRESHOLD, MAX_THRESHOLD } from '../models/Settings.js';

// Creates the settings document with defaults the first time it's needed,
// e.g. for accounts created before settings existed.
function findOrCreateSettings(userId) {
    return Settings.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
}

// GET /api/settings
export async function getSettings(req, res) {
    const settings = await findOrCreateSettings(req.user._id);
    res.json({ success: true, data: settings });
}

// PUT /api/settings
export async function updateSettings(req, res) {
    const rawThreshold = req.body?.zScoreThreshold;
    const threshold = Number(rawThreshold);

    const isNumber = (typeof rawThreshold === 'number' || typeof rawThreshold === 'string')
        && rawThreshold !== ''
        && Number.isFinite(threshold);

    if (!isNumber || threshold < MIN_THRESHOLD || threshold > MAX_THRESHOLD) {
        return res.status(400).json({
            success: false,
            message: `zScoreThreshold must be a number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}.`
        });
    }

    const settings = await findOrCreateSettings(req.user._id);
    settings.zScoreThreshold = threshold;
    await settings.save();

    res.json({ success: true, message: `Threshold updated to ${threshold}σ.`, data: settings });
}
