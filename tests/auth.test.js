const request = require('supertest');
const app = require('../src/server');
const database = require('../src/config/database');
const User = require('../src/models/User');

describe('Authentication API', () => {
  let testUser;
  let accessToken;

  beforeAll(async () => {
    // Connect to test database
    await database.connect();
  });

  afterAll(async () => {
    // Close database connection
    await database.close();
  });

  beforeEach(async () => {
    // Clean up test data
    try {
      await database.query('DELETE FROM users WHERE email LIKE ?', ['test%@example.com']);
    } catch (error) {
      // Ignore errors in cleanup
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      testUser = response.body.data.user;
    });

    it('should fail registration with invalid data', async () => {
      const invalidData = {
        username: 'tu',
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should fail registration with existing username', async () => {
      // First create a user
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'TestPass123!',
        firstName: 'Existing',
        lastName: 'User'
      });

      // Try to create another user with same username
      const duplicateData = {
        username: 'existinguser',
        email: 'different@example.com',
        password: 'TestPass123!',
        firstName: 'Different',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await User.create({
        username: 'logintest',
        email: 'login@example.com',
        password: 'LoginPass123!',
        firstName: 'Login',
        lastName: 'Test'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        username: 'logintest',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      accessToken = response.body.data.tokens.accessToken;
    });

    it('should fail login with incorrect password', async () => {
      const loginData = {
        username: 'logintest',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with non-existent user', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'SomePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    beforeEach(async () => {
      // Create user and get access token
      testUser = await User.create({
        username: 'profiletest',
        email: 'profile@example.com',
        password: 'ProfilePass123!',
        firstName: 'Profile',
        lastName: 'Test'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'profiletest',
          password: 'ProfilePass123!'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should fail to get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token is required');
    });

    it('should fail to get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid access token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    beforeEach(async () => {
      // Create user and get access token
      testUser = await User.create({
        username: 'updatetest',
        email: 'update@example.com',
        password: 'UpdatePass123!',
        firstName: 'Update',
        lastName: 'Test'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'updatetest',
          password: 'UpdatePass123!'
        });

      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe(updateData.firstName);
      expect(response.body.data.user.lastName).toBe(updateData.lastName);
    });
  });
});