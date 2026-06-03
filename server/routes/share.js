const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const generateShareId = () => {
  return crypto.randomBytes(8).toString('hex');
};

const inMemoryShares = new Map();

router.post('/generate', auth, async (req, res) => {
  try {
    const { artworkData, thumbnail, title, platform, mode } = req.body;

    if (!artworkData && !thumbnail) {
      return res.status(400).json({ error: 'Artwork data or thumbnail required' });
    }

    const shareId = generateShareId();

    const shareLinks = {};

    if (!platform || platform === 'instagram') {
      shareLinks.instagram = {
        type: 'download',
        message: 'Download image for Instagram upload',
        instructions: 'Save the image and upload to Instagram from your mobile device',
        downloadUrl: `/api/share/${shareId}/download`
      };
    }

    if (!platform || platform === 'pinterest') {
      const pinterestText = encodeURIComponent(
        `Check out my artwork "${title || 'AeroScript Creation'}" created with AeroScript! ✨`
      );
      shareLinks.pinterest = {
        type: 'external',
        url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent('https://aeroscript.app')}&media=${encodeURIComponent(thumbnail || artworkData)}&description=${pinterestText}`,
        message: 'Open Pinterest to share'
      };
    }

    if (!platform || platform === 'twitter') {
      const twitterText = encodeURIComponent(
        `Just created something cool with @AeroScript! "${title || 'My artwork'}" 🎨`
      );
      shareLinks.twitter = {
        type: 'external',
        url: `https://twitter.com/intent/tweet?text=${twitterText}`,
        message: 'Share on Twitter/X'
      };
    }

    if (!platform || platform === 'facebook') {
      shareLinks.facebook = {
        type: 'external',
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://aeroscript.app')}`,
        message: 'Share on Facebook'
      };
    }

    inMemoryShares.set(shareId, {
      shareId,
      author: req.userId,
      title: title || 'Untitled',
      artworkData,
      thumbnail,
      mode: mode || 'draw',
      createdAt: new Date().toISOString(),
      downloads: 0
    });

    res.json({
      success: true,
      shareId,
      shareLinks,
      message: 'Share links generated successfully'
    });
  } catch (err) {
    console.error('Generate share error:', err);
    res.status(500).json({ error: 'Failed to generate share links' });
  }
});

router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const share = inMemoryShares.get(shareId);

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    res.json({
      share: {
        shareId: share.shareId,
        title: share.title,
        mode: share.mode,
        thumbnail: share.thumbnail,
        createdAt: share.createdAt,
        author: share.author
      }
    });
  } catch (err) {
    console.error('Get share error:', err);
    res.status(500).json({ error: 'Failed to get share' });
  }
});

router.get('/:shareId/download', async (req, res) => {
  try {
    const { shareId } = req.params;
    const share = inMemoryShares.get(shareId);

    if (!share || !share.artworkData) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const imageData = share.artworkData.startsWith('data:')
      ? share.artworkData
      : `data:image/png;base64,${share.artworkData}`;

    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', `image/${mimeType}`);
    res.setHeader('Content-Disposition', `attachment; filename="${(share.title || 'aeroscript-artwork').replace(/[^a-z0-9]/gi, '_')}.png"`);
    res.send(buffer);
  } catch (err) {
    console.error('Download share error:', err);
    res.status(500).json({ error: 'Failed to download share' });
  }
});

module.exports = router;
