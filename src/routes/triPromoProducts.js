const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const triPromoProductController = require('../controllers/triPromoProductController');

// GET /api/tri-promo-products/tri-number/:tri_number_id — list promo for one tri number (must be before /:id)
router.get('/tri-number/:tri_number_id', authenticateToken, triPromoProductController.getProductsByTriNumber);
// DELETE /api/tri-promo-products/tri-number/:tri_number_id
router.delete('/tri-number/:tri_number_id', authenticateToken, triPromoProductController.deleteProductsByTriNumber);

module.exports = router;
