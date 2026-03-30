process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../models/Party');

const Party = require('../models/Party');

describe('Party Routes', () => {
  let app;
  const JWT_SECRET = 'test-secret';

  const generateToken = (userId = 'user123', email = 'test@test.com') => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
  };

  const createMockParty = (overrides = {}) => ({
    _id: 'party-id',
    code: 'TEST12',
    host: 'user123',
    name: 'Test Party',
    members: [{ user: 'user123', name: 'test@test.com', joinedAt: new Date() }],
    maxMembers: 10,
    isActive: true,
    isLocked: false,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  const mockFindOne = (party = createMockParty()) => {
    const chainable = {
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(party)),
    };
    Party.findOne = jest.fn().mockReturnValue(chainable);
    return chainable;
  };

  const mockFindOneWithPopulate = (party) => {
    const chainable = {
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(party)),
    };
    Party.findOne = jest.fn().mockReturnValue(chainable);
    return chainable;
  };

  Party.mockImplementation((data) => ({
    ...data,
    _id: 'new-party-id',
    code: data.code,
    host: data.host,
    name: data.name,
    members: data.members,
    maxMembers: 10,
    isActive: true,
    isLocked: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(true),
  }));

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/party', require('../routes/party'));
    jest.clearAllMocks();
    mockFindOne();
  });

  describe('POST /party/create', () => {
    it('should create a party with valid token', async () => {
      mockFindOneWithPopulate(null);
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Test Party' });

      expect(response.status).toBe(200);
      expect(response.body.party).toHaveProperty('code');
      expect(response.body.party.name).toBe('My Test Party');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/party/create')
        .send({ name: 'Test Party' });

      expect(response.status).toBe(401);
    });

    it('should reject party without name', async () => {
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/create')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /party/join', () => {
    it('should join a party with valid code', async () => {
      mockFindOneWithPopulate(createMockParty({ members: [] }));
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/join')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TEST12' });

      expect(response.status).toBe(200);
      expect(response.body.party).toHaveProperty('code');
    });

    it('should reject invalid party code', async () => {
      mockFindOneWithPopulate(null);
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/join')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'INVALID' });

      expect(response.status).toBe(404);
    });

    it('should reject request without code', async () => {
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/join')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /party/:code/kick', () => {
    it('should allow host to kick a member', async () => {
      Party.findOne.mockResolvedValue(createMockParty({
        host: 'hostuser',
        members: [
          { user: 'hostuser', name: 'host@test.com' },
          { user: 'member123', name: 'member@test.com' }
        ]
      }));
      const token = generateToken('hostuser', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({ memberId: 'member123' });

      expect(response.status).toBe(200);
    });

    it('should reject non-host from kicking', async () => {
      Party.findOne.mockResolvedValue(createMockParty({
        host: 'hostuser',
        members: [{ user: 'nothost', name: 'not@test.com' }]
      }));
      const token = generateToken('nothost', 'not@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({ memberId: 'member123' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /party/:code/lock', () => {
    it('should allow host to lock party', async () => {
      const mockParty = createMockParty({
        host: 'hostuser',
        isLocked: false
      });
      Party.findOne.mockResolvedValue(mockParty);
      const token = generateToken('hostuser', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/lock')
        .set('Authorization', `Bearer ${token}`)
        .send({ locked: true });

      expect(response.status).toBe(200);
      expect(response.body.locked).toBe(true);
    });

    it('should reject non-host from locking', async () => {
      Party.findOne.mockResolvedValue(createMockParty({
        host: 'hostuser',
        isLocked: false
      }));
      const token = generateToken('notowner', 'user@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/lock')
        .set('Authorization', `Bearer ${token}`)
        .send({ locked: true });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /party/:code/transfer-host', () => {
    it('should allow host to transfer ownership', async () => {
      Party.findOne.mockResolvedValue(createMockParty({
        host: 'currenthost',
        members: [
          { user: 'currenthost', name: 'host@test.com' },
          { user: 'newuser123', name: 'newuser@test.com' }
        ]
      }));
      const token = generateToken('currenthost', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/transfer-host')
        .set('Authorization', `Bearer ${token}`)
        .send({ newHostId: 'newuser123' });

      expect(response.status).toBe(200);
    });

    it('should reject non-host from transferring', async () => {
      Party.findOne.mockResolvedValue(createMockParty({
        host: 'hostuser',
        members: [{ user: 'notowner', name: 'not@test.com' }]
      }));
      const token = generateToken('notowner', 'user@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/transfer-host')
        .set('Authorization', `Bearer ${token}`)
        .send({ newHostId: 'newuser123' });

      expect(response.status).toBe(403);
    });
  });
});
