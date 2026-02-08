const express = require('express');
const router = express.Router();
const promoProductController = require('../controllers/promoProductController');
const { authenticateToken } = require('../middlewares/auth');

// Get all promo products (MUST COME FIRST before /:id)
router.get('/all', authenticateToken, promoProductController.getAllPromoProducts);

// Get all selected promo products (MUST COME FIRST before /:id)
router.get('/selected/all', authenticateToken, promoProductController.getSelectedProducts);

// Get selected promo products by project (MUST COME FIRST before /:id)
router.get('/selected/project/:project_id', authenticateToken, promoProductController.getSelectedProductsByProject);

// Get all promo products for a specific isimple number (MUST COME FIRST before /:id)
router.get('/isimple-number/:isimple_number_id', authenticateToken, promoProductController.getProductsByIsimpleNumber);

// Get stats for isimple number (MUST COME FIRST before /:id)
router.get('/stats/:isimple_number_id', authenticateToken, promoProductController.getProductsStats);

// Get jumlah nomor per product_code (saat dropdown expand)
router.get('/project/:projectId/counts-by-code', authenticateToken, promoProductController.getCountsByProductCode);
// Get all promo products by project ID
router.get('/project/:projectId', authenticateToken, promoProductController.getAllPromoProducts);

// Get single promo product (MUST COME LAST)
router.get('/:id', authenticateToken, promoProductController.getProductById);

// Create promo product
router.post('/', authenticateToken, promoProductController.createPromoProduct);

// Create batch promo products
router.post('/batch', authenticateToken, promoProductController.createBatchPromoProducts);

// Update product selected status
router.patch('/:id/selected', authenticateToken, promoProductController.updateProductSelected);

// Delete promo product
router.delete('/:id', authenticateToken, promoProductController.deletePromoProduct);

// Delete all promo products for an isimple number
router.delete('/isimple-number/:isimple_number_id', authenticateToken, promoProductController.deleteProductsByIsimpleNumber);

module.exports = router;