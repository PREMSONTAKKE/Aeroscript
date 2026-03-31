const mongoose = require('mongoose');

const analyticsDailySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  strokes: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
  drawingTime: { type: Number, default: 0 }
});

analyticsDailySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsDaily', analyticsDailySchema);
