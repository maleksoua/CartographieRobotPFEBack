const mongoose = require('mongoose');

const MapLiveSchema = new mongoose.Schema({
  data: [Number], // Carte sous forme de tableau
  width: Number,
  height: Number,
  resolution: Number, // Taille d'une cellule
  origin: {
    x: Number,
    y: Number,
    z: Number
  }
});

module.exports = mongoose.model('MapLive', MapLiveSchema);
