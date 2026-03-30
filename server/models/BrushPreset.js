const mongoose = require('mongoose');

const brushPresetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  category: {
    type: String,
    enum: ['custom', 'preset', 'style'],
    default: 'custom'
  },
  brush: {
    color: { type: String, default: '#e2e8f0' },
    width: { type: Number, default: 4, min: 1, max: 50 },
    inkType: {
      type: String,
      enum: ['Graphite', 'Pencil', 'Laser', 'Calligraphy', 'Marker', 'Neon'],
      default: 'Graphite'
    },
    opacity: { type: Number, default: 1, min: 0, max: 1 }
  },
  effects: {
    smoothing: { type: Number, default: 0.5, min: 0, max: 1 },
    pressureSensitivity: { type: Number, default: 0, min: 0, max: 1 },
    tiltSensitivity: { type: Number, default: 0, min: 0, max: 1 }
  },
  stylePreset: {
    name: { type: String, default: null },
    type: {
      type: String,
      enum: ['caricature', 'portrait', 'landscape', 'sketch', 'abstract', null],
      default: null
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

brushPresetSchema.index({ userId: 1, name: 1 }, { unique: true });

brushPresetSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

const BrushPreset = mongoose.model('BrushPreset', brushPresetSchema);

module.exports = BrushPreset;
