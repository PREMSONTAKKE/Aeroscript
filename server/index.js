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
const RecognitionService = require('./ml/services/recognitionService');
const WordRecognitionService = require('./ml/services/wordRecognitionService');

const app = express();
const server = http.createServer(app);
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const recognitionService = new RecognitionService();
const wordRecognitionService = new WordRecognitionService();

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

recognitionService.loadModel(path.join(__dirname, 'ml', 'model'));
// Ensure correct model loading
console.log('Loading ML models from:', path.join(__dirname, 'ml', 'model-word'));
wordRecognitionService.loadModel(path.join(__dirname, 'ml', 'model-word'));

const datasetPath = path.join(__dirname, 'ml', 'dataset', 'samples.json');
const Party = require('./models/Party');

const ensureDatasetFile = () => {
  const fs = require('fs');
  const datasetDir = path.dirname(datasetPath);
  if (!fs.existsSync(datasetDir)) fs.mkdirSync(datasetDir, { recursive: true });
  if (!fs.existsSync(datasetPath)) fs.writeFileSync(datasetPath, '[]');
};

ensureDatasetFile();

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
  console.log(`🔌 Socket connected: ${socket.id}`);

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

      console.log(`🎉 ${userName} joined party ${normalizedCode}`);
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

      console.log(`👋 ${socket.data.userName} left party ${code}`);
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

      console.log(`🔌 Socket disconnected: ${socket.id} from party ${code}`);
    } else {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    }
  });
});

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  console.log('📝 Signup attempt:', req.body.email);
  const { email, password } = req.body;
  try {
    if (!ensureDatabaseReady(res)) return;
    let user = await User.findOne({ email });
    if (user) {
      console.log('⚠️ Signup failed: Email already exists');
      return res.status(400).json({ error: 'Email already exists. Please Sign In.' });
    }

    user = new User({ email, password });
    await user.save();
    console.log('✅ User registered:', email);

    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('❌ Signup error:', err);
    // Write to a debug file so I can read it even if terminal is mangled
    require('fs').appendFileSync('error_log.txt', `\n[${new Date().toISOString()}] Signup Error: ${err.stack}\n`);
    res.status(500).json({ error: 'Server error during signup', details: err.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  console.log('🔑 Signin attempt:', req.body.email);
  const { email, password } = req.body;
  try {
    if (!ensureDatabaseReady(res)) return;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('⚠️ Signin failed: Account not found');
      return res.status(400).json({ error: 'Account not found. Please Sign Up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('⚠️ Signin failed: Incorrect password');
      return res.status(400).json({ error: 'Incorrect password' });
    }

    console.log('✅ User signed in:', email);
    const token = jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email, userId: user._id });
  } catch (err) {
    console.error('❌ Signin error:', err);
    require('fs').appendFileSync('error_log.txt', `\n[${new Date().toISOString()}] Signin Error: ${err.stack}\n`);
    res.status(500).json({ error: 'Server error during signin', details: err.message });
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

app.post('/api/ml/predict', auth, async (req, res) => {
  if (!recognitionService.ready) {
    return res.status(503).json({
      error: 'ML service unavailable',
      details: recognitionService.statusMessage
    });
  }

  try {
    const { pixels } = req.body;
    if (!Array.isArray(pixels) || pixels.length !== 28 * 28) {
      return res.status(400).json({ error: 'A 28x28 image payload is required' });
    }

    const predictions = await recognitionService.predict(pixels);
    res.json({ predictions });
  } catch (err) {
    console.error('❌ Prediction error:', err);
    res.status(500).json({ error: 'Prediction failed', details: err.message });
  }
});

app.post('/api/ml/predict-word', auth, async (req, res) => {
  if (!wordRecognitionService.ready) {
    return res.status(503).json({
      error: 'Word ML service unavailable',
      details: wordRecognitionService.statusMessage
    });
  }

  try {
    const { pixels, width, height } = req.body;
    if (!Array.isArray(pixels) || !Number.isInteger(width) || !Number.isInteger(height)) {
      return res.status(400).json({ error: 'Width, height, and grayscale pixels are required for word prediction' });
    }

    const predictions = await wordRecognitionService.predict(pixels, width, height);
    res.json({ predictions });
  } catch (err) {
    console.error('❌ Word prediction error:', err);
    res.status(500).json({ error: 'Word prediction failed', details: err.message });
  }
});

app.post('/api/ml/samples', auth, async (req, res) => {
  const fs = require('fs');

  try {
    const { label, strokes } = req.body;
    const trimmedLabel = typeof label === 'string' ? label.trim() : '';

    if (!trimmedLabel) {
      return res.status(400).json({ error: 'A label is required' });
    }

    if (!Array.isArray(strokes) || strokes.length === 0) {
      return res.status(400).json({ error: 'Stroke data is required' });
    }

    ensureDatasetFile();
    const existing = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    existing.push({
      label: trimmedLabel,
      strokes,
      userId: req.userId,
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(datasetPath, JSON.stringify(existing, null, 2));

    res.json({ message: 'Sample saved', count: existing.length });
  } catch (err) {
    console.error('❌ Sample save error:', err);
    res.status(500).json({ error: 'Failed to save sample', details: err.message });
  }
});

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

const brushPresetRoutes = require('./routes/brushPresets');
app.use('/api/brush-presets', brushPresetRoutes);

const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

const shareRoutes = require('./routes/share');
app.use('/api/share', shareRoutes);

const PORT = process.env.PORT || 5002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AeroScript Server V2.5.1 [HOTFIX-APPLIED]`);
  console.log(`📡 Listening at http://127.0.0.1:${PORT}`);
  console.log(`🎮 Socket.IO ready for real-time collaboration`);
});
