const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Optional for quick saves
  name: { type: String, default: 'Untitled Artwork' },
  title: { type: String }, // support for bridge-style 
  strokes: [{
    points: [{ x: Number, y: Number }],
    brushColor: String,
    brushWidth: Number,
    inkType: String
  }],
  drawingData: Array, // support for bridge-style raw arrays
  settings: Object,    // support for bridge-style settings
  thumbnail: String, // Base64 preview
  mode: { type: String, enum: ['signature', 'draw', 'write'], default: 'draw' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
