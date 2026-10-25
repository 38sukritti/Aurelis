import mongoose from 'mongoose';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Full name is required.'],
            trim: true,
            maxlength: [80, 'Name must be 80 characters or fewer.']
        },
        email: {
            type: String,
            required: [true, 'Email address is required.'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [EMAIL_PATTERN, 'Enter a valid email address.']
        },
        // select: false keeps the hash out of every query unless a
        // controller explicitly asks for it (only login does).
        passwordHash: {
            type: String,
            required: true,
            select: false
        }
    },
    { timestamps: true }
);

userSchema.set('toJSON', {
    transform: (doc, ret) => ({
        id: ret._id.toString(),
        name: ret.name,
        email: ret.email,
        createdAt: ret.createdAt,
        updatedAt: ret.updatedAt
    })
});

const User = mongoose.model('User', userSchema);

export default User;
