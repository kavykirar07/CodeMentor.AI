import mongoose from 'mongoose';

let mongoConnected = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codementor';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    mongoConnected = true;
    console.log('✅ MongoDB connected');
    return true;
  } catch {
    console.log('⚠️  MongoDB unavailable — using in-memory storage');
    mongoConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return mongoConnected;
}
