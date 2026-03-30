const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserProfile = require('../models/UserProfile');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/', auth, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.userId });
      await profile.save();
    }
    
    res.json({ profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { displayName, bio, avatar, socialLinks, preferences } = req.body;
    
    let profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.userId });
    }
    
    if (displayName !== undefined) profile.displayName = displayName;
    if (bio !== undefined) profile.bio = bio;
    if (avatar !== undefined) profile.avatar = avatar;
    if (socialLinks) {
      profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
    }
    if (preferences) {
      profile.preferences = { ...profile.preferences, ...preferences };
    }
    
    await profile.save();
    res.json({ profile });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/analytics', auth, async (req, res) => {
  try {
    const { strokes, drawingTime, sessions, parties, artworks, presets, brushWidths, colors, inkTypes, modes } = req.body;
    
    let profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.userId });
    }
    
    await profile.updateStatistics({
      strokes,
      drawingTime,
      sessions,
      parties,
      artworks,
      presets
    });
    
    if (brushWidths || colors || inkTypes || modes) {
      await profile.updateStatistics({
        brushWidths,
        colors,
        inkTypes,
        modes
      });
    }
    
    const { achievements } = await profile.checkAchievements();
    
    res.json({
      success: true,
      statistics: profile.statistics,
      newAchievements: achievements
    });
  } catch (err) {
    console.error('Update analytics error:', err);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    const profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.json({
        summary: {
          totalStrokes: 0,
          totalDrawingTime: 0,
          averageSessionLength: 0,
          mostUsedBrush: null,
          mostUsedColor: null,
          favoriteMode: null,
          weeklyStrokes: [],
          weeklyDrawingTime: []
        }
      });
    }
    
    const now = new Date();
    let startDate = new Date(now);
    
    switch (period) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'week':
      default:
        startDate.setDate(startDate.getDate() - 7);
        break;
    }
    
    const periodAnalytics = profile.dailyAnalytics.filter(a => a.date >= startDate);
    
    const totalStrokes = periodAnalytics.reduce((sum, a) => sum + a.strokesCount, 0);
    const totalTime = periodAnalytics.reduce((sum, a) => sum + a.totalDrawingTime, 0);
    const totalSessions = periodAnalytics.reduce((sum, a) => sum + a.sessionsCount, 0);
    
    const allBrushWidths = periodAnalytics.flatMap(a => a.brushWidthUsage);
    const brushWidthCounts = {};
    allBrushWidths.forEach(bw => {
      brushWidthCounts[bw.width] = (brushWidthCounts[bw.width] || 0) + bw.count;
    });
    const mostUsedBrush = Object.entries(brushWidthCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const allColors = periodAnalytics.flatMap(a => a.colorUsage);
    const colorCounts = {};
    allColors.forEach(c => {
      colorCounts[c.color] = (colorCounts[c.color] || 0) + c.count;
    });
    const mostUsedColor = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const allInkTypes = periodAnalytics.flatMap(a => a.inkTypeUsage);
    const inkTypeCounts = {};
    allInkTypes.forEach(it => {
      inkTypeCounts[it.inkType] = (inkTypeCounts[it.inkType] || 0) + it.count;
    });
    const favoriteInkType = Object.entries(inkTypeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const allModes = periodAnalytics.flatMap(a => a.modesUsed);
    const modeCounts = {};
    allModes.forEach(m => {
      modeCounts[m.mode] = (modeCounts[m.mode] || 0) + m.count;
    });
    const favoriteMode = Object.entries(modeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    const weeklyStrokes = periodAnalytics.map(a => ({
      date: a.date.toISOString().split('T')[0],
      count: a.strokesCount
    }));
    
    const weeklyDrawingTime = periodAnalytics.map(a => ({
      date: a.date.toISOString().split('T')[0],
      minutes: Math.round(a.totalDrawingTime / 60000)
    }));
    
    const strokesPerMinute = totalTime > 0 ? (totalStrokes / (totalTime / 60000)).toFixed(1) : 0;
    
    res.json({
      summary: {
        period,
        totalStrokes,
        totalDrawingTime: Math.round(totalTime / 60000),
        averageSessionLength: totalSessions > 0 ? Math.round(totalTime / totalSessions / 60000) : 0,
        strokesPerMinute: parseFloat(strokesPerMinute),
        mostUsedBrush: mostUsedBrush ? { width: parseInt(mostUsedBrush[0]), count: mostUsedBrush[1] } : null,
        mostUsedColor: mostUsedColor ? { color: mostUsedColor[0], count: mostUsedColor[1] } : null,
        favoriteInkType: favoriteInkType ? { inkType: favoriteInkType[0], count: favoriteInkType[1] } : null,
        favoriteMode: favoriteMode ? { mode: favoriteMode[0], count: favoriteMode[1] } : null,
        weeklyStrokes,
        weeklyDrawingTime,
        achievements: profile.achievements.slice(-5),
        streakDays: profile.statistics.streakDays
      }
    });
  } catch (err) {
    console.error('Get analytics summary error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    
    const profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.json({ history: [] });
    }
    
    const recentAnalytics = profile.dailyAnalytics
      .sort((a, b) => b.date - a.date)
      .slice(0, parseInt(limit));
    
    res.json({
      history: recentAnalytics.map(a => ({
        date: a.date.toISOString().split('T')[0],
        strokes: a.strokesCount,
        drawingTime: Math.round(a.totalDrawingTime / 60000),
        sessions: a.sessionsCount,
        topBrush: a.brushWidthUsage.sort((x, y) => y.count - x.count)[0]?.width,
        topColor: a.colorUsage.sort((x, y) => y.count - x.count)[0]?.color,
        topMode: a.modesUsed.sort((x, y) => y.count - x.count)[0]?.mode
      }))
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Invalid preferences object' });
    }
    
    let profile = await UserProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      profile = new UserProfile({ userId: req.userId });
    }
    
    profile.preferences = { ...profile.preferences, ...preferences };
    await profile.save();
    
    res.json({ preferences: profile.preferences });
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
