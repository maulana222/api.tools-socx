const express = require('express');
const triPromoCheckController = require('../controllers/triPromoCheckController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/check', triPromoCheckController.checkTriRita);
router.post('/check-all', triPromoCheckController.checkAllPromoByProject);
router.get('/check-all/progress', triPromoCheckController.getProgress);
router.post('/check-all/stop', triPromoCheckController.stopCheck);

module.exports = router;
