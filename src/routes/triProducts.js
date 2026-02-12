const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const triProductController = require('../controllers/triProductController');

// GET /api/tri-products — list all (referensi harga pasaran)
router.get('/', authenticateToken, triProductController.getAllProducts);
// GET /api/tri-products/detail/:id
router.get('/detail/:id', authenticateToken, triProductController.getProductById);

// POST /api/tri-products — create (name, price, socx_code optional)
router.post('/', authenticateToken, triProductController.createProduct);

// PUT /api/tri-products/:id — update
router.put('/:id', authenticateToken, triProductController.updateProduct);

// DELETE /api/tri-products/:id
router.delete('/:id', authenticateToken, triProductController.deleteProduct);

module.exports = router;
