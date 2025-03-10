import mongoose from 'mongoose';

const robotPositionSchema = new mongoose.Schema({
  _id: { type: String, default: "latest" },
  x: { type: String, required: true },
  y: { type: String, required: true },
  z: { type: String, required: true },
  Ox: { type: String, required: true },
  Oy: { type: String, required: true },
  Oz: { type: String, required: true },
  Ow: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RobotPosition = mongoose.model('RobotPosition', robotPositionSchema);
export default RobotPosition;
