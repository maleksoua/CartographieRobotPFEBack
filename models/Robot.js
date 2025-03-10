import mongoose from 'mongoose';

const robotSchema = new mongoose.Schema({
  ip: { type: String, unique: true, required: true },
  rosVersion:{type: String, required: true},
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Robot', robotSchema);