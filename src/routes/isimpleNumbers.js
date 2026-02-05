const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const isimpleNumberController = require('../controllers/isimpleNumberController');

// Get all Isimple numbers
router.get('/', authenticateToken, isimpleNumberController.getAllNumbers);

// Get Isimple numbers by project (dengan hasil pengecekan promo)
router.get('/project/:projectId/with-promos', authenticateToken, isimpleNumberController.getNumbersByProjectWithPromos);
// Get Isimple numbers by project
router.get('/project/:project_id', authenticateToken, isimpleNumberController.getNumbersByProject);

// Create new Isimple number
router.post('/', authenticateToken, isimpleNumberController.createNumber);

// Create multiple Isimple numbers
router.post('/batch', authenticateToken, isimpleNumberController.createNumbersBatch);

// Update number (nomor + nama/keterangan)
router.put('/:id', authenticateToken, isimpleNumberController.updateNumber);
// Update number status
router.patch('/:id', authenticateToken, isimpleNumberController.updateNumberStatus);

// Delete number
router.delete('/:id', authenticateToken, isimpleNumberController.deleteNumber);

// Clear processed numbers
router.delete('/clear/processed', authenticateToken, isimpleNumberController.clearProcessedNumbers);

// Check promo products for a specific number
router.get('/check-promo/:number', authenticateToken, isimpleNumberController.checkPromoForNumber);

module.exports = router;