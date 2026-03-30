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

router.post('/share', auth, async (req, res) => {
  try {
    const { artworkData, thumbnail, title, platform } = req.body;
    
    if (!artworkData && !thumbnail) {
      return res.status(400).json({ error: 'Artwork data or thumbnail required' });
    }
    
    const shareLinks = {};
    
    if (platform === 'instagram' || !platform) {
      shareLinks.instagram = {
        type: 'download',
        message: 'Download image for Instagram upload',
        instructions: 'Save the image and upload to Instagram from your mobile device',
        downloadUrl: `/api/share/download?artwork=${encodeURIComponent(artworkData || thumbnail)}`
      };
    }
    
    if (platform === 'pinterest' || !platform) {
      const pinterestText = encodeURIComponent(
        `Check out my artwork "${title || 'AeroScript Creation'}" created with AeroScript! ✨`
      );
      shareLinks.pinterest = {
        type: 'external',
        url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent('https://aeroscript.app')}&media=${encodeURIComponent(thumbnail || artworkData)}&description=${pinterestText}`,
        message: 'Open Pinterest to share'
      };
    }
    
    if (platform === 'twitter' || !platform) {
      const twitterText = encodeURIComponent(
        `Just created something cool with @AeroScript! "${title || 'My artwork'}" 🎨`
      );
      shareLinks.twitter = {
        type: 'external',
        url: `https://twitter.com/intent/tweet?text=${twitterText}`,
        message: 'Share on Twitter/X'
      };
    }
    
    if (platform === 'facebook' || !platform) {
      shareLinks.facebook = {
        type: 'external',
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://aeroscript.app')}`,
        message: 'Share on Facebook'
      };
    }
    
    let profile = await UserProfile.findOne({ userId: req.userId });
    if (profile) {
      await profile.updateStatistics({ artworks: 1 });
    }
    
    res.json({
      success: true,
      shareLinks,
      message: 'Share links generated successfully'
    });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Failed to generate share links' });
  }
});

router.get('/download', auth, async (req, res) => {
  try {
    const { artwork, format = 'png' } = req.query;
    
    if (!artwork) {
      return res.status(400).json({ error: 'Artwork data required' });
    }
    
    const imageData = artwork.startsWith('data:') 
      ? artwork 
      : `data:image/png;base64,${artwork}`;
    
    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Type', `image/${mimeType}`);
    res.setHeader('Content-Disposition', 'attachment; filename=aeroscript-artwork.png');
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download artwork' });
  }
});

router.post('/export', auth, async (req, res) => {
  try {
    const { artworkData, thumbnail, title, settings } = req.body;
    
    const exportData = {
      version: '1.0',
      title: title || 'Untitled',
      exportedAt: new Date().toISOString(),
      author: req.userId,
      artwork: artworkData,
      thumbnail: thumbnail,
      settings: settings || {},
      metadata: {
        app: 'AeroScript',
        format: 'aeroscript-project'
      }
    };
    
    const jsonString = JSON.stringify(exportData);
    const buffer = Buffer.from(jsonString, 'utf-8');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${(title || 'artwork').replace(/[^a-z0-9]/gi, '_')}.aeroscript"`);
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export artwork' });
  }
});

module.exports = router;
