const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const partyRoutes = require('../routes/party');

jest.mock('../models/Party', () => {
  const mockParty = {
    code: 'TEST12',
    host: 'user123',
    name: 'Test Party',
    members: [{ user: 'user123', name: 'test@test.com', joinedAt: new Date() }],
    maxMembers: 10,
    isActive: true,
    isLocked: false,
    save: jest.fn().mockResolvedValue(true),
    findOne: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockParty,
  };
});

describe('Party Routes', () => {
  let app;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  const generateToken = (userId = 'user123', email = 'test@test.com') => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/party', partyRoutes);
  });

  describe('POST /party/create', () => {
    it('should create a party with valid token', async () => {
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
      const token = generateToken();
      
      const response = await request(app)
        .post('/party/join')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TEST12' });

      expect(response.status).toBe(200);
      expect(response.body.party).toHaveProperty('code');
    });

    it('should reject invalid party code', async () => {
      const token = generateToken();
      
      const Party = require('../models/Party');
      Party.findOne.mockResolvedValue(null);

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
      const token = generateToken('hostuser', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/kick')
        .set('Authorization', `Bearer ${token}`)
        .send({ memberId: 'member123' });

      expect(response.status).toBe(200);
    });

    it('should reject non-host from kicking', async () => {
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
      const token = generateToken('hostuser', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/lock')
        .set('Authorization', `Bearer ${token}`)
        .send({ locked: true });

      expect(response.status).toBe(200);
      expect(response.body.locked).toBe(true);
    });

    it('should reject non-host from locking', async () => {
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
      const token = generateToken('currenthost', 'host@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/transfer-host')
        .set('Authorization', `Bearer ${token}`)
        .send({ newHostId: 'newuser123' });

      expect(response.status).toBe(200);
    });

    it('should reject non-host from transferring', async () => {
      const token = generateToken('notowner', 'user@test.com');
      
      const response = await request(app)
        .post('/party/TEST12/transfer-host')
        .set('Authorization', `Bearer ${token}`)
        .send({ newHostId: 'newuser123' });

      expect(response.status).toBe(403);
    });
  });
});
