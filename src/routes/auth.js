const express = require('express');
const AuthController = require('../controllers/authController');
const {
  authenticateToken,
  authenticateRefreshToken
} = require('../middlewares/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post(
  '/register',
  AuthController.registerValidation,
  AuthController.register
);

router.post(
  '/login',
  AuthController.loginValidation,
  AuthController.login
);

router.post(
  '/refresh',
  authenticateRefreshToken,
  AuthController.refreshToken
);

// Protected routes (authentication required)
router.use(authenticateToken); // All routes below require authentication

router.post('/logout', AuthController.logout);
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.put('/password', AuthController.changePassword);

module.exports = router;