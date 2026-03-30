const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const BrushPreset = require('../models/BrushPreset');

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

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, brush, effects, stylePreset, isPublic } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Preset name is required' });
    }
    
    const preset = new BrushPreset({
      userId: req.userId,
      name: name.trim(),
      category: category || 'custom',
      brush: {
        color: brush?.color || '#e2e8f0',
        width: brush?.width || 4,
        inkType: brush?.inkType || 'Graphite',
        opacity: brush?.opacity || 1
      },
      effects: {
        smoothing: effects?.smoothing ?? 0.5,
        pressureSensitivity: effects?.pressureSensitivity ?? 0,
        tiltSensitivity: effects?.tiltSensitivity ?? 0
      },
      stylePreset: {
        name: stylePreset?.name,
        type: stylePreset?.type
      },
      isPublic: isPublic || false
    });
    
    await preset.save();
    res.status(201).json({ preset });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Preset with this name already exists' });
    }
    console.error('Create preset error:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { category, includePublic } = req.query;
    
    const query = { userId: req.userId };
    if (category) {
      query.category = category;
    }
    
    const presets = await BrushPreset.find(query).sort({ updatedAt: -1 });
    
    let publicPresets = [];
    if (includePublic === 'true') {
      publicPresets = await BrushPreset.find({ 
        isPublic: true,
        userId: { $ne: req.userId }
      }).populate('userId', 'email').sort({ usageCount: -1 }).limit(20);
    }
    
    res.json({ presets, publicPresets });
  } catch (err) {
    console.error('Get presets error:', err);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const preset = await BrushPreset.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isPublic: true }
      ]
    });
    
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ preset });
  } catch (err) {
    console.error('Get preset error:', err);
    res.status(500).json({ error: 'Failed to fetch preset' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, brush, effects, stylePreset, isPublic } = req.body;
    
    const preset = await BrushPreset.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    if (name) preset.name = name.trim();
    if (brush) {
      preset.brush = { ...preset.brush, ...brush };
    }
    if (effects) {
      preset.effects = { ...preset.effects, ...effects };
    }
    if (stylePreset) {
      preset.stylePreset = { ...preset.stylePreset, ...stylePreset };
    }
    if (typeof isPublic === 'boolean') {
      preset.isPublic = isPublic;
    }
    
    await preset.save();
    res.json({ preset });
  } catch (err) {
    console.error('Update preset error:', err);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const preset = await BrushPreset.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete preset error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

router.post('/:id/use', auth, async (req, res) => {
  try {
    const preset = await BrushPreset.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isPublic: true }
      ]
    });
    
    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    await preset.incrementUsage();
    res.json({ preset });
  } catch (err) {
    console.error('Use preset error:', err);
    res.status(500).json({ error: 'Failed to use preset' });
  }
});

router.get('/styles/presets', async (req, res) => {
  try {
    const stylePresets = [
      {
        id: 'sketch_classic',
        name: 'Classic Sketch',
        type: 'sketch',
        brush: { color: '#4a5568', width: 2, inkType: 'Pencil', opacity: 0.7 },
        effects: { smoothing: 0.6, pressureSensitivity: 0.3, tiltSensitivity: 0.2 }
      },
      {
        id: 'ink_bold',
        name: 'Bold Ink',
        type: 'sketch',
        brush: { color: '#1a202c', width: 5, inkType: 'Marker', opacity: 0.85 },
        effects: { smoothing: 0.3, pressureSensitivity: 0.1, tiltSensitivity: 0 }
      },
      {
        id: 'watercolor_soft',
        name: 'Soft Watercolor',
        type: 'portrait',
        brush: { color: '#63b3ed', width: 8, inkType: 'Marker', opacity: 0.4 },
        effects: { smoothing: 0.8, pressureSensitivity: 0.5, tiltSensitivity: 0.3 }
      },
      {
        id: 'neon_glow',
        name: 'Neon Glow',
        type: 'abstract',
        brush: { color: '#f56565', width: 4, inkType: 'Neon', opacity: 1 },
        effects: { smoothing: 0.4, pressureSensitivity: 0.2, tiltSensitivity: 0 }
      },
      {
        id: 'calligraphy_elegant',
        name: 'Elegant Calligraphy',
        type: 'portrait',
        brush: { color: '#2d3748', width: 3, inkType: 'Calligraphy', opacity: 0.95 },
        effects: { smoothing: 0.5, pressureSensitivity: 0.4, tiltSensitivity: 0.4 }
      },
      {
        id: 'landscape_pencil',
        name: 'Landscape Pencil',
        type: 'landscape',
        brush: { color: '#718096', width: 3, inkType: 'Pencil', opacity: 0.6 },
        effects: { smoothing: 0.7, pressureSensitivity: 0.2, tiltSensitivity: 0.1 }
      },
      {
        id: 'caricature_exaggerated',
        name: 'Exaggerated Caricature',
        type: 'caricature',
        brush: { color: '#e53e3e', width: 6, inkType: 'Marker', opacity: 0.9 },
        effects: { smoothing: 0.2, pressureSensitivity: 0.6, tiltSensitivity: 0.3 }
      },
      {
        id: 'laser_tech',
        name: 'Tech Laser',
        type: 'abstract',
        brush: { color: '#00ffff', width: 2, inkType: 'Laser', opacity: 1 },
        effects: { smoothing: 0.1, pressureSensitivity: 0, tiltSensitivity: 0 }
      }
    ];
    
    res.json({ presets: stylePresets });
  } catch (err) {
    console.error('Get style presets error:', err);
    res.status(500).json({ error: 'Failed to fetch style presets' });
  }
});

module.exports = router;
