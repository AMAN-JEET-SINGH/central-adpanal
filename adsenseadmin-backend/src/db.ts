import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/adsenseadmin';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected:', uri.split('/').pop());
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}
