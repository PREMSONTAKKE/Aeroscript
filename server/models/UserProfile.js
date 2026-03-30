const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  strokesCount: { type: Number, default: 0 },
  totalDrawingTime: { type: Number, default: 0 },
  averageStrokeLength: { type: Number, default: 0 },
  brushWidthUsage: [{
    width: Number,
    count: Number
  }],
  colorUsage: [{
    color: String,
    count: Number
  }],
  inkTypeUsage: [{
    inkType: String,
    count: Number
  }],
  modesUsed: [{
    mode: String,
    count: Number
  }],
  sessionsCount: { type: Number, default: 0 },
  partiesJoined: { type: Number, default: 0 }
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 200
  },
  avatar: {
    type: String,
    default: null
  },
  socialLinks: {
    instagram: { type: String, default: null },
    pinterest: { type: String, default: null },
    website: { type: String, default: null }
  },
  preferences: {
    defaultTheme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    defaultBrushWidth: { type: Number, default: 4 },
    defaultInkType: { type: String, default: 'Graphite' },
    defaultColor: { type: String, default: '#e2e8f0' },
    showCursorTrails: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    snapToGrid: { type: Boolean, default: false }
  },
  statistics: {
    totalStrokes: { type: Number, default: 0 },
    totalDrawingTime: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalParties: { type: Number, default: 0 },
    artworksCreated: { type: Number, default: 0 },
    presetsCreated: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null }
  },
  dailyAnalytics: [analyticsSchema],
  favoritePresets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BrushPreset'
  }],
  achievements: [{
    id: String,
    name: String,
    earnedAt: Date,
    description: String
  }]
}, {
  timestamps: true
});

userProfileSchema.methods.updateStatistics = async function(stats) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  this.statistics.totalStrokes += stats.strokes || 0;
  this.statistics.totalDrawingTime += stats.drawingTime || 0;
  this.statistics.totalSessions += stats.sessions || 0;
  this.statistics.totalParties += stats.parties || 0;
  this.statistics.artworksCreated += stats.artworks || 0;
  
  if (!this.statistics.lastActiveDate || 
      new Date(this.statistics.lastActiveDate).toDateString() !== today.toDateString()) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (this.statistics.lastActiveDate && 
        new Date(this.statistics.lastActiveDate).toDateString() === yesterday.toDateString()) {
      this.statistics.streakDays += 1;
    } else {
      this.statistics.streakDays = 1;
    }
    this.statistics.lastActiveDate = now;
  }
  
  let todayAnalytics = this.dailyAnalytics.find(a => 
    a.date.toDateString() === today.toDateString()
  );
  
  if (!todayAnalytics) {
    todayAnalytics = {
      date: today,
      strokesCount: 0,
      totalDrawingTime: 0,
      averageStrokeLength: 0,
      brushWidthUsage: [],
      colorUsage: [],
      inkTypeUsage: [],
      modesUsed: [],
      sessionsCount: 0,
      partiesJoined: 0
    };
    this.dailyAnalytics.push(todayAnalytics);
    if (this.dailyAnalytics.length > 365) {
      this.dailyAnalytics.shift();
    }
  }
  
  if (stats.strokes) todayAnalytics.strokesCount += stats.strokes;
  if (stats.drawingTime) todayAnalytics.totalDrawingTime += stats.drawingTime;
  if (stats.sessions) todayAnalytics.sessionsCount += stats.sessions;
  if (stats.parties) todayAnalytics.partiesJoined += stats.parties;
  
  if (stats.brushWidths) {
    stats.brushWidths.forEach(bw => {
      const existing = todayAnalytics.brushWidthUsage.find(u => u.width === bw);
      if (existing) {
        existing.count += 1;
      } else {
        todayAnalytics.brushWidthUsage.push({ width: bw, count: 1 });
      }
    });
  }
  
  if (stats.colors) {
    stats.colors.forEach(color => {
      const existing = todayAnalytics.colorUsage.find(u => u.color === color);
      if (existing) {
        existing.count += 1;
      } else {
        todayAnalytics.colorUsage.push({ color, count: 1 });
      }
    });
  }
  
  if (stats.inkTypes) {
    stats.inkTypes.forEach(ink => {
      const existing = todayAnalytics.inkTypeUsage.find(u => u.inkType === ink);
      if (existing) {
        existing.count += 1;
      } else {
        todayAnalytics.inkTypeUsage.push({ inkType: ink, count: 1 });
      }
    });
  }
  
  if (stats.modes) {
    stats.modes.forEach(mode => {
      const existing = todayAnalytics.modesUsed.find(u => u.mode === mode);
      if (existing) {
        existing.count += 1;
      } else {
        todayAnalytics.modesUsed.push({ mode, count: 1 });
      }
    });
  }
  
  return this.save();
};

userProfileSchema.methods.checkAchievements = async function() {
  const newAchievements = [];
  
  if (this.statistics.totalStrokes >= 1000 && !this.achievements.find(a => a.id === 'stroke_master')) {
    newAchievements.push({
      id: 'stroke_master',
      name: 'Stroke Master',
      earnedAt: new Date(),
      description: 'Created 1,000 strokes'
    });
  }
  
  if (this.statistics.totalSessions >= 10 && !this.achievements.find(a => a.id === 'dedicated_artist')) {
    newAchievements.push({
      id: 'dedicated_artist',
      name: 'Dedicated Artist',
      earnedAt: new Date(),
      description: 'Completed 10 drawing sessions'
    });
  }
  
  if (this.statistics.streakDays >= 7 && !this.achievements.find(a => a.id === 'week_warrior')) {
    newAchievements.push({
      id: 'week_warrior',
      name: 'Week Warrior',
      earnedAt: new Date(),
      description: '7-day drawing streak'
    });
  }
  
  if (this.statistics.artworksCreated >= 5 && !this.achievements.find(a => a.id === 'prolific_creator')) {
    newAchievements.push({
      id: 'prolific_creator',
      name: 'Prolific Creator',
      earnedAt: new Date(),
      description: 'Created 5 artworks'
    });
  }
  
  if (this.statistics.presetsCreated >= 5 && !this.achievements.find(a => a.id === 'preset_creator')) {
    newAchievements.push({
      id: 'preset_creator',
      name: 'Preset Creator',
      earnedAt: new Date(),
      description: 'Created 5 brush presets'
    });
  }
  
  this.achievements.push(...newAchievements);
  return { achievements: newAchievements, updated: await this.save() };
};

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

module.exports = UserProfile;
