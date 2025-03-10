import mongoose from 'mongoose';

const robotfinalSchema = new mongoose.Schema({
  ip: { type: String, unique: true, required: true },
  name:{ type:String, required:true},
  rosVersion:{ type:String, required:true},
  status:{type:String, required:true},

  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Robotfinal', robotfinalSchema);