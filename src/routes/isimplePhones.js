const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getAllIsimplePhones,
  getIsimplePhoneById,
  createIsimplePhone,
  batchCreateIsimplePhones,
  updateIsimplePhone,
  deleteIsimplePhone,
  updatePhoneAfterCheck
} = require('../controllers/isimplePhoneController');

// Get all isimple phones (with optional filters)
router.get('/', authenticateToken, getAllIsimplePhones);

// Get isimple phone by ID
router.get('/:id', authenticateToken, getIsimplePhoneById);

// Create isimple phone
router.post('/', authenticateToken, createIsimplePhone);

// Batch create isimple phones
router.post('/batch', authenticateToken, batchCreateIsimplePhones);

// Update isimple phone
router.put('/:id', authenticateToken, updateIsimplePhone);

// Update phone status after checking
router.patch('/:id/check', authenticateToken, updatePhoneAfterCheck);

// Delete isimple phone
router.delete('/:id', authenticateToken, deleteIsimplePhone);

module.exports = router;