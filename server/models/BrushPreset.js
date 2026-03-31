const mongoose = require('mongoose');

const brushPresetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  brush: {
    color: { type: String, default: '#e2e8f0' },
    width: { type: Number, default: 4 },
    inkType: { type: String, default: 'Graphite' },
    opacity: { type: Number, default: 1 }
  },
  effects: {
    smoothing: { type: Number, default: 0.5 },
    pressureSensitivity: { type: Number, default: 0 },
    tiltSensitivity: { type: Number, default: 0 }
  },
  category: { type: String, default: 'custom' },
  isPublic: { type: Boolean, default: false },
  useCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BrushPreset', brushPresetSchema);
