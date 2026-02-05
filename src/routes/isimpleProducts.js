const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const isimpleProductController = require('../controllers/isimpleProductController');

router.use(authenticateToken);

// GET /api/isimple-products - Get all (harga pasaran referensi)
router.get('/', isimpleProductController.getAllProducts);

// GET /api/isimple-products/detail/:id - Get by ID
router.get('/detail/:id', isimpleProductController.getProductById);

// POST /api/isimple-products - Create (nama + harga)
router.post('/', isimpleProductController.createProduct);

// PUT /api/isimple-products/:id - Update
router.put('/:id', isimpleProductController.updateProduct);

// DELETE /api/isimple-products/:id - Delete
router.delete('/:id', isimpleProductController.deleteProduct);

module.exports = router;