const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Party = require('../models/Party');
const User = require('../models/User');

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

const generatePartyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

router.post('/create', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Party name is required' });
    }

    let code = generatePartyCode();
    let existingParty = await Party.findOne({ code });
    
    while (existingParty) {
      code = generatePartyCode();
      existingParty = await Party.findOne({ code });
    }

    const party = new Party({
      code,
      host: req.userId,
      name,
      members: [{
        user: req.userId,
        name: req.email,
        joinedAt: new Date()
      }]
    });

    await party.save();

    res.json({
      party: {
        id: party._id,
        code: party.code,
        name: party.name,
        host: party.host,
        members: party.members,
        maxMembers: party.maxMembers,
        isActive: party.isActive,
        createdAt: party.createdAt,
        expiresAt: party.expiresAt
      }
    });
  } catch (err) {
    console.error('Create party error:', err);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Party code is required' });
    }

    const party = await Party.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).populate('host', 'email');

    if (!party) {
      return res.status(404).json({ error: 'Party not found or expired' });
    }

    if (party.members.length >= party.maxMembers) {
      return res.status(400).json({ error: 'Party is full' });
    }

    const existingMember = party.members.find(
      m => m.user?.toString() === req.userId
    );

    if (!existingMember) {
      party.members.push({
        user: req.userId,
        name: req.email,
        joinedAt: new Date()
      });
      await party.save();
    }

    res.json({
      party: {
        id: party._id,
        code: party.code,
        name: party.name,
        host: party.host,
        members: party.members,
        maxMembers: party.maxMembers,
        isActive: party.isActive,
        createdAt: party.createdAt,
        expiresAt: party.expiresAt
      }
    });
  } catch (err) {
    console.error('Join party error:', err);
    res.status(500).json({ error: 'Failed to join party' });
  }
});

router.get('/:code', auth, async (req, res) => {
  try {
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase(),
      isActive: true
    }).populate('members.user', 'email');

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json({ party });
  } catch (err) {
    console.error('Get party error:', err);
    res.status(500).json({ error: 'Failed to get party' });
  }
});

router.post('/:code/leave', auth, async (req, res) => {
  try {
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase()
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    party.members = party.members.filter(
      m => m.user?.toString() !== req.userId
    );

    if (party.members.length === 0) {
      party.isActive = false;
    } else if (party.host.toString() === req.userId && party.members.length > 0) {
      party.host = party.members[0].user;
    }

    await party.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Leave party error:', err);
    res.status(500).json({ error: 'Failed to leave party' });
  }
});

router.delete('/:code', auth, async (req, res) => {
  try {
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase()
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.host.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only host can delete party' });
    }

    party.isActive = false;
    await party.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete party error:', err);
    res.status(500).json({ error: 'Failed to delete party' });
  }
});

router.post('/:code/kick', auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase()
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.host.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only host can kick members' });
    }

    if (memberId === req.userId) {
      return res.status(400).json({ error: 'Cannot kick yourself' });
    }

    party.members = party.members.filter(
      m => m.user?.toString() !== memberId
    );

    await party.save();

    res.json({ success: true, message: 'Member kicked' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

router.post('/:code/transfer-host', auth, async (req, res) => {
  try {
    const { newHostId } = req.body;
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase()
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.host.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only host can transfer ownership' });
    }

    const isMember = party.members.some(
      m => m.user?.toString() === newHostId
    );

    if (!isMember) {
      return res.status(400).json({ error: 'New host must be a party member' });
    }

    party.host = newHostId;
    await party.save();

    res.json({ success: true, message: 'Host transferred' });
  } catch (err) {
    console.error('Transfer host error:', err);
    res.status(500).json({ error: 'Failed to transfer host' });
  }
});

router.post('/:code/lock', auth, async (req, res) => {
  try {
    const { locked } = req.body;
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase()
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    if (party.host.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only host can lock/unlock party' });
    }

    party.isLocked = Boolean(locked);
    await party.save();

    res.json({ success: true, locked: party.isLocked });
  } catch (err) {
    console.error('Lock party error:', err);
    res.status(500).json({ error: 'Failed to update party lock status' });
  }
});

router.get('/:code/members-achievements', auth, async (req, res) => {
  try {
    const party = await Party.findOne({ 
      code: req.params.code.toUpperCase(),
      isActive: true
    });

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    const isMember = party.members.some(m => m.user?.toString() === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'You must be a party member' });
    }

    const memberIds = party.members.map(m => m.user).filter(Boolean);
    const users = await User.find({ _id: { $in: memberIds } }).select('email displayName achievements');

    const membersWithData = party.members.map(member => {
      const user = users.find(u => u._id.toString() === member.user?.toString());
      return {
        userId: member.user,
        name: user?.displayName || member.name || user?.email?.split('@')[0] || 'Unknown',
        email: user?.email || '',
        achievements: user?.achievements || [],
        joinedAt: member.joinedAt
      };
    });

    res.json({ members: membersWithData });
  } catch (err) {
    console.error('Members achievements error:', err);
    res.status(500).json({ error: 'Failed to fetch members achievements' });
  }
});

module.exports = router;
