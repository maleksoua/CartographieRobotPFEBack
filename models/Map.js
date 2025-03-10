import mongoose from 'mongoose';

const mapSchema = new mongoose.Schema({
  name: String,
  pgm: String,  // Stocké en base64
  yaml: String
});


export default mongoose.model('Map', mapSchema);