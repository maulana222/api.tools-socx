const express = require('express');
const SocxTokenController = require('../controllers/socxTokenController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Save Socx API token
router.post(
  '/token',
  SocxTokenController.saveValidation,
  SocxTokenController.save
);

// Get active Socx API token
router.get('/token', SocxTokenController.get);

// Deactivate Socx API token
router.post('/token/deactivate', SocxTokenController.deactivate);

// Delete Socx API token
router.delete('/token', SocxTokenController.delete);

// Get Socx token history
router.get('/token/history', SocxTokenController.history);

module.exports = router;