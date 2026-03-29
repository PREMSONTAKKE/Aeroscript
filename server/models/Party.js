const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxMembers: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  board: {
    strokes: [{
      brushColor: String,
      brushWidth: Number,
      inkType: String,
      points: [{
        x: Number,
        y: Number,
        time: Number
      }]
    }],
    settings: {
      color: String,
      width: Number,
      ink: String,
      mode: String
    },
    inputMode: {
      type: String,
      default: 'mouse'
    },
    lastSyncedAt: Date,
    lastSyncedBy: String
  }
});

partySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Party', partySchema);
