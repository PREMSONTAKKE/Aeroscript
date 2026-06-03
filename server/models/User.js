const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  firebaseUid: { type: String, unique: true, sparse: true },
  displayName: { type: String },
  bio: { type: String, default: '' },
  preferences: {
    autoSave: { type: Boolean, default: true },
    showCursorTrails: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    theme: { type: String, default: 'dark' }
  },
  achievements: [{
    name: String,
    description: String,
    earnedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

module.exports = mongoose.model('User', userSchema);
