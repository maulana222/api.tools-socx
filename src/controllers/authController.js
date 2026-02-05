const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const {
  generateAccessToken,
  generateRefreshToken
} = require('../middlewares/auth');

class AuthController {
  // Validation rules
  static registerValidation = [
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 12, max: 128 })
      .withMessage('Password must be between 12 and 128 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters')
  ];

  static loginValidation = [
    body('username')
      .notEmpty()
      .withMessage('Username is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];

  // Register new user
  static async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findByUsername(username) || await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this username or email'
        });
      }

      // Create new user
      const userData = {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        firstName,
        lastName
      };

      const newUser = await User.create(userData);

      // Generate tokens
      const user = await User.findById(newUser.id);
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRE || '7d'
          }
        }
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;
      console.log('🔑 Login attempt with username:', username);

      // Find user by username or email
      const user = await User.findByUsername(username.toLowerCase()) ||
                   await User.findByEmail(username.toLowerCase());

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRE || '7d'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Refresh access token
  static async refreshToken(req, res) {
    try {
      const user = req.user; // Set by authenticateRefreshToken middleware

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRE || '7d'
          }
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Logout with token blacklisting
  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader && authHeader.split(' ')[1];
      const { refreshToken } = req.body;

      // Decode access token to get expiry date
      let accessTokenExpiry = null;
      if (accessToken) {
        try {
          const decoded = jwt.decode(accessToken);
          accessTokenExpiry = new Date(decoded.exp * 1000);
          await BlacklistedToken.add(accessToken, accessTokenExpiry, 'logout', req.user?.id);
        } catch (error) {
          console.error('Error decoding access token:', error);
        }
      }

      // Blacklist refresh token if provided
      if (refreshToken) {
        try {
          const decoded = jwt.decode(refreshToken);
          const refreshTokenExpiry = new Date(decoded.exp * 1000);
          await BlacklistedToken.add(refreshToken, refreshTokenExpiry, 'logout', req.user?.id);
        } catch (error) {
          console.error('Error decoding refresh token:', error);
        }
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = req.user; // Set by authenticateToken middleware

      res.json({
        success: true,
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const user = req.user;
      const { firstName, lastName, email } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (email) updateData.email = email.toLowerCase().trim();

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(409).json({
            success: false,
            message: 'Email is already taken'
          });
        }
      }

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Change password with token invalidation
  static async changePassword(req, res) {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;

      // Validate new password strength
      if (!newPassword || newPassword.length < 12 || newPassword.length > 128) {
        return res.status(400).json({
          success: false,
          message: 'New password must be between 12 and 128 characters long'
        });
      }

      // Check password complexity
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Check if new password is same as current password
      const isSamePassword = await user.verifyPassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      // Hash new password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

      // Update password
      await user.update({ password: hashedPassword });

      // Blacklist current access token
      const authHeader = req.headers.authorization;
      const accessToken = authHeader && authHeader.split(' ')[1];
      if (accessToken) {
        try {
          const decoded = jwt.decode(accessToken);
          const accessTokenExpiry = new Date(decoded.exp * 1000);
          await BlacklistedToken.add(accessToken, accessTokenExpiry, 'password_change', user.id);
        } catch (error) {
          console.error('Error blacklisting access token:', error);
        }
      }

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = AuthController;