const express = require('express');
const router = express.Router();
const isimplePromoCheckController = require('../controllers/isimplePromoCheckController');
const { authenticateToken } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Route to check promo for all phones
router.post('/check-all', isimplePromoCheckController.checkAllPromo);
// Progress (polling) untuk tampilan proses cek nomor
router.get('/check-all/progress', isimplePromoCheckController.getProgress);
// Hentikan proses cek promo
router.post('/check-all/stop', isimplePromoCheckController.stopCheck);

module.exports = router;