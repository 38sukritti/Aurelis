import mongoose from 'mongoose';

// Same range as the threshold dropdown on the Settings page.
export const MIN_THRESHOLD = 2.0;
export const MAX_THRESHOLD = 4.0;
export const DEFAULT_THRESHOLD = 3.0;

const settingsSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        zScoreThreshold: {
            type: Number,
            default: DEFAULT_THRESHOLD,
            min: [MIN_THRESHOLD, `Threshold must be at least ${MIN_THRESHOLD}.`],
            max: [MAX_THRESHOLD, `Threshold must be at most ${MAX_THRESHOLD}.`]
        }
    },
    { timestamps: true }
);

settingsSchema.set('toJSON', {
    transform: (doc, ret) => ({
        zScoreThreshold: ret.zScoreThreshold,
        updatedAt: ret.updatedAt
    })
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
