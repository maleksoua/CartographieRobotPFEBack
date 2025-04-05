import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017/EnovaDB';

let conn;
let gridFSBucket;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    conn = mongoose.connection;

    conn.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    conn.once('open', () => {
      gridFSBucket = new GridFSBucket(conn.db, { bucketName: 'maps' });
      console.log('✅ GridFS is ready...');
    });

    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Exit the process if the connection fails
  }
};

const getGridFSBucket = () => {
  if (!conn || conn.readyState !== 1) {
    throw new Error('MongoDB connection is not established');
  }
  if (!gridFSBucket) {
    gridFSBucket = new GridFSBucket(conn.db, { bucketName: 'maps' });
  }
  return gridFSBucket;
};


const getConnection = () => {
  if (!conn) {
    throw new Error('MongoDB connection is not established');
  }
  return conn;
};

export { connectDB, getGridFSBucket, getConnection };