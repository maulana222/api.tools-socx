const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const triNumberController = require('../controllers/triNumberController');

// Get Tri numbers by project (with promos) — MUST COME BEFORE /project/:project_id
router.get('/project/:projectId/with-promos', authenticateToken, triNumberController.getNumbersByProjectWithPromos);
// Get Tri numbers by project
router.get('/project/:project_id', authenticateToken, triNumberController.getNumbersByProject);

// Get all Tri numbers (optional query: project_id)
router.get('/', authenticateToken, triNumberController.getAllNumbers);

// Create one
router.post('/', authenticateToken, triNumberController.createNumber);
// Create batch
router.post('/batch', authenticateToken, triNumberController.createNumbersBatch);

// Update number
router.put('/:id', authenticateToken, triNumberController.updateNumber);
// Update status
router.patch('/:id', authenticateToken, triNumberController.updateNumberStatus);

// Clear processed/failed (must be before /:id)
router.delete('/clear/processed', authenticateToken, triNumberController.clearProcessedNumbers);
// Delete one
router.delete('/:id', authenticateToken, triNumberController.deleteNumber);

module.exports = router;
