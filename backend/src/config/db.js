import mongoose from 'mongoose';

// Without this, Mongoose quietly queues queries while the database is
// unreachable. We would rather fail straight away so a failed save is
// reported as an error instead of hanging or looking successful.
mongoose.set('bufferCommands', false);

export async function connectDatabase(uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export async function disconnectDatabase() {
    await mongoose.disconnect();
}

export function isDatabaseConnected() {
    return mongoose.connection.readyState === 1;
}
