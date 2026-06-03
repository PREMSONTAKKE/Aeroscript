import { io } from 'socket.io-client';
import { API_BASE } from '../config/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE.replace('/api', '');

class PartyService {
  constructor() {
    this.socket = null;
    this.partyCode = null;
    this.partyName = null;
    this.isHost = false;
    this.members = [];
    this.board = null;
    this.onDrawCallback = null;
    this.onStreamDrawCallback = null;
    this.onClearCallback = null;
    this.onCursorMoveCallback = null;
    this.onMemberJoinedCallback = null;
    this.onMemberLeftCallback = null;
    this.onPresenceCallback = null;
    this.onCanvasSyncCallback = null;
    this.onErrorCallback = null;
    this.onKickedCallback = null;
    this.onLockChangedCallback = null;
    this.isLocked = false;
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      upgrade: true
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return this.socket;
  }

  async createParty(name, token) {
    try {
      const response = await fetch(`${API_BASE}/party/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create party');
      }

      const data = await response.json();
      this.partyCode = data.party.code;
      this.partyName = data.party.name;
      this.isHost = true;

      this.joinPartySocket(data.party.code, token);

      return data.party;
    } catch (err) {
      console.error('Create party error:', err);
      throw err;
    }
  }

  async joinParty(code, token) {
    try {
      const response = await fetch(`${API_BASE}/party/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join party');
      }

      const data = await response.json();
      this.partyCode = data.party.code;
      this.partyName = data.party.name;
      this.isHost = false;

      this.joinPartySocket(data.party.code, token);

      return data.party;
    } catch (err) {
      console.error('Join party error:', err);
      throw err;
    }
  }

  joinPartySocket(code, token) {
    this.currentToken = token;
    const emitJoin = () => {
      const payload = {
        code: code.toUpperCase(),
        userId: this.extractUserId(token),
        userName: this.extractEmail(token)
      };

      this.socket.emit('join-party', payload);

      this.socket.off('party-joined');
      this.socket.on('party-joined', (data) => {
        this.members = data.members;
        this.board = data.board || null;
        this.isHost = data.party.host === payload.userId;
        this.isLocked = data.party.isLocked || false;
        this.currentParty = data.party;
        if (this.onPresenceCallback) {
          this.onPresenceCallback({
            party: data.party,
            members: data.members,
            board: data.board || null
          });
        }
      });

      this.socket.off('party-presence');
      this.socket.on('party-presence', (data) => {
        this.members = data.members;
        this.isHost = data.party.host === payload.userId;
        this.isLocked = data.party.isLocked || false;
        this.currentParty = data.party;
        if (this.onPresenceCallback) {
          this.onPresenceCallback({
            party: data.party,
            members: data.members,
            board: this.board
          });
        }
      });

      this.socket.off('member-joined');
      this.socket.on('member-joined', (member) => {
        this.members.push(member);
        if (this.onMemberJoinedCallback) {
          this.onMemberJoinedCallback(member);
        }
      });

      this.socket.off('member-left');
      this.socket.on('member-left', (member) => {
        this.members = this.members.filter(m => m.socketId !== member.socketId);
        if (this.onMemberLeftCallback) {
          this.onMemberLeftCallback(member);
        }
      });

      this.socket.off('draw');
      this.socket.on('draw', (data) => {
        const incomingStrokes = Array.isArray(data.strokes) ? data.strokes : [];
        if (incomingStrokes.length) {
          const existingStrokes = Array.isArray(this.board?.strokes) ? this.board.strokes : [];
          this.board = {
            ...this.board,
            strokes: [...existingStrokes, ...incomingStrokes],
            settings: data.settings || this.board?.settings || null,
            inputMode: data.inputMode || this.board?.inputMode || 'mouse',
            updatedAt: new Date().toISOString(),
            updatedBy: data.userName
          };
        }
        if (this.onDrawCallback) {
          this.onDrawCallback(data);
        }
      });

      this.socket.off('stream-draw');
      this.socket.on('stream-draw', (data) => {
        if (this.onStreamDrawCallback) {
          this.onStreamDrawCallback(data);
        }
      });

      this.socket.off('canvas-synced');
      this.socket.on('canvas-synced', (data) => {
        this.board = data.board;
        if (this.onCanvasSyncCallback) {
          this.onCanvasSyncCallback(data);
        }
      });

      this.socket.off('clear-canvas');
      this.socket.on('clear-canvas', (data) => {
        this.board = {
          ...this.board,
          strokes: [],
          updatedAt: new Date().toISOString(),
          updatedBy: data.userName
        };
        if (this.onClearCallback) {
          this.onClearCallback(data);
        }
      });

      this.socket.off('cursor-move');
      this.socket.on('cursor-move', (data) => {
        if (this.onCursorMoveCallback) {
          this.onCursorMoveCallback(data);
        }
      });

      this.socket.off('party-error');
      this.socket.on('party-error', (data) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(data.error);
        }
      });

      this.socket.off('kick-member');
      this.socket.on('kick-member', (data) => {
        if (data.targetUserId === this.extractUserId(this.currentToken)) {
          this.partyCode = null;
          this.partyName = null;
          this.isHost = false;
          this.members = [];
          this.board = null;
          if (this.onKickedCallback) {
            this.onKickedCallback(data.reason || 'You have been removed from the party');
          }
        } else {
          this.members = this.members.filter(m => m.userId !== data.targetUserId);
          if (this.onPresenceCallback) {
            this.onPresenceCallback({
              party: this.currentParty,
              members: this.members,
              board: this.board
            });
          }
        }
      });

      this.socket.off('lock-party');
      this.socket.on('lock-party', (data) => {
        this.isLocked = data.locked;
        if (this.currentParty) {
          this.currentParty.isLocked = data.locked;
        }
        if (this.onLockChangedCallback) {
          this.onLockChangedCallback(data.locked);
        }
      });

      this.socket.off('host-transferred');
      this.socket.on('host-transferred', (data) => {
        const userId = this.extractUserId(this.currentToken);
        this.isHost = data.newHostId === userId;
        if (this.currentParty) {
          this.currentParty.host = data.newHostId;
        }
        if (this.onPresenceCallback) {
          this.onPresenceCallback({
            party: this.currentParty,
            members: this.members,
            board: this.board
          });
        }
      });
    };

    if (!this.socket?.connected) {
      this.connect(token);
      this.socket.off('connect', emitJoin);
      this.socket.on('connect', emitJoin);
      return;
    }

    emitJoin();
  }

  extractUserId(token) {
    try {
      const payload = atob(token.split('.')[1]);
      const { userId } = JSON.parse(payload);
      return userId;
    } catch {
      return null;
    }
  }

  extractEmail(token) {
    try {
      const payload = atob(token.split('.')[1]);
      const { email } = JSON.parse(payload);
      return email;
    } catch {
      return 'Anonymous';
    }
  }

  draw(strokes, isDrawing, x, y, settings, inputMode) {
    if (this.socket?.connected && this.partyCode) {
      this.socket.emit('draw', { strokes, isDrawing, x, y, settings, inputMode });
    }
  }

  streamDraw(strokeId, points, style, isDrawing) {
    if (this.socket?.connected && this.partyCode) {
      this.socket.emit('stream-draw', { strokeId, points, style, isDrawing });
    }
  }

  syncCanvas(strokes, settings, inputMode) {
    if (this.socket?.connected && this.partyCode) {
      this.board = {
        strokes,
        settings,
        inputMode,
        updatedAt: new Date().toISOString(),
        updatedBy: 'You'
      };
      this.socket.emit('sync-canvas', { strokes, settings, inputMode });
    }
  }

  clearCanvas() {
    if (this.socket?.connected && this.partyCode) {
      this.socket.emit('clear-canvas');
    }
  }

  cursorMove(x, y, isDrawing) {
    if (this.socket?.connected && this.partyCode) {
      this.socket.emit('cursor-move', { x, y, isDrawing });
    }
  }

  updatePresence(inputMode) {
    if (this.socket?.connected) {
      this.socket.emit('presence-update', { inputMode });
    }
  }

  async kickMember(memberId, token) {
    if (!this.partyCode) return;
    
    try {
      const response = await fetch(`${API_BASE}/party/${this.partyCode}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to kick member');
      }

      const member = this.members.find(m => m.userId === memberId);
      if (this.socket?.connected && member?.socketId) {
        this.socket.emit('kick-member', { targetSocketId: member.socketId });
      }

      return true;
    } catch (err) {
      console.error('Kick member error:', err);
      throw err;
    }
  }

  async toggleLock(token) {
    if (!this.partyCode) return;
    
    const newLockedState = !this.isLocked;
    
    try {
      const response = await fetch(`${API_BASE}/party/${this.partyCode}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ locked: newLockedState })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lock party');
      }

      if (this.socket?.connected) {
        this.socket.emit('lock-party', { locked: newLockedState });
      }

      return newLockedState;
    } catch (err) {
      console.error('Lock party error:', err);
      throw err;
    }
  }

  async transferHost(newHostId, token) {
    if (!this.partyCode) return;
    
    try {
      const response = await fetch(`${API_BASE}/party/${this.partyCode}/transfer-host`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newHostId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transfer host');
      }

      if (this.socket?.connected) {
        this.socket.emit('host-transferred', { newHostId });
      }

      return true;
    } catch (err) {
      console.error('Transfer host error:', err);
      throw err;
    }
  }

  leaveParty() {
    if (this.socket?.connected && this.partyCode) {
      this.socket.emit('leave-party');
      this.partyCode = null;
      this.partyName = null;
      this.isHost = false;
      this.members = [];
      this.board = null;
    }
  }

  disconnect() {
    this.leaveParty();
    this.socket?.disconnect();
    this.socket = null;
  }

  onDraw(callback) {
    this.onDrawCallback = callback;
  }

  onStreamDraw(callback) {
    this.onStreamDrawCallback = callback;
  }

  onClear(callback) {
    this.onClearCallback = callback;
  }

  onCursorMove(callback) {
    this.onCursorMoveCallback = callback;
  }

  onMemberJoined(callback) {
    this.onMemberJoinedCallback = callback;
  }

  onMemberLeft(callback) {
    this.onMemberLeftCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onPresence(callback) {
    this.onPresenceCallback = callback;
  }

  onCanvasSync(callback) {
    this.onCanvasSyncCallback = callback;
  }

  onKicked(callback) {
    this.onKickedCallback = callback;
  }

  onLockChanged(callback) {
    this.onLockChangedCallback = callback;
  }

  getIsHost() {
    return this.isHost;
  }

  getIsLocked() {
    return this.isLocked;
  }
}

export default new PartyService();
