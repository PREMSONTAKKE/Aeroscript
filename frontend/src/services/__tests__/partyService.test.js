import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

window.io = vi.fn(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
  disconnect: vi.fn(),
  id: 'test-socket-id',
}));

describe('PartyService', () => {
  let partyService;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../partyService');
    partyService = module.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractUserId', () => {
    it('should extract userId from JWT token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.test';
      
      const userId = partyService.extractUserId(token);
      expect(userId).toBe('123456');
    });

    it('should return null for invalid token', () => {
      const userId = partyService.extractUserId('invalid-token');
      expect(userId).toBeNull();
    });
  });

  describe('extractEmail', () => {
    it('should extract email from JWT token', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.test';
      
      const email = partyService.extractEmail(token);
      expect(email).toBe('test@example.com');
    });

    it('should return Anonymous for invalid token', () => {
      const email = partyService.extractEmail('invalid-token');
      expect(email).toBe('Anonymous');
    });
  });

  describe('state management', () => {
    it('should initialize with default values', () => {
      expect(partyService.partyCode).toBeNull();
      expect(partyService.partyName).toBeNull();
      expect(partyService.isHost).toBe(false);
      expect(partyService.members).toEqual([]);
      expect(partyService.board).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should allow setting onDraw callback', () => {
      const callback = vi.fn();
      partyService.onDraw(callback);
      expect(partyService.onDrawCallback).toBe(callback);
    });

    it('should allow setting onClear callback', () => {
      const callback = vi.fn();
      partyService.onClear(callback);
      expect(partyService.onClearCallback).toBe(callback);
    });

    it('should allow setting onPresence callback', () => {
      const callback = vi.fn();
      partyService.onPresence(callback);
      expect(partyService.onPresenceCallback).toBe(callback);
    });

    it('should allow setting onError callback', () => {
      const callback = vi.fn();
      partyService.onError(callback);
      expect(partyService.onErrorCallback).toBe(callback);
    });

    it('should allow setting onKicked callback', () => {
      const callback = vi.fn();
      partyService.onKicked(callback);
      expect(partyService.onKickedCallback).toBe(callback);
    });

    it('should allow setting onLockChanged callback', () => {
      const callback = vi.fn();
      partyService.onLockChanged(callback);
      expect(partyService.onLockChangedCallback).toBe(callback);
    });
  });

  describe('getIsHost', () => {
    it('should return false by default', () => {
      expect(partyService.getIsHost()).toBe(false);
    });
  });

  describe('getIsLocked', () => {
    it('should return false by default', () => {
      expect(partyService.getIsLocked()).toBe(false);
    });
  });
});
