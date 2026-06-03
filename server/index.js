require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const User = require('./models/User');
const Session = require('./models/Session');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
app.use(express.json({ limit: '50mb' }));

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

app.use((req, res, next) => {
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  next();
});

const buildAuthPayload = (user) => ({ userId: user._id, email: user.email });

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const ensureDatabaseReady = (res) => {
  if (isDatabaseReady()) return true;
  res.status(503).json({
    error: 'Database unavailable',
    details: 'MongoDB is not connected. Verify your Atlas network access and server connection.'
  });
  return false;
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const Party = require('./models/Party');

const partyRooms = new Map();
const partyBoards = new Map();

const getPartyBoard = async (code) => {
  if (!partyBoards.has(code)) {
    const party = await Party.findOne({ code, isActive: true });
    const boardData = party?.board || {
      strokes: [],
      settings: null,
      inputMode: 'mouse',
      lastSyncedAt: null,
      lastSyncedBy: null
    };

    partyBoards.set(code, {
      strokes: boardData.strokes || [],
      settings: boardData.settings || null,
      inputMode: boardData.inputMode || 'mouse',
      updatedAt: boardData.lastSyncedAt,
      updatedBy: boardData.lastSyncedBy
    });
  }

  return partyBoards.get(code);
};

const saveBoardToParty = async (code, board) => {
  try {
    const party = await Party.findOne({ code, isActive: true });
    if (!party) return;

    party.board = {
      strokes: board.strokes || [],
      settings: board.settings || null,
      inputMode: board.inputMode || 'mouse',
      lastSyncedAt: new Date(),
      lastSyncedBy: board.updatedBy || 'System'
    };

    await party.save();
  } catch (err) {
    console.error('Failed to persist board:', err);
  }
};

const buildRoomMembers = (code, hostId, ioInstance) => {
  const room = partyRooms.get(code) || new Set();

  return Array.from(room).map((id) => {
    const currentSocket = ioInstance.sockets.sockets.get(id);
    return {
      socketId: id,
      userId: currentSocket?.data?.userId,
      userName: currentSocket?.data?.userName,
      inputMode: currentSocket?.data?.inputMode || 'mouse',
      isHost: currentSocket?.data?.userId === hostId
    };
  });
};

const emitPartyPresence = async (code, ioInstance) => {
  const party = await Party.findOne({ code, isActive: true });
  if (!party) {
    return;
  }

  ioInstance.to(`party:${code}`).emit('party-presence', {
    party: {
      code,
      name: party.name,
      host: party.host.toString(),
      isLocked: party.isLocked || false
    },
    members: buildRoomMembers(code, party.host.toString(), ioInstance)
  });
};

io.on('connection', (socket) => {
  socket.on('join-party', async ({ code, userId, userName }) => {
    try {
      const normalizedCode = code.toUpperCase().trim();
      const party = await Party.findOne({ 
        code: normalizedCode,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!party) {
        socket.emit('party-error', { error: 'Party not found or expired' });
        return;
      }

      socket.join(`party:${normalizedCode}`);
      
      if (!partyRooms.has(normalizedCode)) {
        partyRooms.set(normalizedCode, new Set());
      }
      partyRooms.get(normalizedCode).add(socket.id);

      socket.data.partyCode = normalizedCode;
      socket.data.userId = userId;
      socket.data.userName = userName;
      socket.data.inputMode = socket.data.inputMode || 'mouse';

      const board = await getPartyBoard(normalizedCode);
      const members = buildRoomMembers(normalizedCode, party.host.toString(), io);

      socket.emit('party-joined', {
        party: {
          code: normalizedCode,
          name: party.name,
          host: party.host.toString(),
          isLocked: party.isLocked || false
        },
        members,
        board
      });

      socket.to(`party:${normalizedCode}`).emit('member-joined', {
        socketId: socket.id,
        userId,
        userName,
        inputMode: socket.data.inputMode
      });

      await emitPartyPresence(normalizedCode, io);
    } catch (err) {
      console.error('Join party error:', err);
      socket.emit('party-error', { error: 'Failed to join party' });
    }
  });

  socket.on('leave-party', async () => {
    const code = socket.data.partyCode;
    if (code) {
      socket.leave(`party:${code}`);
      partyRooms.get(code)?.delete(socket.id);

      socket.to(`party:${code}`).emit('member-left', {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName
      });
      
      const board = partyBoards.get(code);
      if (partyRooms.get(code)?.size === 0) {
        if (board) {
          await saveBoardToParty(code, board);
        }
        partyRooms.delete(code);
        partyBoards.delete(code);
      } else {
        emitPartyPresence(code, io).catch((err) => {
          console.error('Emit party presence error:', err);
        });
      }

      delete socket.data.partyCode;
    }
  });

  socket.on('draw', async (data) => {
    const code = socket.data.partyCode;
    if (code) {
      const board = await getPartyBoard(code);
      const incomingStrokes = Array.isArray(data.strokes) ? data.strokes : [];
      if (incomingStrokes.length) {
        board.strokes = [...board.strokes, ...incomingStrokes];
      }
      if (data.settings) {
        board.settings = data.settings;
      }
      if (data.inputMode) {
        board.inputMode = data.inputMode;
      }
      board.updatedAt = new Date().toISOString();
      board.updatedBy = socket.data.userName;

      socket.to(`party:${code}`).emit('draw', {
        socketId: socket.id,
        userName: socket.data.userName,
        ...data
      });

      if (board.strokes.length % 10 === 0) {
        saveBoardToParty(code, board).catch(console.error);
      }
    }
  });

  socket.on('stream-draw', (data) => {
    const code = socket.data.partyCode;
    if (code) {
      socket.to(`party:${code}`).emit('stream-draw', {
        strokeId: data.strokeId,
        points: data.points,
        style: data.style,
        isDrawing: data.isDrawing,
        socketId: socket.id,
        userName: socket.data.userName
      });
    }
  });

  socket.on('sync-canvas', async (data) => {
    const code = socket.data.partyCode;
    if (!code) {
      return;
    }

    const board = await getPartyBoard(code);
    board.strokes = Array.isArray(data.strokes) ? data.strokes : [];
    board.settings = data.settings || null;
    board.inputMode = data.inputMode || socket.data.inputMode || 'mouse';
    board.updatedAt = new Date().toISOString();
    board.updatedBy = socket.data.userName;

    socket.to(`party:${code}`).emit('canvas-synced', {
      socketId: socket.id,
      userName: socket.data.userName,
      board
    });

    saveBoardToParty(code, board).catch(console.error);
  });

  socket.on('clear-canvas', async () => {
    const code = socket.data.partyCode;
    if (code) {
      const board = await getPartyBoard(code);
      board.strokes = [];
      board.updatedAt = new Date().toISOString();
      board.updatedBy = socket.data.userName;

      socket.to(`party:${code}`).emit('clear-canvas', {
        socketId: socket.id,
        userName: socket.data.userName
      });

      saveBoardToParty(code, board).catch(console.error);
    }
  });

  socket.on('cursor-move', (data) => {
    const code = socket.data.partyCode;
    if (code) {
      socket.to(`party:${code}`).emit('cursor-move', {
        socketId: socket.id,
        userName: socket.data.userName,
        ...data
      });
    }
  });

  socket.on('presence-update', (data = {}) => {
    const code = socket.data.partyCode;
    socket.data.inputMode = data.inputMode || socket.data.inputMode || 'mouse';

    if (code) {
      emitPartyPresence(code, io).catch((err) => {
        console.error('Emit party presence error:', err);
      });
    }
  });

  socket.on('kick-member', async ({ targetSocketId }) => {
    const code = socket.data.partyCode;
    if (!code) return;

    try {
      const party = await Party.findOne({ code, isActive: true });
      if (!party || party.host.toString() !== socket.data.userId) {
        socket.emit('party-error', { error: 'Only host can kick members' });
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('kicked-from-party', { reason: 'You were removed by the host' });
        targetSocket.leave(`party:${code}`);
        partyRooms.get(code)?.delete(targetSocketId);
        
        io.to(`party:${code}`).emit('kick-member', {
          targetSocketId,
          targetUserId: targetSocket.data?.userId,
          kickedBy: socket.data.userName
        });

        emitPartyPresence(code, io).catch(console.error);
      }
    } catch (err) {
      console.error('Kick member error:', err);
    }
  });

  socket.on('lock-party', async ({ locked }) => {
    const code = socket.data.partyCode;
    if (!code) return;

    try {
      const party = await Party.findOne({ code, isActive: true });
      if (!party || party.host.toString() !== socket.data.userId) {
        socket.emit('party-error', { error: 'Only host can lock/unlock party' });
        return;
      }

      party.isLocked = Boolean(locked);
      await party.save();

      io.to(`party:${code}`).emit('lock-party', { locked: party.isLocked });
      emitPartyPresence(code, io).catch(console.error);
    } catch (err) {
      console.error('Lock party error:', err);
    }
  });

  socket.on('host-transferred', async ({ newHostId }) => {
    const code = socket.data.partyCode;
    if (!code) return;

    try {
      const party = await Party.findOne({ code, isActive: true });
      if (!party || party.host.toString() !== socket.data.userId) {
        socket.emit('party-error', { error: 'Only host can transfer ownership' });
        return;
      }

      const isMember = party.members.some(m => m.user?.toString() === newHostId);
      if (!isMember) {
        socket.emit('party-error', { error: 'New host must be a party member' });
        return;
      }

      party.host = newHostId;
      await party.save();

      io.to(`party:${code}`).emit('host-transferred', { 
        newHostId,
        transferredBy: socket.data.userName
      });

      emitPartyPresence(code, io).catch(console.error);
    } catch (err) {
      console.error('Host transfer error:', err);
    }
  });

  socket.on('disconnect', async () => {
    const code = socket.data.partyCode;
    if (code) {
      socket.leave(`party:${code}`);
      partyRooms.get(code)?.delete(socket.id);

      socket.to(`party:${code}`).emit('member-left', {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName
      });
      
      const board = partyBoards.get(code);
      if (partyRooms.get(code)?.size === 0) {
        if (board) {
          await saveBoardToParty(code, board);
        }
        partyRooms.delete(code);
        partyBoards.delete(code);
      } else {
        emitPartyPresence(code, io).catch((err) => {
          console.error('Emit party presence error:', err);
        });
      }

    }
  });
});

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!ensureDatabaseReady(res)) return;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Email already exists. Please Sign In.' });
    }

    user = new User({ email, password });
    await user.save();

    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup', details: err.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!ensureDatabaseReady(res)) return;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Account not found. Please Sign Up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error during signin', details: err.message });
  }
});

let firebaseAdminApp = null;
let firebaseAdminAuth = null;

try {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountRaw) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      firebaseAdminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      firebaseAdminAuth = admin.auth(firebaseAdminApp);
      console.log('Firebase Admin initialized');
    }
  }
} catch (e) {
  console.warn('Firebase Admin not configured:', e.message);
}

app.post('/api/auth/verify-firebase', async (req, res) => {
  const { idToken } = req.body;
  try {
    if (!firebaseAdminAuth) {
      return res.status(500).json({ error: 'Firebase Admin not configured on server' });
    }
    if (!ensureDatabaseReady(res)) return;

    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const email = decoded.email;

    let user = await User.findOne({ $or: [{ firebaseUid }, { email }] });
    if (!user) {
      user = new User({ email, firebaseUid });
      await user.save();
    } else if (!user.firebaseUid) {
      user.firebaseUid = firebaseUid;
      await user.save();
    }

    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('Firebase token verification error:', err.message);
    res.status(401).json({ error: 'Firebase token verification failed' });
  }
});

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    if (!ensureDatabaseReady(res)) return;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google OAuth not configured on server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = new User({ email, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed', details: err.message });
  }
});

// Middleware to verify JWT
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// --- Unified Bridge Routes (Private Workspace) ---
app.post('/api/save', auth, async (req, res) => {
  try {
    const { title, name, drawingData, strokes, mode, thumbnail, settings } = req.body;
    const session = new Session({
      userId: req.userId,
      title,
      name: title || name,
      drawingData: drawingData || strokes,
      strokes: drawingData || strokes,
      mode: mode || 'draw',
      thumbnail,
      settings
    });
    await session.save();
    res.json({ message: "Drawing Saved to Cloud!", id: session._id });
  } catch (err) {
    console.error('❌ Save error:', err);
    res.status(500).json({ error: 'Failed to save to bridge' });
  }
});

app.get('/api/history', auth, async (req, res) => {
  try {
    const { mode } = req.query;
    const filter = { userId: req.userId };
    if (mode) filter.mode = mode;
    
    // Only fetch sessions belonging to the authenticated user and matching the mode if provided
    const sessions = await Session.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(sessions);
  } catch (err) {
    console.error('❌ History fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.delete('/api/sessions/:id', auth, async (req, res) => {
  try {
    // Ensure the user owns the session before deleting
    const session = await Session.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: 'Session not found or unauthorized' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

app.put('/api/sessions/:id', auth, async (req, res) => {
  try {
    const { title, name, drawingData, strokes, thumbnail, settings, mode } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        $set: {
          title,
          name: title || name,
          drawingData: drawingData || strokes,
          strokes: drawingData || strokes,
          thumbnail,
          settings,
          mode: mode || 'draw'
        }
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    res.json({ message: 'Session updated', id: session._id });
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

const partyRoutes = require('./routes/party');
app.use('/api/party', partyRoutes);

const shareRoutes = require('./routes/share');
app.use('/api/share', shareRoutes);

const AnalyticsDaily = require('./models/AnalyticsDaily');
const BrushPreset = require('./models/BrushPreset');

app.get('/api/brush-presets', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const presets = await BrushPreset.find({
      $or: [{ userId: req.userId }, { isPublic: true }]
    }).sort({ createdAt: -1 });
    res.json({ presets });
  } catch (err) {
    console.error('❌ Brush presets fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

app.post('/api/brush-presets', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const { name, brush, effects, isPublic } = req.body;
    const preset = new BrushPreset({
      userId: req.userId,
      name,
      brush: brush || {},
      effects: effects || {},
      isPublic: isPublic || false
    });
    await preset.save();
    res.json({ preset });
  } catch (err) {
    console.error('❌ Brush preset create error:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

app.put('/api/brush-presets/:id', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const preset = await BrushPreset.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true }
    );
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    res.json({ preset });
  } catch (err) {
    console.error('❌ Brush preset update error:', err);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

app.delete('/api/brush-presets/:id', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const preset = await BrushPreset.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!preset) return res.status(404).json({ error: 'Preset not found' });
    res.json({ message: 'Preset deleted' });
  } catch (err) {
    console.error('❌ Brush preset delete error:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

app.post('/api/brush-presets/:id/use', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    await BrushPreset.findByIdAndUpdate(req.params.id, { $inc: { useCount: 1 } });
    res.json({ message: 'Preset usage recorded' });
  } catch (err) {
    console.error('❌ Brush preset use error:', err);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

app.get('/api/brush-presets/styles', async (req, res) => {
  const stylePresets = [
    { id: 'sketch', name: 'Sketch', type: 'pencil', brush: { color: '#333333', width: 2, inkType: 'Pencil' }, effects: { smoothing: 0.3, pressureSensitivity: 0.8, tiltSensitivity: 0.2 } },
    { id: 'neon-glow', name: 'Neon Glow', type: 'neon', brush: { color: '#00ff88', width: 6, inkType: 'Neon' }, effects: { smoothing: 0.7, pressureSensitivity: 0.3, tiltSensitivity: 0 } },
    { id: 'calligraphy', name: 'Calligraphy', type: 'calligraphy', brush: { color: '#1a1a2e', width: 8, inkType: 'Calligraphy' }, effects: { smoothing: 0.5, pressureSensitivity: 0.9, tiltSensitivity: 0.6 } },
    { id: 'marker', name: 'Bold Marker', type: 'marker', brush: { color: '#ff6b6b', width: 12, inkType: 'Marker' }, effects: { smoothing: 0.2, pressureSensitivity: 0.1, tiltSensitivity: 0 } },
    { id: 'laser', name: 'Laser Pointer', type: 'laser', brush: { color: '#ff0000', width: 3, inkType: 'Laser' }, effects: { smoothing: 0.9, pressureSensitivity: 0, tiltSensitivity: 0 } },
    { id: 'graphite', name: 'Classic Graphite', type: 'graphite', brush: { color: '#e2e8f0', width: 4, inkType: 'Graphite' }, effects: { smoothing: 0.5, pressureSensitivity: 0.4, tiltSensitivity: 0.1 } }
  ];
  res.json({ presets: stylePresets });
});

app.get('/api/profile', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const { displayName, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { displayName, bio },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    console.error('❌ Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.patch('/api/profile/preferences', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferences: { ...req.body } },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (err) {
    console.error('❌ Preferences update error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

app.get('/api/profile/analytics/summary', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const period = req.query.period || 'week';
    const daysMap = { day: 1, week: 7, month: 30, all: 365 };
    const days = daysMap[period] || 7;

    const sessions = await Session.find({ userId: req.userId });
    const totalStrokes = sessions.reduce((sum, s) => sum + (s.strokes?.length || 0), 0);
    const totalSessions = sessions.length;
    const totalDrawingTime = Math.round(sessions.reduce((sum, s) => {
      const elapsed = (new Date() - new Date(s.createdAt)) / 60000;
      return sum + Math.min(elapsed, 120);
    }, 0));

    const allBrushWidths = sessions.flatMap(s => s.strokes?.map(st => st.brushWidth).filter(Boolean) || []);
    const allColors = sessions.flatMap(s => s.strokes?.map(st => st.brushColor).filter(Boolean) || []);
    const widthCounts = {};
    allBrushWidths.forEach(w => { widthCounts[w] = (widthCounts[w] || 0) + 1; });
    const mostUsedWidth = Object.entries(widthCounts).sort((a, b) => b[1] - a[1])[0];
    const colorCounts = {};
    allColors.forEach(c => { colorCounts[c] = (colorCounts[c] || 0) + 1; });
    const mostUsedColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];

    const now = new Date();
    const weekData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === dateStr);
      const dayStrokes = daySessions.reduce((sum, s) => sum + (s.strokes?.length || 0), 0);
      weekData.push({ date: dateStr, count: dayStrokes });
    }

    const streakDays = (() => {
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const hasSession = sessions.some(s => new Date(s.createdAt).toISOString().split('T')[0] === dateStr);
        if (hasSession) streak++;
        else break;
      }
      return streak;
    })();

    const avgSessionLength = totalSessions > 0 ? Math.round(totalDrawingTime / totalSessions) : 0;
    const strokesPerMinute = totalDrawingTime > 0 ? (totalStrokes / totalDrawingTime).toFixed(1) : 0;

    res.json({
      summary: {
        totalStrokes,
        totalDrawingTime,
        totalSessions,
        strokesPerMinute: parseFloat(strokesPerMinute),
        averageSessionLength: avgSessionLength,
        mostUsedBrush: mostUsedWidth ? { width: parseInt(mostUsedWidth[0]), count: mostUsedWidth[1] } : null,
        mostUsedColor: mostUsedColor ? { color: mostUsedColor[0], count: mostUsedColor[1] } : null,
        weeklyStrokes: weekData,
        streakDays,
      }
    });
  } catch (err) {
    console.error('❌ Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/profile/analytics/drawings', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const sessions = await Session.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ drawings: sessions.map(s => ({ id: s._id, name: s.name, mode: s.mode, createdAt: s.createdAt, strokes: s.strokes?.length || 0 })) });
  } catch (err) {
    console.error('❌ Drawings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

app.get('/api/profile/analytics/ink-usage', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const sessions = await Session.find({ userId: req.userId });
    const inkCounts = {};
    sessions.forEach(s => {
      s.strokes?.forEach(st => {
        if (st.inkType) inkCounts[st.inkType] = (inkCounts[st.inkType] || 0) + 1;
      });
    });
    res.json({ inkUsage: Object.entries(inkCounts).map(([type, count]) => ({ type, count })) });
  } catch (err) {
    console.error('❌ Ink usage error:', err);
    res.status(500).json({ error: 'Failed to fetch ink usage' });
  }
});

app.post('/api/profile/analytics/record', auth, async (req, res) => {
  try {
    if (!ensureDatabaseReady(res)) return;
    const { strokes, drawingTime, sessions } = req.body;
    const today = new Date().toISOString().split('T')[0];
    await AnalyticsDaily.findOneAndUpdate(
      { userId: req.userId, date: today },
      { $inc: { strokes: strokes || 0, drawingTime: drawingTime || 0, sessions: sessions || 0 } },
      { upsert: true, new: true }
    );
    res.json({ message: 'Analytics recorded' });
  } catch (err) {
    console.error('❌ Record analytics error:', err);
    res.status(500).json({ error: 'Failed to record analytics' });
  }
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
